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
            <header className="px-5 py-3 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3 shrink-0">
                <Link href="/" className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-medium text-gray-900">Add New Company</h1>
            </header>

            <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24">
                <form id="add-company-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-white p-3 space-y-4 rounded-xl shadow-sm border border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Company Type</label>
                            <div className="flex gap-2">
                                <label className={`flex-1 py-2.5 text-center text-sm font-medium rounded-lg border cursor-pointer transition-all ${formData.type === 'CLIENT' ? 'bg-blue-50 border-blue-200 text-ecs-blue ring-2 ring-blue-50' : 'border-gray-100 text-gray-500'}`}>
                                    <input type="radio" name="type" className="hidden" checked={formData.type === 'CLIENT'} onChange={() => setFormData({ ...formData, type: 'CLIENT' })} />
                                    Client
                                </label>
                                <label className={`flex-1 py-2.5 text-center text-sm font-medium rounded-lg border cursor-pointer transition-all ${formData.type === 'VENDOR' ? 'bg-red-50 border-red-200 text-ecs-red ring-2 ring-red-50' : 'border-gray-100 text-gray-500'}`}>
                                    <input type="radio" name="type" className="hidden" checked={formData.type === 'VENDOR'} onChange={() => setFormData({ ...formData, type: 'VENDOR' })} />
                                    Vendor
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Company Name</label>
                            <input required type="text" className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Ledger Link</label>
                            <input type="text" className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.ledgerLink} onChange={e => setFormData({ ...formData, ledgerLink: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Director Name</label>
                            <input type="text" className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.director} onChange={e => setFormData({ ...formData, director: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Contact Details</label>
                            <input type="text" className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Email</label>
                            <input type="email" className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Address</label>
                            <textarea rows={3} className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900 resize-none"
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
                        className="w-full py-3.5 bg-ecs-blue text-white font-medium rounded-xl shadow-lg active:scale-[98%] transition-transform disabled:opacity-70"
                    >
                        {loading ? 'Creating...' : 'Create Company'}
                    </button>
                </div>
            </div>
        </div>
    )
}
