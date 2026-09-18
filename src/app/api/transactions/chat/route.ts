import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseTransactionMessage, isParseError, findBestCompanyMatch } from '@/lib/transactionParser'

export const dynamic = 'force-dynamic'

/**
 * GET /api/transactions/chat
 * Returns all transaction messages, newest first
 */
export async function GET() {
    try {
        const messages = await prisma.transactionMessage.findMany({
            orderBy: { createdAt: 'asc' }
        })
        return NextResponse.json(messages)
    } catch (error) {
        console.error('Chat GET Error:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

/**
 * POST /api/transactions/chat
 * Body: { text: "+ 50000 BOOSTER Bis fee" }
 * 
 * Parses the message, matches the company, creates payment/charge,
 * and saves the chat message record.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { text } = body

        if (!text || typeof text !== 'string') {
            return NextResponse.json({ error: 'Missing text field' }, { status: 400 })
        }

        // 1. Parse the message
        const parsed = parseTransactionMessage(text)

        if (isParseError(parsed)) {
            // Save as failed message
            const msg = await prisma.transactionMessage.create({
                data: {
                    rawText: text,
                    type: 'UNKNOWN',
                    amount: 0,
                    companyName: '',
                    status: 'FAILED',
                    errorMsg: parsed.error
                }
            })
            return NextResponse.json(msg)
        }

        // 2. Find the company
        let matchedCompany: { id: number; name: string } | null = null
        
        if (body.companyId && typeof body.companyId === 'number') {
            const company = await prisma.company.findUnique({
                where: { id: body.companyId },
                select: { id: true, name: true }
            })
            if (company) matchedCompany = company
        }

        if (!matchedCompany) {
            const allCompanies = await prisma.company.findMany({
                select: { id: true, name: true }
            })
            matchedCompany = findBestCompanyMatch(parsed.companyQuery, allCompanies)
        }

        if (!matchedCompany) {
            // Save as failed — no company found
            const msg = await prisma.transactionMessage.create({
                data: {
                    rawText: text,
                    type: parsed.type,
                    amount: parsed.amount,
                    companyName: parsed.companyQuery,
                    status: 'FAILED',
                    description: parsed.description || null,
                    errorMsg: `Company "${parsed.companyQuery}" not found`
                }
            })
            return NextResponse.json(msg)
        }

        // 3. Find target package or "Quick Entry" package for this company
        let targetPackage: { id: number; description: string } | null = null
        let finalDescription = parsed.description

        // Fetch all packages for this company
        const companyPackages = await prisma.package.findMany({
            where: { companyId: matchedCompany.id }
        })

        // Check if explicit package ID was passed in body
        if (body.packageId && typeof body.packageId === 'number') {
            const pkg = companyPackages.find(p => p.id === body.packageId)
            if (pkg) targetPackage = pkg
        }

        // Check if explicit package query was provided via @ symbol
        if (!targetPackage && parsed.targetPackageQuery) {
            const pkgQuery = parsed.targetPackageQuery.toLowerCase()
            const matchedPkg = companyPackages.find(p => p.description.toLowerCase().includes(pkgQuery))
            if (matchedPkg) {
                targetPackage = matchedPkg
            } else {
                // Create new package with this requested description
                targetPackage = await prisma.package.create({
                    data: {
                        companyId: matchedCompany.id,
                        description: parsed.targetPackageQuery,
                        date: new Date(),
                        hasUpdates: true
                    }
                })
            }
        }

        // Check if any package title matches the beginning of description
        // (e.g. "+ 15000 BOOSTER BIS Inclusion sample payment" -> matches package "BIS Inclusion")
        if (!targetPackage && parsed.description && companyPackages.length > 0) {
            const descLower = parsed.description.toLowerCase().trim()
            // Sort packages by longest description length first to match most specific package
            const sortedPackages = [...companyPackages].sort((a, b) => b.description.length - a.description.length)
            
            for (const pkg of sortedPackages) {
                const pkgTitleLower = pkg.description.toLowerCase().trim()
                if (pkgTitleLower === 'quick entry') continue // skip default holding package in name matching unless exact match

                if (descLower.startsWith(pkgTitleLower)) {
                    targetPackage = pkg
                    // Extract remaining text as description
                    const remainder = parsed.description.substring(pkg.description.length).trim()
                    finalDescription = remainder || pkg.description
                    break
                } else if (descLower.includes(pkgTitleLower)) {
                    targetPackage = pkg
                    break
                }
            }
        }

        // Default to "Quick Entry" package if no specific package was matched
        if (!targetPackage) {
            let quickPackage = companyPackages.find(p => p.description === 'Quick Entry')

            if (!quickPackage) {
                quickPackage = await prisma.package.create({
                    data: {
                        companyId: matchedCompany.id,
                        description: 'Quick Entry',
                        date: new Date(),
                        hasUpdates: true
                    }
                })
            }
            targetPackage = quickPackage
        }

        // 4. Create the payment or charge
        let paymentId: number | null = null
        let chargeId: number | null = null

        if (parsed.type === 'PAYMENT') {
            const payment = await prisma.payment.create({
                data: {
                    packageId: targetPackage.id,
                    date: new Date(),
                    description: finalDescription || targetPackage.description,
                    amount: parsed.amount,
                    hasUpdates: true
                }
            })
            paymentId = payment.id
        } else {
            const charge = await prisma.charge.create({
                data: {
                    packageId: targetPackage.id,
                    date: new Date(),
                    description: finalDescription || targetPackage.description,
                    amount: parsed.amount,
                    hasUpdates: true
                }
            })
            chargeId = charge.id
        }

        // 5. Mark package and company as having updates
        await prisma.package.update({
            where: { id: targetPackage.id },
            data: { hasUpdates: true }
        })
        await prisma.company.update({
            where: { id: matchedCompany.id },
            data: { hasUpdates: true }
        })

        // 6. Save the chat message
        const msg = await prisma.transactionMessage.create({
            data: {
                rawText: text,
                type: parsed.type,
                amount: parsed.amount,
                companyName: matchedCompany.name,
                companyId: matchedCompany.id,
                packageId: targetPackage.id,
                description: finalDescription || null,
                status: 'SUCCESS',
                paymentId,
                chargeId
            }
        })

        return NextResponse.json(msg)
    } catch (error) {
        console.error('Chat POST Error:', error)
        return NextResponse.json({ error: 'Failed to process message' }, { status: 500 })
    }
}
