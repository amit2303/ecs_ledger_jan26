import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB
const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.heic',
    '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'
])

export async function POST(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId, 10)

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
        const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'packages', String(packageId))
        await mkdir(uploadDir, { recursive: true })

        const savedDocuments = []

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `File '${file.name}' exceeds the 25MB maximum size limit.` },
                    { status: 400 }
                )
            }

            const ext = path.extname(file.name).toLowerCase()
            if (!ALLOWED_EXTENSIONS.has(ext)) {
                return NextResponse.json(
                    { error: `File type '${ext || 'unknown'}' is not allowed for security reasons. Allowed: PDF, Images, Word, Excel, CSV.` },
                    { status: 400 }
                )
            }

            const buffer = Buffer.from(await file.arrayBuffer())
            const safeBaseName = path.basename(file.name, ext).replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
            const fileName = `${Date.now()}_${safeBaseName}${ext}`
            const filePath = path.resolve(uploadDir, fileName)

            // Ensure filePath stays within uploadDir
            if (!filePath.startsWith(uploadDir + path.sep)) {
                return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
            }

            await writeFile(filePath, buffer)

            const doc = await prisma.document.create({
                data: {
                    packageId,
                    name: file.name,
                    url: `/uploads/packages/${packageId}/${fileName}`,
                    type: file.type || 'application/octet-stream'
                }
            })

            savedDocuments.push(doc)
        }

        // Update company hasUpdates flag
        if (savedDocuments.length > 0) {
            const pkgData = await prisma.package.findUnique({
                where: { id: packageId },
                select: { companyId: true }
            })

            if (pkgData) {
                await prisma.package.update({
                    where: { id: packageId },
                    data: { hasUpdates: true }
                }).catch(() => {})

                await prisma.company.update({
                    where: { id: pkgData.companyId },
                    data: { hasUpdates: true }
                }).catch(() => {})
            }
        }

        return NextResponse.json(savedDocuments)
    } catch (error: any) {
        console.error('Upload Error:', error)
        return NextResponse.json({ error: 'Failed to upload files', details: error.message }, { status: 500 })
    }
}

export async function GET(request: Request, props: { params: Promise<{ packageId: string }> }) {
    try {
        const params = await props.params
        const packageId = parseInt(params.packageId, 10)

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
