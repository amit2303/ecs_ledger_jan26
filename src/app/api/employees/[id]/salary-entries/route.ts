import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const empId = parseInt(id, 10)
    if (isNaN(empId)) {
        return NextResponse.json({ error: 'Invalid Employee ID' }, { status: 400 })
    }

    try {
        const body = await request.json()
        const { month, amount, description } = body

        if (!month || amount === undefined || isNaN(Number(amount))) {
            return NextResponse.json(
                { error: 'Valid Month and Amount are required' },
                { status: 400 }
            )
        }

        const entry = await prisma.salaryEntry.create({
            data: {
                employeeId: empId,
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
