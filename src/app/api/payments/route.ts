import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { packageId, date, description, amount } = body

        if (!packageId || !date || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const payment = await prisma.payment.create({
            data: {
                packageId: Number(packageId),
                date: new Date(date),
                description: description || '',
                amount: Number(amount),
                hasUpdates: true
            },
        })

        // Get companyId from package
        const pkg = await prisma.package.findUnique({
            where: { id: Number(packageId) },
            select: { companyId: true }
        })

        if (pkg) {
            // Update Package hasUpdates
            await prisma.package.update({
                where: { id: Number(packageId) },
                data: { hasUpdates: true }
            })

            // Update Company hasUpdates
            await prisma.company.update({
                where: { id: pkg.companyId },
                data: { hasUpdates: true }
            })
        }

        return NextResponse.json(payment)
    } catch (error) {
        console.error('Payment Create Error:', error)
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }
}
