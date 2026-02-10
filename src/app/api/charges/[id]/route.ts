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

        const updatedCharge = await prisma.charge.update({
            where: { id },
            data: {
                description,
                amount: Number(amount),
                date: date ? new Date(date) : undefined,
                hasUpdates: true
            },
            include: { package: true }
        })

        // Propagate update to Package and Company
        await prisma.package.update({
            where: { id: updatedCharge.packageId },
            data: { hasUpdates: true }
        })
        await prisma.company.update({
            where: { id: updatedCharge.package.companyId },
            data: { hasUpdates: true }
        })

        return NextResponse.json(updatedCharge)
    } catch (error) {
        console.error('Charge Update Error:', error)
        return NextResponse.json({ error: 'Failed to update charge' }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const charge = await prisma.charge.findUnique({
            where: { id },
            include: { package: true }
        })

        if (!charge) return NextResponse.json({ error: 'Charge not found' }, { status: 404 })

        await prisma.charge.delete({ where: { id } })

        // Propagate update to Package and Company
        await prisma.package.update({
            where: { id: charge.packageId },
            data: { hasUpdates: true }
        })
        await prisma.company.update({
            where: { id: charge.package.companyId },
            data: { hasUpdates: true }
        })

        return NextResponse.json({ message: 'Charge deleted successfully' })
    } catch (error) {
        console.error('Charge Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete charge' }, { status: 500 })
    }
}
