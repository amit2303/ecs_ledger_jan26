import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        // Run queries in parallel for maximum speed
        const [
            clientCount,
            vendorCount,
            clientCharges,
            clientPayments,
            vendorCharges,
            vendorPayments
        ] = await Promise.all([
            // Counts
            prisma.company.count({ where: { type: 'CLIENT' } }),
            prisma.company.count({ where: { type: 'VENDOR' } }),

            // Client Totals
            prisma.charge.aggregate({
                _sum: { amount: true },
                where: { package: { company: { type: 'CLIENT' } } }
            }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { package: { company: { type: 'CLIENT' } } }
            }),

            // Vendor Totals
            prisma.charge.aggregate({
                _sum: { amount: true },
                where: { package: { company: { type: 'VENDOR' } } }
            }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: { package: { company: { type: 'VENDOR' } } }
            })
        ])

        const totalClientCharges = Number(clientCharges._sum.amount || 0)
        const totalClientPaymentsVal = Number(clientPayments._sum.amount || 0)

        const totalVendorCharges = Number(vendorCharges._sum.amount || 0)
        const totalVendorPaymentsVal = Number(vendorPayments._sum.amount || 0)

        // Calculations
        const totalClientDue = totalClientCharges - totalClientPaymentsVal
        const totalVendorDue = totalVendorCharges - totalVendorPaymentsVal

        // ECS Income = Total Received from Clients - Total Paid to Vendors
        const ecsIncome = totalClientPaymentsVal - totalVendorPaymentsVal

        return NextResponse.json({
            totalClients: clientCount,
            totalVendors: vendorCount,
            totalClientDue,
            totalVendorDue,
            ecsIncome,
        })
    } catch (error) {
        console.error('Stats Error:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
