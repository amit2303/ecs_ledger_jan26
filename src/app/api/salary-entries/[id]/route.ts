import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
