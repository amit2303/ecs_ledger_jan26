import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const body = await request.json()
        const { description, amount, date } = body

        if (amount === undefined || amount === null) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 })
        }

        const updatedPayment = await prisma.payment.update({
            where: { id },
            data: {
                description: description || '',
                amount: Number(amount),
                date: date ? new Date(date) : undefined,
                hasUpdates: true
            },
            include: { package: true }
        })

        // Propagate update to Package and Company
        await prisma.package.update({
            where: { id: updatedPayment.packageId },
            data: { hasUpdates: true }
        })
        await prisma.company.update({
            where: { id: updatedPayment.package.companyId },
            data: { hasUpdates: true }
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

        const payment = await prisma.payment.findUnique({
            where: { id },
            include: { package: true }
        })

        if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

        await prisma.payment.delete({ where: { id } })

        // Propagate update to Package and Company
        await prisma.package.update({
            where: { id: payment.packageId },
            data: { hasUpdates: true }
        })
        await prisma.company.update({
            where: { id: payment.package.companyId },
            data: { hasUpdates: true }
        })

        return NextResponse.json({ message: 'Payment deleted successfully' })
    } catch (error) {
        console.error('Payment Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
    }
}
