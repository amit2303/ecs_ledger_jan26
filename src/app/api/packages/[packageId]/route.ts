import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const pkg = await prisma.package.findUnique({
            where: { id: packageId },
            include: {
                charges: { orderBy: { date: 'desc' } },
                payments: { orderBy: { date: 'desc' } }
            }
        })

        if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

        return NextResponse.json(pkg)
    } catch (error) {
        console.error('Package Detail Error:', error)
        return NextResponse.json({ error: 'Failed to fetch package details' }, { status: 500 })
    }
}

export async function PUT(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const body = await request.json()
        const { description, date } = body

        if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 })

        const updatedPackage = await prisma.package.update({
            where: { id: packageId },
            data: {
                description,
                date: date ? new Date(date) : undefined,
                hasUpdates: true
            }
        })

        // Propagate update to Company
        await prisma.company.update({
            where: { id: updatedPackage.companyId },
            data: { hasUpdates: true }
        })

        return NextResponse.json(updatedPackage)
    } catch (error) {
        console.error('Package Update Error:', error)
        return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)
        if (isNaN(packageId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        // Check for dependencies
        const pkg = await prisma.package.findUnique({
            where: { id: packageId },
            include: {
                _count: {
                    select: {
                        charges: true,
                        payments: true
                    }
                }
            }
        })

        if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

        if (pkg._count.charges > 0 || pkg._count.payments > 0) {
            return NextResponse.json({
                error: 'Cannot delete package because it has associated charges or payments. Please delete all transactions first.'
            }, { status: 400 })
        }

        await prisma.package.delete({ where: { id: packageId } })

        // Propagate update to Company
        await prisma.company.update({
            where: { id: pkg.companyId },
            data: { hasUpdates: true }
        })

        return NextResponse.json({ message: 'Package deleted successfully' })
    } catch (error) {
        console.error('Package Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
    }
}
