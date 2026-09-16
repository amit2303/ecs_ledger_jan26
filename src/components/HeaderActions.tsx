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
        <div className="flex items-center gap-1">
            <Link
                href="/change-password"
                className="p-2 text-ios-blue rounded-full transition-colors active:bg-ios-gray5"
                title="Change Password"
            >
                <Key className="w-[22px] h-[22px] rotate-90" />
            </Link>
            <button
                onClick={handleLogout}
                className="p-2 text-ios-red rounded-full transition-colors active:bg-ios-gray5"
                title="Sign Out"
            >
                <LogOut className="w-[22px] h-[22px]" />
            </button>
        </div>
    )
}
