import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getRpConfig, getWebAuthnChallenge, clearWebAuthnChallenge } from '@/lib/webauthn'

interface RegisterVerifyRequestBody {
    response: RegistrationResponseJSON
    deviceName?: string
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession()
        const sessionUser = session?.user as { id: number; username: string } | undefined
        if (!sessionUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const challengeData = await getWebAuthnChallenge()
        if (!challengeData || challengeData.userId !== sessionUser.id) {
            return NextResponse.json(
                { error: 'Registration session expired or invalid. Please try again.' },
                { status: 400 }
            )
        }

        const body: RegisterVerifyRequestBody = await req.json()
        if (!body?.response) {
            return NextResponse.json({ error: 'Missing registration response' }, { status: 400 })
        }

        const rpConfig = getRpConfig(req)

        const verification = await verifyRegistrationResponse({
            response: body.response,
            expectedChallenge: challengeData.challenge,
            expectedOrigin: rpConfig.expectedOrigins,
            expectedRPID: rpConfig.rpID,
            requireUserVerification: true,
        })

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json({ error: 'Biometric verification failed' }, { status: 400 })
        }

        const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

        await prisma.passkey.upsert({
            where: { id: credential.id },
            update: {
                publicKey: Buffer.from(credential.publicKey),
                counter: BigInt(credential.counter),
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp,
                transports: credential.transports ? credential.transports.join(',') : null,
                name: body.deviceName?.trim() || 'Face ID / Touch ID Device',
                lastUsedAt: new Date(),
            },
            create: {
                id: credential.id,
                userId: sessionUser.id,
                publicKey: Buffer.from(credential.publicKey),
                counter: BigInt(credential.counter),
                deviceType: credentialDeviceType,
                backedUp: credentialBackedUp,
                transports: credential.transports ? credential.transports.join(',') : null,
                name: body.deviceName?.trim() || 'Face ID / Touch ID Device',
            },
        })

        await clearWebAuthnChallenge()

        return NextResponse.json({
            success: true,
            message: 'Face ID / Touch ID registered successfully',
        })
    } catch (err: unknown) {
        console.error('WebAuthn register-verify error:', err)
        const message = err instanceof Error ? err.message : 'Registration verification failed'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
