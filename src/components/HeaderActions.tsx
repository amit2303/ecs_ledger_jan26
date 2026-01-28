'use client'

import { LogOut, Key } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function HeaderActions() {
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.refresh()
        router.push('/login')
    }

    return (
        <div className="flex items-center gap-2">
            <Link
                href="/change-password"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                title="Change Password"
            >
                <Key className="w-5 h-5 rotate-90" />
            </Link>
            <button
                onClick={handleLogout}
                className="p-2 text-red-400 hover:text-red-500 rounded-full transition-colors"
                title="Sign Out"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
    )
}
