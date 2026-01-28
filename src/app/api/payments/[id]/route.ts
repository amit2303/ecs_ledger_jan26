import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const body = await request.json()
        const { description, amount, date } = body

        if (!description || !amount) {
            return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 })
        }

        const updatedPayment = await prisma.payment.update({
            where: { id },
            data: {
                description,
                amount: Number(amount),
                date: date ? new Date(date) : undefined
            }
        })

        return NextResponse.json(updatedPayment)
    } catch (error) {
        console.error('Payment Update Error:', error)
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        await prisma.payment.delete({ where: { id } })

        return NextResponse.json({ message: 'Payment deleted successfully' })
    } catch (error) {
        console.error('Payment Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
    }
}
