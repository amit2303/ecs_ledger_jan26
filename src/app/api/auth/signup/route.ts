import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
    try {
        // Security check: Only allow initial user creation if no users exist.
        // Once users exist, only authenticated users can create additional users.
        const userCount = await prisma.user.count()
        if (userCount > 0) {
            const session = await getSession()
            if (!session || !session.user) {
                return NextResponse.json(
                    { error: 'Public registration is disabled. Please contact the administrator.' },
                    { status: 403 }
                )
            }
        }

        const body = await request.json()
        const { username, password } = body

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return NextResponse.json({ error: 'Invalid input format' }, { status: 400 })
        }

        const trimmedUsername = username.trim()
        if (trimmedUsername.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { username: trimmedUsername }
        })
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.user.create({
            data: {
                username: trimmedUsername,
                password: hashedPassword
            }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Signup error:', error)
        return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
    }
}
