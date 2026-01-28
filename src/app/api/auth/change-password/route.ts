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

        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const body = await request.json()
        const { currentPassword, newPassword, newUsername } = body

        if (!currentPassword) {
            return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
        }

        if (!newPassword && !newUsername) {
            return NextResponse.json({ error: 'Provide at least one field to update' }, { status: 400 })
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password)
        if (!isValid) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
        }

        const updateData: any = {}

        // Handle Password Update
        if (newPassword) {
            if (newPassword.length < 6) {
                return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
            }
            updateData.password = await bcrypt.hash(newPassword, 10)
        }

        // Handle Username Update
        if (newUsername && newUsername !== user.username) {
            // Check uniqueness
            const existing = await prisma.user.findUnique({
                where: { username: newUsername }
            })
            if (existing) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
            }
            updateData.username = newUsername
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Credentials Update Error:', error)
        return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 })
    }
}
