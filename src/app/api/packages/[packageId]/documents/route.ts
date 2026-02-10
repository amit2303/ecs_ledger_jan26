import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, appendFile } from 'fs/promises'
import path from 'path'

async function log(msg: string) {
    try {
        await appendFile('debug.log', `[${new Date().toISOString()}] ${msg}\n`)
    } catch { }
}

export async function POST(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        await log('POST /api/packages/[packageId]/documents hit')

        const params = await props.params
        const packageId = parseInt(params.packageId)

        if (isNaN(packageId)) {
            return NextResponse.json({ error: 'Invalid Package ID' }, { status: 400 })
        }

        const formData = await request.formData()
        const files = formData.getAll('files') as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
        }

        // Verify package exists
        const pkg = await prisma.package.findUnique({ where: { id: packageId } })
        if (!pkg) {
            return NextResponse.json({ error: 'Package not found' }, { status: 404 })
        }

        // Store in /public/uploads/packages/[packageId]
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'packages', params.packageId)
        await mkdir(uploadDir, { recursive: true })

        const savedDocuments = []

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer())
            const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()
            const fileName = `${Date.now()}_${safeName}`
            const filePath = path.join(uploadDir, fileName)

            await writeFile(filePath, buffer)

            const doc = await prisma.document.create({
                data: {
                    packageId,
                    name: file.name,
                    url: `/uploads/packages/${params.packageId}/${fileName}`,
                    type: file.type || 'application/octet-stream'
                }
            })

            savedDocuments.push(doc)
        }

        // Update company hasUpdates flag
        if (savedDocuments.length > 0) {
            const pkg = await prisma.package.findUnique({
                where: { id: packageId },
                select: { companyId: true }
            })

            if (pkg) {
                // Update Package hasUpdates
                await prisma.package.update({
                    where: { id: packageId },
                    data: { hasUpdates: true }
                })

                // Update Company hasUpdates
                await prisma.company.update({
                    where: { id: pkg.companyId },
                    data: { hasUpdates: true }
                })
            }
        }

        return NextResponse.json(savedDocuments)
    } catch (error: any) {
        await log(`Error: ${error.message}`)
        console.error('Upload Error:', error)
        return NextResponse.json({ error: 'Failed to upload files', details: error.message }, { status: 500 })
    }
}

export async function GET(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId)

        if (isNaN(packageId)) {
            return NextResponse.json({ error: 'Invalid Package ID' }, { status: 400 })
        }

        const documents = await prisma.document.findMany({
            where: { packageId },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(documents)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
}
