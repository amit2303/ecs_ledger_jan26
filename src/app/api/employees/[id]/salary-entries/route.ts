import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        const { month, amount, description } = body

        if (!month || amount === undefined) {
            return NextResponse.json(
                { error: 'Month and Amount are required' },
                { status: 400 }
            )
        }

        const entry = await prisma.salaryEntry.create({
            data: {
                employeeId: Number(id),
                month,
                amount: Number(amount),
                description: description?.trim() || null,
            },
        })

        return NextResponse.json(entry)
    } catch (error: any) {
        console.error('SalaryEntry POST Error:', error)
        return NextResponse.json(
            { error: 'Failed to add salary entry', details: error.message },
            { status: 500 }
        )
    }
}
