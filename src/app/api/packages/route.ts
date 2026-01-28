import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { companyId, date, description } = body

        if (!companyId || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const pkg = await prisma.package.create({
            data: {
                companyId: Number(companyId),
                date: new Date(date),
                description: description || '',
            },
        })

        return NextResponse.json(pkg)
    } catch (error) {
        console.error('Package Create Error:', error)
        return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
    }
}
