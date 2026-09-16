'use client'

import { usePathname } from 'next/navigation'
import { HeaderActions } from '@/components/HeaderActions'

export function GlobalHeader() {
    const pathname = usePathname()

    // Hide header on company detail pages and login
    if (pathname?.startsWith('/companies/') || pathname === '/login') {
        return null
    }

    return (
        <header className="ios-navbar shrink-0 z-30">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                    <img src="/logo.jpg" alt="ECS Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[17px] font-semibold text-gray-900 leading-tight tracking-tight">ECS Ledger</h1>
                    <p className="text-[13px] text-ios-gray mt-0.5">Financial Dashboard</p>
                </div>
                <HeaderActions />
            </div>
        </header>
    )
}
