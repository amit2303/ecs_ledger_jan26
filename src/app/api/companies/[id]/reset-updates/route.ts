import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)

        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid Company ID' }, { status: 400 })
        }

        // Reset Company
        const company = await prisma.company.update({
            where: { id },
            data: { hasUpdates: false }
        })

        // Reset Packages
        await prisma.package.updateMany({
            where: { companyId: id },
            data: { hasUpdates: false }
        })

        // Reset Charges (via Package)
        // Prisma doesn't support deep updateMany easily, so we have to find packages first or use raw query.
        // Assuming we can't do deep nested updateMany in one go.
        // Let's use updateMany on Charge where package.companyId = id.
        // Prisma updateMany doesn't support relation filtering directly in 'where' for some DBs perfectly but let's try or find packages first.

        const packages = await prisma.package.findMany({
            where: { companyId: id },
            select: { id: true }
        })
        const packageIds = packages.map(p => p.id)

        if (packageIds.length > 0) {
            await prisma.charge.updateMany({
                where: { packageId: { in: packageIds } },
                data: { hasUpdates: false }
            })

            await prisma.payment.updateMany({
                where: { packageId: { in: packageIds } },
                data: { hasUpdates: false }
            })
        }

        return NextResponse.json(company)
    } catch (error) {
        console.error('Reset Updates Error:', error)
        return NextResponse.json({ error: 'Failed to reset updates' }, { status: 500 })
    }
}
