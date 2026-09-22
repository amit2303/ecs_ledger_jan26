import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        await prisma.salaryPayment.delete({
            where: { id: Number(id) },
        })

        // Unlink associated TransactionMessage without deleting chat message history
        await prisma.transactionMessage.updateMany({
            where: { salaryPaymentId: Number(id) },
            data: { salaryPaymentId: null }
        })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('SalaryPayment DELETE Error:', error)
        return NextResponse.json(
            { error: 'Failed to delete payment', details: error.message },
            { status: 500 }
        )
    }
}
