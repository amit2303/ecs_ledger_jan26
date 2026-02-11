'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddPayment({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    })

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/payments', {
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
                alert('Failed to add payment')
            }
        } catch (error) {
            console.error(error)
            alert('Error adding payment')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <header className="px-5 py-3 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3 shrink-0">
                <Link href={`/companies/${id}`} className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-medium text-gray-900">Add Payment</h1>
            </header>

            <div className="flex-1 overflow-y-auto ios-scroll px-2 pt-2 pb-24">
                <form id="add-payment-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-white p-3 space-y-4 rounded-xl shadow-sm border border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Amount</label>
                            <input
                                autoFocus
                                required
                                type="number"
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-lg text-green-600"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1.5 tracking-wider">Description</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </div>

            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl bg-white border-t border-gray-100 p-4 pointer-events-auto">
                    <button
                        form="add-payment-form"
                        disabled={loading}
                        type="submit"
                        className="w-full py-3.5 bg-green-600 text-white font-medium rounded-xl shadow-lg active:scale-[98%] transition-transform disabled:opacity-70"
                    >
                        {loading ? 'Saving...' : 'Save Payment'}
                    </button>
                </div>
            </div>
        </div>
    )
}
