import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public paths that don't require auth
    const publicPaths = ['/login', '/api/auth/login', '/api/auth/signup', '/logo.jpg']
    if (publicPaths.some(path => pathname.startsWith(path)) ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static')) {
        return NextResponse.next()
    }

    // Check for session
    const cookie = request.cookies.get('auth_token')
    const session = await decrypt(cookie?.value || '')

    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
