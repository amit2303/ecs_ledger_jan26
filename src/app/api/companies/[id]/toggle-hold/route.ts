import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Company ID' }, { status: 400 })
        }

        const existingCompany = await prisma.company.findUnique({
            where: { id },
            select: { id: true, name: true, isOnHold: true }
        })

        if (!existingCompany) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        const newHoldStatus = !existingCompany.isOnHold

        const updatedCompany = await prisma.company.update({
            where: { id },
            data: { isOnHold: newHoldStatus }
        })

        return NextResponse.json({
            success: true,
            id: updatedCompany.id,
            name: updatedCompany.name,
            isOnHold: updatedCompany.isOnHold,
            message: `Company '${updatedCompany.name}' is now ${newHoldStatus ? 'on hold' : 'active'}`
        })
    } catch (error) {
        console.error('Toggle Hold Error:', error)
        return NextResponse.json({ error: 'Failed to toggle hold status' }, { status: 500 })
    }
}
