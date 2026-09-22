import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/expert-hisab/summaries
 * Returns all historical month summaries stored in DB
 */
export async function GET() {
    try {
        const summaries = await prisma.historicalMonthSummary.findMany({
            orderBy: { month: 'desc' }
        })
        return NextResponse.json(summaries)
    } catch (error) {
        console.error('Failed to fetch historical summaries:', error)
        return NextResponse.json({ error: 'Failed to fetch historical summaries' }, { status: 500 })
    }
}
