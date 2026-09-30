import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        const session = await getSession()
        if (!session || !session.user || typeof session.user !== 'object' || !('id' in session.user)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { passcode } = await request.json()
        if (!passcode) {
            return NextResponse.json({ error: 'Password is required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        let isValid = false

        if (user.hisabPassword) {
            isValid = await bcrypt.compare(String(passcode), user.hisabPassword)
        } else {
            // Default initial password fallback
            isValid = String(passcode).trim() === '230303'
        }

        if (!isValid) {
            return NextResponse.json({ error: 'Incorrect password' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Verify Hisab Passcode Error:', error)
        return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 })
    }
}
