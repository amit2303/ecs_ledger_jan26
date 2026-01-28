import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                packages: {
                    orderBy: { date: 'desc' },
                    include: {
                        payments: { orderBy: { date: 'desc' } },
                        charges: { orderBy: { date: 'desc' } }
                    }
                },
            },
        })

        if (!company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        // Calculate total package amount by summing up all charges in all packages
        const totalPackageAmount = company.packages.reduce((sum, pkg) => {
            const pkgTotal = pkg.charges.reduce((cSum, c) => cSum + Number(c.amount), 0)
            return sum + pkgTotal
        }, 0)

        // Flatten payments from packages
        const allPayments = company.packages.flatMap(p => p.payments)

        const totalPaymentsReceived = allPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
        const netDue = totalPackageAmount - totalPaymentsReceived

        return NextResponse.json({
            ...company,
            payments: allPayments, // Return flattened payments to match UI expectations
            totalPackageAmount,
            totalPaymentsReceived,
            netDue
        })
    } catch (error) {
        console.error('Company Detail Error:', error)
        return NextResponse.json({ error: 'Failed to fetch company details' }, { status: 500 })
    }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const body = await request.json()
        const { name, address, ledgerLink, director, contact, email } = body

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const updatedCompany = await prisma.company.update({
            where: { id },
            data: { name, address, ledgerLink, director, contact, email }
        })

        return NextResponse.json(updatedCompany)
    } catch (error) {
        console.error('Company Update Error:', error)
        return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        // Check for dependencies
        const company = await prisma.company.findUnique({
            where: { id },
            include: { _count: { select: { packages: true } } }
        })

        if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

        if (company._count.packages > 0) {
            return NextResponse.json({
                error: 'Cannot delete company because it has associated packages. Please delete existing packages first.'
            }, { status: 400 })
        }

        await prisma.company.delete({ where: { id } })

        return NextResponse.json({ message: 'Company deleted successfully' })
    } catch (error) {
        console.error('Company Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
    }
}
