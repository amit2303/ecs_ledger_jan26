import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        const { amount, description, date } = body

        if (amount === undefined) {
            return NextResponse.json(
                { error: 'Amount is required' },
                { status: 400 }
            )
        }

        const payment = await prisma.salaryPayment.create({
            data: {
                employeeId: Number(id),
                amount: Number(amount),
                description: description?.trim() || null,
                date: date ? new Date(date) : new Date(),
            },
        })

        return NextResponse.json(payment)
    } catch (error: any) {
        console.error('SalaryPayment POST Error:', error)
        return NextResponse.json(
            { error: 'Failed to add payment', details: error.message },
            { status: 500 }
        )
    }
}
