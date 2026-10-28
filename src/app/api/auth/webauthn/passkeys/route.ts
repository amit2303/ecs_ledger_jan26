import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getSession()
        const sessionUser = session?.user as { id: number; username: string } | undefined
        if (!sessionUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const passkeys = await prisma.passkey.findMany({
            where: { userId: sessionUser.id },
            select: {
                id: true,
                name: true,
                deviceType: true,
                createdAt: true,
                lastUsedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ passkeys })
    } catch (err) {
        console.error('Fetch passkeys error:', err)
        return NextResponse.json({ error: 'Failed to fetch passkeys' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession()
        const sessionUser = session?.user as { id: number; username: string } | undefined
        if (!sessionUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'Missing passkey ID' }, { status: 400 })
        }

        const passkey = await prisma.passkey.findFirst({
            where: {
                id,
                userId: sessionUser.id,
            },
        })

        if (!passkey) {
            return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
        }

        await prisma.passkey.delete({
            where: { id },
        })

        return NextResponse.json({ success: true, message: 'Passkey removed successfully' })
    } catch (err) {
        console.error('Delete passkey error:', err)
        return NextResponse.json({ error: 'Failed to delete passkey' }, { status: 500 })
    }
}
