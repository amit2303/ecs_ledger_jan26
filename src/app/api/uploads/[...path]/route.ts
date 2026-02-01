import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';


export async function GET(
    request: Request,
    props: { params: Promise<{ path: string[] }> }
) {
    const params = await props.params;
    try {
        // Construct the full path to the file in the public directory
        const filePath = path.join(process.cwd(), 'public', 'uploads', ...params.path);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Read file
        const fileBuffer = await fs.readFile(filePath);

        // Determine content type
        // We'll need a simple mime lookup or fallback
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';

        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.pdf': 'application/pdf',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.heic': 'image/heic'
        };

        if (mimeTypes[ext]) {
            contentType = mimeTypes[ext];
        }

        // Return the file
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
