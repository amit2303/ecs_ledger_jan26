import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const counts = {
        messages: await prisma.transactionMessage.count(),
        payments: await prisma.payment.count(),
        charges: await prisma.charge.count(),
        companies: await prisma.company.count(),
        packages: await prisma.package.count(),
    }
    const deletedMsgs = await prisma.transactionMessage.findMany({
        where: { status: 'DELETED' }
    })
    const unlinkedMsgs = await prisma.transactionMessage.findMany({
        where: { paymentId: null, chargeId: null, salaryPaymentId: null, companyId: { not: null } }
    })
    return NextResponse.json({ counts, deletedMsgs, unlinkedMsgs })
}
