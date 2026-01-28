'use client'

import { usePathname } from 'next/navigation'
import { HeaderActions } from '@/components/HeaderActions'

export function GlobalHeader() {
    const pathname = usePathname()

    // Hide header on company detail pages /companies/[id]
    // We check if the path starts with /companies/ and has an ID (not just /companies)
    // Actually, better regex or logic:
    // If it matches /companies/[digits] exactly or with sub-routes that are NOT 'new' (though 'new' might want a header? No, 'new' is usually a modal or page. Let's assume detail page hides it.)
    // The user requirement said: "global header... hidden on the Company Detail page".
    // Company detail page is `/companies/[id]`.

    // Let's hide it for any route under /companies/ except maybe the main one if it existed, but companies list is on home /.
    // So if pathname starts with /companies/, hide it.
    // Wait, what about /companies/new? If that's a page, does it need a Global Header? 
    // The previous analysis suggests /companies/[id]/page.tsx is the detail page.
    // Let's just hide it for any path starting with /companies/ for now to be safe and "immersive".

    if (pathname?.startsWith('/companies/') || pathname === '/login') {
        return null
    }

    return (
        <header className="px-5 py-4 bg-white border-b border-gray-100 shrink-0 flex items-center gap-3 z-30">
            <div className="w-14 h-14 relative">
                <img src="/logo.jpg" alt="ECS Logo" className="w-full h-full object-contain" />
            </div>
            <div>
                <h1 className="text-base font-bold text-ecs-blue leading-none whitespace-nowrap">Expert Consultancy Services</h1>
                <p className="text-xs text-gray-500 mt-0.5">Financial Dashboard</p>
            </div>
            <div className="flex-1"></div>
            <HeaderActions />
        </header>
    )
}
