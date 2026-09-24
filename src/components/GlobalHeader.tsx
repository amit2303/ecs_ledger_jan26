'use client'

import { usePathname } from 'next/navigation'
import { HeaderActions } from '@/components/HeaderActions'

function getHeaderInfo(pathname: string | null) {
    if (!pathname) return { title: 'ECS Ledger', subtitle: 'Financial Dashboard' }

    if (pathname.startsWith('/quotations')) {
        return { title: 'Quotations', subtitle: 'Estimates & Proposals' }
    }
    if (pathname.startsWith('/ecs-ledger')) {
        return { title: 'Clients Ledger', subtitle: 'Company Accounts & Balances' }
    }
    if (pathname.startsWith('/expert-hisab')) {
        return { title: 'Company Ledger', subtitle: 'Financial Dashboard' }
    }
    if (pathname.startsWith('/employee-payments')) {
        return { title: 'Employee', subtitle: 'Salaries & Advances' }
    }
    if (pathname.startsWith('/drive')) {
        return { title: 'ECS Data', subtitle: 'Cloud Documents & Files' }
    }
    if (pathname.startsWith('/add-company')) {
        return { title: 'Add Company', subtitle: 'New Client Account' }
    }
    if (pathname.startsWith('/change-password')) {
        return { title: 'Security', subtitle: 'Change Password' }
    }

    return { title: 'ECS Ledger', subtitle: 'Financial Dashboard' }
}

export function GlobalHeader() {
    const pathname = usePathname()

    // Hide header on company detail pages, transactions chat, and login
    if (pathname?.startsWith('/companies/') || pathname === '/transactions' || pathname === '/login') {
        return null
    }

    const { title, subtitle } = getHeaderInfo(pathname)

    return (
        <header className="sticky top-0 z-40 bg-[#F9F9F9]  border-b border-black/5 shrink-0 pt-safe transition-colors duration-300">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-white">
                    <img src="/logo.jpg" alt="ECS Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-[17px] font-semibold text-gray-900 leading-tight tracking-tight">{title}</h1>
                    <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>
                </div>
                <HeaderActions />
            </div>
        </header>
    )
}
