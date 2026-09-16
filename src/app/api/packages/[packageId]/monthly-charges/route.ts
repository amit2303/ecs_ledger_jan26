import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processDueMonthlyCharges } from '@/lib/monthlyCharges'

export async function GET(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid Package ID' }, { status: 400 })

        // Auto-evaluate any pending monthly charges
        await processDueMonthlyCharges(packageId)

        const monthlyCharges = await prisma.monthlyCharge.findMany({
            where: { packageId },
            orderBy: [{ createdAt: 'asc' }]
        })

        return NextResponse.json(monthlyCharges)
    } catch (error) {
        console.error('Monthly Charges Fetch Error:', error)
        return NextResponse.json({ error: 'Failed to fetch monthly charges' }, { status: 500 })
    }
}

export async function POST(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid Package ID' }, { status: 400 })

        const body = await request.json()
        const { description, amount, startDate } = body

        if (!description || !amount) {
            return NextResponse.json({ error: 'Description and Amount are required' }, { status: 400 })
        }

        const now = new Date()
        // Default start date to the 1st of current month
        const start = startDate ? new Date(startDate) : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 12, 0, 0))

        const monthlyCharge = await prisma.monthlyCharge.create({
            data: {
                packageId,
                description: description.trim(),
                amount: Number(amount),
                startDate: start,
                isActive: true
            }
        })

        // Process immediately to generate any charges due (e.g. for current month)
        await processDueMonthlyCharges(packageId)

        return NextResponse.json(monthlyCharge)
    } catch (error) {
        console.error('Monthly Charge Create Error:', error)
        return NextResponse.json({ error: 'Failed to create monthly charge' }, { status: 500 })
    }
}
