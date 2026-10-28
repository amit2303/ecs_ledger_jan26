import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const docId = parseInt(id, 10)

        if (isNaN(docId)) {
            return NextResponse.json({ error: 'Invalid Document ID' }, { status: 400 })
        }

        const document = await prisma.document.findUnique({
            where: { id: docId }
        })

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Delete from DB first
        const deletedDoc = await prisma.document.delete({
            where: { id: docId }
        })

        // Propagate update
        if (deletedDoc.packageId) {
            await prisma.package.update({
                where: { id: deletedDoc.packageId },
                data: { hasUpdates: true }
            }).catch(() => {})
        }

        if (deletedDoc.companyId) {
            await prisma.company.update({
                where: { id: deletedDoc.companyId },
                data: { hasUpdates: true }
            }).catch(() => {})
        } else if (deletedDoc.packageId) {
            const pkg = await prisma.package.findUnique({ where: { id: deletedDoc.packageId } })
            if (pkg) {
                await prisma.company.update({
                    where: { id: pkg.companyId },
                    data: { hasUpdates: true }
                }).catch(() => {})
            }
        }

        // Try deleting from filesystem securely
        try {
            const uploadsBase = path.resolve(process.cwd(), 'public', 'uploads')
            const cleanUrl = (document.url || '').replace(/^\/+/, '')
            const targetPath = path.resolve(process.cwd(), 'public', cleanUrl)

            // Strictly ensure file is inside public/uploads before deleting
            if (targetPath.startsWith(uploadsBase + path.sep)) {
                await unlink(targetPath)
            }
        } catch (fsError) {
            console.error('Filesystem delete error (ignored):', fsError)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete Document Error:', error)
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }
}
