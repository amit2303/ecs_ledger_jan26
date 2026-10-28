import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        const { amount, description, month } = body

        if (amount === undefined) {
            return NextResponse.json(
                { error: 'Amount is required' },
                { status: 400 }
            )
        }

        const updated = await prisma.salaryEntry.update({
            where: { id: Number(id) },
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
    try {
        await prisma.salaryEntry.delete({
            where: { id: Number(id) },
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
