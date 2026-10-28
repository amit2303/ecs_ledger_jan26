import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(
    request: Request,
    props: { params: Promise<{ path: string[] }> }
) {
    const params = await props.params
    try {
        if (!params.path || !Array.isArray(params.path) || params.path.length === 0) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
        }

        // Base directory for uploads
        const baseUploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
        // Resolve target file path securely
        const targetPath = path.resolve(baseUploadsDir, ...params.path)

        // Path Traversal Security Check: Ensure requested path is strictly within baseUploadsDir
        if (!targetPath.startsWith(baseUploadsDir + path.sep)) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Check if file exists and is a regular file
        try {
            const stat = await fs.stat(targetPath)
            if (!stat.isFile()) {
                return NextResponse.json({ error: 'Not a file' }, { status: 404 })
            }
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        // Read file
        const fileBuffer = await fs.readFile(targetPath)

        // Determine content type
        const ext = path.extname(targetPath).toLowerCase()
        let contentType = 'application/octet-stream'

        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.heic': 'image/heic',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext]
        }

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch (error) {
        console.error('Error serving file:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
