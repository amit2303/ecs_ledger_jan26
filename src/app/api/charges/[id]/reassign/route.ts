import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/charges/[id]/reassign
 * Body: { packageId: number }
 * 
 * Moves a charge from its current package to a different package.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const body = await request.json()
        const { packageId } = body

        if (!packageId) {
            return NextResponse.json({ error: 'Target packageId is required' }, { status: 400 })
        }

        // Get the current charge to find old package
        const charge = await prisma.charge.findUnique({
            where: { id },
            include: { package: true }
        })

        if (!charge) {
            return NextResponse.json({ error: 'Charge not found' }, { status: 404 })
        }

        const oldPackageId = charge.packageId

        // Verify target package exists and belongs to the same company
        const targetPackage = await prisma.package.findUnique({
            where: { id: Number(packageId) }
        })

        if (!targetPackage) {
            return NextResponse.json({ error: 'Target package not found' }, { status: 404 })
        }

        if (targetPackage.companyId !== charge.package.companyId) {
            return NextResponse.json({ error: 'Target package must belong to the same company' }, { status: 400 })
        }

        // Move the charge
        await prisma.charge.update({
            where: { id },
            data: {
                packageId: Number(packageId),
                hasUpdates: true
            }
        })

        // Mark both old and new packages as updated
        await prisma.package.update({
            where: { id: oldPackageId },
            data: { hasUpdates: true }
        })
        await prisma.package.update({
            where: { id: Number(packageId) },
            data: { hasUpdates: true }
        })

        return NextResponse.json({ message: 'Charge reassigned successfully' })
    } catch (error) {
        console.error('Charge Reassign Error:', error)
        return NextResponse.json({ error: 'Failed to reassign charge' }, { status: 500 })
    }
}
