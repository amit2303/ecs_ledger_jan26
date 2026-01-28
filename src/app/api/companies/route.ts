import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, CompanyType } from '@/generated/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const type = searchParams.get('type') // 'CLIENT' | 'VENDOR' | null

        // Raw SQL for maximum performance (MySQL Version)
        let query = `
            SELECT 
                c.id, 
                c.name, 
                c.type, 
                c.ledgerLink,
                c.updatedAt,
                (SELECT COUNT(*) FROM Package p WHERE p.companyId = c.id) as packageCount,
                (
                    SELECT COALESCE(SUM(ch.amount), 0)
                    FROM Charge ch 
                    JOIN Package p ON ch.packageId = p.id 
                    WHERE p.companyId = c.id
                ) as totalCharges,
                (
                    SELECT COALESCE(SUM(pay.amount), 0) 
                    FROM Payment pay 
                    JOIN Package p ON pay.packageId = p.id 
                    WHERE p.companyId = c.id
                ) as totalPayments,
                GREATEST(
                    UNIX_TIMESTAMP(c.updatedAt),
                    COALESCE((SELECT UNIX_TIMESTAMP(MAX(p.createdAt)) FROM Package p WHERE p.companyId = c.id), 0),
                    COALESCE((SELECT UNIX_TIMESTAMP(MAX(ch.createdAt)) FROM Charge ch JOIN Package p ON ch.packageId = p.id WHERE p.companyId = c.id), 0),
                    COALESCE((SELECT UNIX_TIMESTAMP(MAX(pay.createdAt)) FROM Payment pay JOIN Package p ON pay.packageId = p.id WHERE p.companyId = c.id), 0)
                ) * 1000 as lastActivityTimestamp
            FROM Company c
            WHERE 1=1
        `

        const params: any[] = []

        if (type) {
            query += ` AND c.type = ?`
            params.push(type)
        }

        if (search) {
            query += ` AND c.name LIKE ?`
            params.push(`%${search}%`)
        }

        query += ` ORDER BY lastActivityTimestamp DESC`

        const companiesRaw = await prisma.$queryRawUnsafe(query, ...params) as any[]

        // Format for frontend
        const result = companiesRaw.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            ledgerLink: c.ledgerLink,
            amountDue: Number(c.totalCharges) - Number(c.totalPayments),
            lastActivity: Number(c.lastActivityTimestamp),
            packageCount: Number(c.packageCount)
        }))

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Companies Error:', error)
        return NextResponse.json({ error: 'Failed to fetch companies', details: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, type, address, ledgerLink, director, contact, email } = body

        if (!name || !type) {
            return NextResponse.json({ error: 'Name and Type are required' }, { status: 400 })
        }

        const company = await prisma.company.create({
            data: {
                name,
                type: type as CompanyType,
                address,
                ledgerLink,
                director,
                contact,
                email
            }
        })

        return NextResponse.json(company)
    } catch (error) {
        console.error('Create Company Error:', error)
        return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }
}
