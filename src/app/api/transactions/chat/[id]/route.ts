import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * DELETE /api/transactions/chat/[id]
 * Deletes a chat message:
 * 1. Deletes the corresponding Payment or Charge from DB if exists
 * 2. Updates the message status to 'DELETED'
 * 3. Updates package and company hasUpdates flags
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = parseInt(params.id)
        if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

        const msg = await prisma.transactionMessage.findUnique({
            where: { id }
        })

        if (!msg) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        if (msg.status === 'DELETED') {
            return NextResponse.json(msg)
        }

        let packageIdToUpdate: number | null = msg.packageId
        let companyIdToUpdate: number | null = msg.companyId

        // Delete linked Payment if exists
        if (msg.paymentId) {
            try {
                const payment = await prisma.payment.findUnique({
                    where: { id: msg.paymentId },
                    include: { package: true }
                })
                if (payment) {
                    packageIdToUpdate = payment.packageId
                    companyIdToUpdate = payment.package.companyId
                    await prisma.payment.delete({ where: { id: msg.paymentId } })
                }
            } catch (pErr) {
                console.warn('Payment delete warning:', pErr)
            }
        }

        // Delete linked Charge if exists
        if (msg.chargeId) {
            try {
                const charge = await prisma.charge.findUnique({
                    where: { id: msg.chargeId },
                    include: { package: true }
                })
                if (charge) {
                    packageIdToUpdate = charge.packageId
                    companyIdToUpdate = charge.package.companyId
                    await prisma.charge.delete({ where: { id: msg.chargeId } })
                }
            } catch (cErr) {
                console.warn('Charge delete warning:', cErr)
            }
        }

        // Delete linked SalaryPayment if exists
        if (msg.salaryPaymentId) {
            try {
                await prisma.salaryPayment.delete({ where: { id: msg.salaryPaymentId } })
            } catch (sErr) {
                console.warn('SalaryPayment delete warning:', sErr)
            }
        }

        // Propagate updates to Package and Company
        if (packageIdToUpdate) {
            await prisma.package.update({
                where: { id: packageIdToUpdate },
                data: { hasUpdates: true }
            })
        }
        if (companyIdToUpdate) {
            await prisma.company.update({
                where: { id: companyIdToUpdate },
                data: { hasUpdates: true }
            })
        }

        // Update message status to DELETED
        const updatedMsg = await prisma.transactionMessage.update({
            where: { id },
            data: {
                status: 'DELETED',
                paymentId: null,
                chargeId: null,
                salaryPaymentId: null
            }
        })

        return NextResponse.json(updatedMsg)
    } catch (error) {
        console.error('Transaction Message Delete Error:', error)
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
    }
}
