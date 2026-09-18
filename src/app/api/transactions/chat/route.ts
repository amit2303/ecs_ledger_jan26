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
        let targetPackage: { id: number } | null = null

        // Check if explicit package query is provided via @ or body.packageId
        if (body.packageId && typeof body.packageId === 'number') {
            const pkg = await prisma.package.findFirst({
                where: { id: body.packageId, companyId: matchedCompany.id }
            })
            if (pkg) targetPackage = pkg
        }

        if (!targetPackage && parsed.targetPackageQuery) {
            const pkgQuery = parsed.targetPackageQuery.toLowerCase()
            const companyPackages = await prisma.package.findMany({
                where: { companyId: matchedCompany.id }
            })
            const matchedPkg = companyPackages.find(p => p.description.toLowerCase().includes(pkgQuery))
            if (matchedPkg) {
                targetPackage = matchedPkg
            } else {
                // Create package with this description if explicit package requested
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

        if (!targetPackage) {
            let quickPackage = await prisma.package.findFirst({
                where: {
                    companyId: matchedCompany.id,
                    description: 'Quick Entry'
                }
            })

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
                    description: parsed.description || parsed.companyQuery,
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
                    description: parsed.description || parsed.companyQuery,
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
                description: parsed.description || null,
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
