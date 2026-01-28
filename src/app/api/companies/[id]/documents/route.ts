import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, appendFile } from 'fs/promises'
import path from 'path'

async function log(msg: string) {
    try {
        await appendFile('debug.log', `[${new Date().toISOString()}] ${msg}\n`)
    } catch { }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        await log('POST /api/companies/[id]/documents hit')

        // Handle params specifically for Next.js 15
        const params = await props.params
        const id = params.id
        await log(`ID received: ${id}`)

        const formData = await request.formData()
        const files = formData.getAll('files') as File[]
        await log(`Files count: ${files?.length}`)

        if (!files || files.length === 0) {
            await log('Error: No files uploaded')
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
        }

        const companyId = parseInt(id)
        if (isNaN(companyId)) {
            await log('Error: Invalid Company ID')
            return NextResponse.json({ error: 'Invalid Company ID' }, { status: 400 })
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', id)
        await log(`Upload Dir: ${uploadDir}`)

        await mkdir(uploadDir, { recursive: true })
        await log('Directory ensuring complete')

        const savedDocuments = []

        for (const file of files) {
            await log(`Processing file: ${file.name}`)
            const buffer = Buffer.from(await file.arrayBuffer())
            // Sanitize filename and add timestamp
            const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()
            const fileName = `${Date.now()}_${safeName}`
            const filePath = path.join(uploadDir, fileName)

            await writeFile(filePath, buffer)
            await log(`File written: ${filePath}`)

            const doc = await prisma.document.create({
                data: {
                    companyId,
                    name: file.name,
                    url: `/uploads/${id}/${fileName}`,
                    type: file.type || 'application/octet-stream' // simpler type storage
                }
            })
            savedDocuments.push(doc)
        }

        await log('Upload successful')
        return NextResponse.json(savedDocuments)
    } catch (error: any) {
        await log(`Error: ${error.message}`)
        await log(`Stack: ${error.stack}`)
        console.error('Upload Error:', error)
        return NextResponse.json({ error: 'Failed to upload files', details: error.message }, { status: 500 })
    }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const id = params.id
        const documents = await prisma.document.findMany({
            where: { companyId: parseInt(id) },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(documents)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
}
