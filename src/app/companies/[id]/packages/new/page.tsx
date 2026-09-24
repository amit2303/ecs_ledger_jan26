'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddPackage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: Number(id),
                    ...formData
                })
            })
            if (res.ok) {
                router.push(`/companies/${id}`)
                router.refresh()
            } else {
                alert('Failed to add package')
            }
        } catch (error) {
            console.error(error)
            alert('Error adding package')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F2F7' }}>
            {/* iOS Nav Bar */}
            <header className="ios-navbar shrink-0 z-10">
                <div className="flex items-center gap-1 px-1 py-2">
                    <Link href={`/companies/${id}`} className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2">
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </Link>
                    <div className="flex-1 text-center">
                        <h1 className="text-[17px] font-semibold text-gray-900">New Package</h1>
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto ios-scroll px-4 pt-4 pb-44">
                <form id="add-package-form" onSubmit={handleSubmit}>
                    <div className="ios-card overflow-hidden">
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="px-4 py-3">
                            <label className="text-[13px] text-ios-gray block mb-1">Package Name</label>
                            <input
                                required
                                autoFocus
                                type="text"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="Enter package name"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </div>

            {/* Bottom Button above BottomNav */}
            <div 
                className="fixed left-0 right-0 mx-auto w-full max-w-md lg:max-w-lg xl:max-w-xl px-4 pointer-events-none z-40"
                style={{ bottom: 'calc(56px + max(8px, env(safe-area-inset-bottom, 8px)) + 10px)' }}
            >
                <button
                    form="add-package-form"
                    disabled={loading}
                    type="submit"
                    className="w-full py-[14px] bg-ios-blue text-white text-[16px] font-semibold rounded-2xl shadow-[0_4px_16px_rgba(0,122,255,0.35)] ios-press pointer-events-auto disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                    {loading ? 'Saving...' : 'Save Package'}
                </button>
            </div>
        </div>
    )
}
