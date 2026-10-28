import { cookies } from 'next/headers'
import type { AuthenticatorTransport } from '@simplewebauthn/server'

export interface WebAuthnConfig {
    rpName: string
    rpID: string
    origin: string
}

export function getRpConfig(req?: Request): WebAuthnConfig {
    let host = 'localhost:3000'
    let proto = 'http'

    if (req) {
        const forwardedHost = req.headers.get('x-forwarded-host')
        const headerHost = req.headers.get('host')
        host = forwardedHost || headerHost || 'localhost:3000'

        const forwardedProto = req.headers.get('x-forwarded-proto')
        if (forwardedProto) {
            proto = forwardedProto
        } else if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
            proto = 'http'
        } else {
            proto = 'https'
        }
    }

    const hostname = host.split(':')[0]
    const rpID = process.env.WEBAUTHN_RP_ID || hostname
    const origin = process.env.WEBAUTHN_ORIGIN || `${proto}://${host}`

    return {
        rpName: 'ECS Ledger',
        rpID,
        origin,
    }
}

export interface WebAuthnChallengeSession {
    challenge: string
    userId?: number
    username?: string
    exp: number
}

const CHALLENGE_COOKIE_NAME = 'webauthn_challenge'

export async function setWebAuthnChallenge(data: { challenge: string; userId?: number; username?: string }) {
    const cookieStore = await cookies()
    const payload: WebAuthnChallengeSession = {
        challenge: data.challenge,
        userId: data.userId,
        username: data.username,
        exp: Date.now() + 5 * 60 * 1000, // 5 minutes validity
    }

    cookieStore.set(CHALLENGE_COOKIE_NAME, JSON.stringify(payload), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300,
        path: '/',
    })
}

export async function getWebAuthnChallenge(): Promise<WebAuthnChallengeSession | null> {
    const cookieStore = await cookies()
    const raw = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw) as WebAuthnChallengeSession
        if (Date.now() > parsed.exp) {
            return null
        }
        return parsed
    } catch {
        return null
    }
}

export async function clearWebAuthnChallenge() {
    const cookieStore = await cookies()
    cookieStore.delete(CHALLENGE_COOKIE_NAME)
}

export function parseTransports(transports?: string | null): AuthenticatorTransport[] | undefined {
    if (!transports) return undefined
    return transports.split(',').map((t) => t.trim()) as AuthenticatorTransport[]
}
