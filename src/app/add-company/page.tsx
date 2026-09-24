'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddCompany() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        diaryNumber: '',
        name: '',
        type: 'CLIENT',
        address: '',
        director: '',
        contact: '',
        email: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const finalName = formData.diaryNumber.trim()
                ? `${formData.diaryNumber.trim()}.  ${formData.name.trim()}`
                : formData.name.trim()

            const res = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: finalName,
                    type: formData.type,
                    address: formData.address,
                    director: formData.director,
                    contact: formData.contact,
                    email: formData.email
                })
            })
            if (res.ok) {
                router.push('/')
                router.refresh()
            } else {
                alert('Failed to create company')
            }
        } catch (error) {
            console.error(error)
            alert('Error creating company')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F2F7' }}>
            {/* iOS Nav Bar */}
            <header className="ios-navbar shrink-0 z-10">
                <div className="flex items-center gap-1 px-1 py-2">
                    <button 
                        type="button"
                        onClick={() => router.back()} 
                        className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2"
                    >
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </button>
                    <div className="flex-1 text-center">
                        <h1 className="text-[17px] font-semibold text-gray-900">New Company</h1>
                    </div>
                    <div className="w-16" /> {/* Spacer for centering */}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto ios-scroll px-4 pt-4 pb-44">
                <form id="add-company-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Type Selector — iOS Segmented Control */}
                    <div>
                        <p className="ios-section-label px-0 mb-2">Company Type</p>
                        <div className="ios-segmented">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'CLIENT' })}
                                className={`ios-segmented-btn ${formData.type === 'CLIENT' ? 'active' : ''}`}
                            >
                                Client
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'VENDOR' })}
                                className={`ios-segmented-btn ${formData.type === 'VENDOR' ? 'active' : ''}`}
                            >
                                Vendor
                            </button>
                        </div>
                    </div>

                    {/* Form Fields — iOS Grouped Inset */}
                    <div className="ios-card overflow-hidden">
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Diary Number</label>
                            <input
                                type="text"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="e.g. 1"
                                value={formData.diaryNumber}
                                onChange={e => setFormData({ ...formData, diaryNumber: e.target.value })}
                            />
                        </div>
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">
                                {formData.type === 'VENDOR' ? 'Vendor Name' : 'Company Name'}
                            </label>
                            <input
                                required
                                type="text"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="Enter name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Director Name</label>
                            <input
                                type="text"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="Enter name"
                                value={formData.director}
                                onChange={e => setFormData({ ...formData, director: e.target.value })}
                            />
                        </div>
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Contact</label>
                            <input
                                type="text"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="Phone number"
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="email@example.com"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="px-4 py-3">
                            <label className="text-[13px] text-ios-gray block mb-1">Address</label>
                            <textarea
                                rows={2}
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none resize-none placeholder:text-ios-gray3"
                                placeholder="Enter address"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                    form="add-company-form"
                    disabled={loading}
                    type="submit"
                    className="w-full py-[14px] bg-ios-blue text-white text-[16px] font-semibold rounded-2xl shadow-[0_4px_16px_rgba(0,122,255,0.35)] ios-press pointer-events-auto disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                    {loading ? 'Creating...' : 'Create Company'}
                </button>
            </div>
        </div>
    )
}
