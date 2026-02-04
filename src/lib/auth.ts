import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: Record<string, unknown>) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(key)
}

export async function decrypt(input: string): Promise<Record<string, unknown> | null> {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        })
        return payload
    } catch {
        return null
    }
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('auth_token')?.value
    if (!session) return null
    return await decrypt(session)
}

export async function login(userData: { id: number; username: string }) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const session = await encrypt({ user: userData, expires })
    const cookieStore = await cookies()

    cookieStore.set('auth_token', session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    })
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('auth_token')
}
