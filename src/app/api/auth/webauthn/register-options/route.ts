import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getRpConfig, setWebAuthnChallenge, parseTransports } from '@/lib/webauthn'

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        const sessionUser = session?.user as { id: number; username: string } | undefined
        if (!sessionUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            include: { passkeys: true },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const rpConfig = getRpConfig(req)

        const options = await generateRegistrationOptions({
            rpName: rpConfig.rpName,
            rpID: rpConfig.rpID,
            userID: new Uint8Array(Buffer.from(String(user.id))),
            userName: user.username,
            userDisplayName: user.username,
            attestationType: 'none',
            excludeCredentials: user.passkeys.map((pk) => ({
                id: pk.id,
                transports: parseTransports(pk.transports),
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        })

        await setWebAuthnChallenge({
            challenge: options.challenge,
            userId: user.id,
            username: user.username,
        })

        return NextResponse.json(options)
    } catch (err) {
        console.error('WebAuthn register-options error:', err)
        return NextResponse.json({ error: 'Failed to generate registration options' }, { status: 500 })
    }
}
