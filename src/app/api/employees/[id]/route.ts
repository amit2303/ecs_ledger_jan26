import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const employee = await prisma.employee.findUnique({
            where: { id: Number(id) },
            include: {
                salaryEntries: { orderBy: { month: 'asc' } },
                salaryPayments: { orderBy: { date: 'asc' } },
            },
        })

        if (!employee) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            )
        }

        const totalSalary = employee.salaryEntries.reduce(
            (sum, e) => sum + Number(e.amount),
            0
        )
        const totalPaid = employee.salaryPayments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
        )

        return NextResponse.json({
            ...employee,
            salary: Number(employee.salary),
            totalSalary,
            totalPaid,
            balance: totalSalary - totalPaid,
            salaryEntries: employee.salaryEntries.map((e) => ({
                ...e,
                amount: Number(e.amount),
            })),
            salaryPayments: employee.salaryPayments.map((p) => ({
                ...p,
                amount: Number(p.amount),
            })),
        })
    } catch (error: any) {
        console.error('Employee GET Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch employee', details: error.message },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const body = await request.json()
        const { name, salary, designation, address } = body

        const employee = await prisma.employee.update({
            where: { id: Number(id) },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(salary !== undefined && { salary: Number(salary) }),
                ...(designation !== undefined && {
                    designation: designation?.trim() || null,
                }),
                ...(address !== undefined && {
                    address: address?.trim() || null,
                }),
            },
        })

        return NextResponse.json(employee)
    } catch (error: any) {
        console.error('Employee PUT Error:', error)
        return NextResponse.json(
            { error: 'Failed to update employee', details: error.message },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        await prisma.employee.delete({
            where: { id: Number(id) },
        })
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Employee DELETE Error:', error)
        return NextResponse.json(
            { error: 'Failed to delete employee', details: error.message },
            { status: 500 }
        )
    }
}
