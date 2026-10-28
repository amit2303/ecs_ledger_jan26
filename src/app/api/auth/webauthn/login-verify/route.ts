import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { login } from '@/lib/auth'
import { getRpConfig, getWebAuthnChallenge, clearWebAuthnChallenge, parseTransports } from '@/lib/webauthn'

export async function POST(req: NextRequest) {
    try {
        const challengeData = await getWebAuthnChallenge()
        if (!challengeData) {
            return NextResponse.json(
                { error: 'Authentication session expired or invalid. Please try again.' },
                { status: 400 }
            )
        }

        const body: AuthenticationResponseJSON = await req.json()
        if (!body?.id) {
            return NextResponse.json({ error: 'Missing credential response' }, { status: 400 })
        }

        const passkey = await prisma.passkey.findUnique({
            where: { id: body.id },
            include: { user: true },
        })

        if (!passkey || !passkey.user) {
            return NextResponse.json(
                { error: 'Face ID / Touch ID credential not recognized on this account.' },
                { status: 401 }
            )
        }

        const rpConfig = getRpConfig(req)

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challengeData.challenge,
            expectedOrigin: rpConfig.expectedOrigins,
            expectedRPID: rpConfig.rpID,
            credential: {
                id: passkey.id,
                publicKey: passkey.publicKey,
                counter: Number(passkey.counter),
                transports: parseTransports(passkey.transports),
            },
            requireUserVerification: true,
        })

        if (!verification.verified) {
            return NextResponse.json({ error: 'Biometric verification failed' }, { status: 400 })
        }

        await prisma.passkey.update({
            where: { id: passkey.id },
            data: {
                counter: BigInt(verification.authenticationInfo.newCounter),
                lastUsedAt: new Date(),
            },
        })

        await clearWebAuthnChallenge()

        await login({
            id: passkey.user.id,
            username: passkey.user.username,
        })

        return NextResponse.json({
            success: true,
            user: {
                id: passkey.user.id,
                username: passkey.user.username,
            },
        })
    } catch (err: unknown) {
        console.error('WebAuthn login-verify error:', err)
        const message = err instanceof Error ? err.message : 'Authentication verification failed'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
