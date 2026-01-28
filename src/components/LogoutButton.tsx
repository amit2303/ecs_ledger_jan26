'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.refresh()
        router.push('/login')
    }

    return (
        <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
            title="Sign Out"
        >
            <LogOut className="w-5 h-5" />
        </button>
    )
}
