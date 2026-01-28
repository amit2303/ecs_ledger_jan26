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
        await prisma.document.delete({
            where: { id: docId }
        })

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
