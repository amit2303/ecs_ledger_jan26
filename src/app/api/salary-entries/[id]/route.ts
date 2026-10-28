import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const entryId = parseInt(id, 10)
    if (isNaN(entryId)) {
        return NextResponse.json({ error: 'Invalid Salary Entry ID' }, { status: 400 })
    }

    try {
        const body = await request.json()
        const { amount, description, month } = body

        if (amount === undefined || isNaN(Number(amount))) {
            return NextResponse.json(
                { error: 'Valid amount is required' },
                { status: 400 }
            )
        }

        const updated = await prisma.salaryEntry.update({
            where: { id: entryId },
            data: {
                amount: Number(amount),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(month !== undefined && { month }),
            },
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error('SalaryEntry PUT Error:', error)
        return NextResponse.json(
            { error: 'Failed to update salary entry', details: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const entryId = parseInt(id, 10)
    if (isNaN(entryId)) {
        return NextResponse.json({ error: 'Invalid Salary Entry ID' }, { status: 400 })
    }

    try {
        await prisma.salaryEntry.delete({
            where: { id: entryId },
        })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('SalaryEntry DELETE Error:', error)
        return NextResponse.json(
            { error: 'Failed to delete salary entry', details: error.message },
            { status: 500 }
        )
    }
}
