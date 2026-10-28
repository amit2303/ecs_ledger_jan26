import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const paymentId = parseInt(id, 10)
    if (isNaN(paymentId)) {
        return NextResponse.json({ error: 'Invalid Salary Payment ID' }, { status: 400 })
    }

    try {
        await prisma.salaryPayment.delete({
            where: { id: paymentId },
        })

        // Unlink associated TransactionMessage without deleting chat message history
        await prisma.transactionMessage.updateMany({
            where: { salaryPaymentId: paymentId },
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
