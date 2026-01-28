
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid Package ID' }, { status: 400 })

        const body = await request.json()
        const { description, amount, date } = body

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 })
        }

        const charge = await prisma.charge.create({
            data: {
                packageId,
                description: description || 'Charge',
                amount: Number(amount),
                date: date ? new Date(date) : new Date(),
            }
        })

        return NextResponse.json(charge)
    } catch (error) {
        console.error('Charge Create Error:', error)
        return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 })
    }
}

export async function GET(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid Package ID' }, { status: 400 })

        const charges = await prisma.charge.findMany({
            where: { packageId },
            orderBy: { date: 'desc' }
        })

        return NextResponse.json(charges)
    } catch (error) {
        console.error('Charge Fetch Error:', error)
        return NextResponse.json({ error: 'Failed to fetch charges' }, { status: 500 })
    }
}
