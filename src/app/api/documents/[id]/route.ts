import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const docId = parseInt(id)

        const document = await prisma.document.findUnique({
            where: { id: docId }
        })

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Delete from DB first to prevent UI sync issues if FS fails (rare)
        const deletedDoc = await prisma.document.delete({
            where: { id: docId }
        })

        // Propagate update
        if (deletedDoc.packageId) {
            await prisma.package.update({
                where: { id: deletedDoc.packageId },
                data: { hasUpdates: true }
            })
            // If it has a packageId, we need to find the company via package to be safe, 
            // OR if companyId is also set on doc we can use that. 
            // The schema has both but let's check.
            // Actually, if packageId is present, we should update the package.
            // If companyId is present, update company.
            // But usually a document belongs to a package OR a company.
        }

        if (deletedDoc.companyId) {
            await prisma.company.update({
                where: { id: deletedDoc.companyId },
                data: { hasUpdates: true }
            })
        } else if (deletedDoc.packageId) {
            // If linked to package, update company via package
            const pkg = await prisma.package.findUnique({ where: { id: deletedDoc.packageId } })
            if (pkg) {
                await prisma.company.update({
                    where: { id: pkg.companyId },
                    data: { hasUpdates: true }
                })
            }
        }

        // Try deleting from filesystem
        try {
            const filePath = path.join(process.cwd(), 'public', document.url)
            await unlink(filePath)
        } catch (fsError) {
            console.error('Filesystem delete error (ignored):', fsError)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete Document Error:', error)
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }
}
