import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getRpConfig, setWebAuthnChallenge, parseTransports } from '@/lib/webauthn'

export async function POST(req: NextRequest) {
    try {
        let username: string | undefined

        try {
            const body = await req.json()
            if (body && typeof body.username === 'string' && body.username.trim().length > 0) {
                username = body.username.trim()
            }
        } catch {
            // Body is optional
        }

        const rpConfig = getRpConfig(req)

        let allowCredentials: { id: string; transports?: ReturnType<typeof parseTransports> }[] | undefined = undefined

        if (username) {
            const user = await prisma.user.findUnique({
                where: { username },
                include: { passkeys: true },
            })

            if (user && user.passkeys.length > 0) {
                allowCredentials = user.passkeys.map((pk) => ({
                    id: pk.id,
                    transports: parseTransports(pk.transports),
                }))
            }
        }

        const options = await generateAuthenticationOptions({
            rpID: rpConfig.rpID,
            userVerification: 'preferred',
            allowCredentials,
        })

        await setWebAuthnChallenge({
            challenge: options.challenge,
            username,
        })

        return NextResponse.json(options)
    } catch (err) {
        console.error('WebAuthn login-options error:', err)
        return NextResponse.json({ error: 'Failed to generate authentication options' }, { status: 500 })
    }
}
