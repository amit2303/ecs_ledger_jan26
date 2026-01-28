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
            },
        })

        return NextResponse.json(payment)
    } catch (error) {
        console.error('Payment Create Error:', error)
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }
}
