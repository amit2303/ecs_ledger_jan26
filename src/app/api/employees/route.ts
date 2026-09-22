import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            include: {
                salaryEntries: true,
                salaryPayments: true,
            },
            orderBy: { createdAt: 'asc' },
        })

        const result = employees.map((emp) => {
            const totalSalary = emp.salaryEntries.reduce(
                (sum, e) => sum + Number(e.amount),
                0
            )
            const totalPaid = emp.salaryPayments.reduce(
                (sum, p) => sum + Number(p.amount),
                0
            )
            return {
                id: emp.id,
                name: emp.name,
                salary: Number(emp.salary),
                designation: emp.designation,
                address: emp.address,
                totalSalary,
                totalPaid,
                balance: totalSalary - totalPaid,
                createdAt: emp.createdAt,
            }
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Employees GET Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch employees', details: error.message },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, salary, designation, address } = body

        if (!name || salary === undefined || salary === null) {
            return NextResponse.json(
                { error: 'Name and Salary are required' },
                { status: 400 }
            )
        }

        const employee = await prisma.employee.create({
            data: {
                name: name.trim(),
                salary: Number(salary),
                designation: designation?.trim() || null,
                address: address?.trim() || null,
            },
        })

        return NextResponse.json(employee)
    } catch (error: any) {
        console.error('Employee POST Error:', error)
        return NextResponse.json(
            { error: 'Failed to create employee', details: error.message },
            { status: 500 }
        )
    }
}
