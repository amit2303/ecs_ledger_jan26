'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddCompany() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        type: 'CLIENT',
        address: '',
        ledgerLink: '',
        director: '',
        contact: '',
        email: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
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
        <div className="flex flex-col h-full bg-gray-50">
            <header className="px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3 shrink-0">
                <Link href="/" className="p-1 -ml-1 text-gray-500 hover:text-gray-900">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold text-ecs-blue">Add New Company</h1>
            </header>

            <div className="flex-1 p-4">
                <form id="add-company-form" onSubmit={handleSubmit} className="space-y-4 pb-20">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Type</label>
                            <div className="flex gap-2">
                                <label className={`flex-1 py-2 text-center text-sm font-medium rounded-lg border cursor-pointer transition-colors ${formData.type === 'CLIENT' ? 'bg-blue-50 border-blue-200 text-ecs-blue' : 'border-gray-200 text-gray-600'}`}>
                                    <input type="radio" name="type" className="hidden" checked={formData.type === 'CLIENT'} onChange={() => setFormData({ ...formData, type: 'CLIENT' })} />
                                    Client
                                </label>
                                <label className={`flex-1 py-2 text-center text-sm font-medium rounded-lg border cursor-pointer transition-colors ${formData.type === 'VENDOR' ? 'bg-red-50 border-red-200 text-ecs-red' : 'border-gray-200 text-gray-600'}`}>
                                    <input type="radio" name="type" className="hidden" checked={formData.type === 'VENDOR'} onChange={() => setFormData({ ...formData, type: 'VENDOR' })} />
                                    Vendor
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Company Name</label>
                            <input required type="text" className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-ecs-gold outline-none"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ledger Link</label>
                            <input type="text" className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-ecs-gold outline-none"
                                value={formData.ledgerLink} onChange={e => setFormData({ ...formData, ledgerLink: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Director Name</label>
                            <input type="text" className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-ecs-gold outline-none"
                                value={formData.director} onChange={e => setFormData({ ...formData, director: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Details</label>
                            <input type="text" className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-ecs-gold outline-none"
                                value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                            <input type="email" className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-ecs-gold outline-none"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Address</label>
                            <textarea rows={3} className="w-full px-3 py-2 border border-blue-100 rounded-lg focus:ring-2 focus:ring-ecs-gold outline-none resize-none"
                                value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </div>

            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl bg-white border-t border-gray-100 p-4 pointer-events-auto">
                    <button
                        form="add-company-form"
                        disabled={loading}
                        type="submit"
                        className="w-full py-3.5 bg-ecs-blue text-white font-bold rounded-xl shadow-lg active:scale-[98%] transition-transform disabled:opacity-70"
                    >
                        {loading ? 'Creating...' : 'Create Company'}
                    </button>
                </div>
            </div>
        </div>
    )
}
