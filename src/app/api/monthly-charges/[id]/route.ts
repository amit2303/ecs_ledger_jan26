import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processDueMonthlyCharges } from '@/lib/monthlyCharges'

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const body = await request.json()
        const { description, amount, isActive } = body

        const data: any = {}
        if (description !== undefined) data.description = description.trim()
        if (amount !== undefined) data.amount = Number(amount)
        if (typeof isActive === 'boolean') data.isActive = isActive

        const updated = await prisma.monthlyCharge.update({
            where: { id },
            data
        })

        if (updated.isActive) {
            await processDueMonthlyCharges(updated.packageId)
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Monthly Charge Update Error:', error)
        return NextResponse.json({ error: 'Failed to update monthly charge' }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        await prisma.monthlyCharge.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Monthly Charge Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete monthly charge' }, { status: 500 })
    }
}
