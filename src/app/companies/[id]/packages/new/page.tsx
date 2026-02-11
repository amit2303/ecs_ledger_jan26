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
        <div className="flex flex-col h-full bg-gray-50">
            <header className="px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3">
                <Link href={`/companies/${id}`} className="p-1 -ml-1 text-gray-500 hover:text-gray-900">
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold text-ecs-blue">Add Package</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white p-4 space-y-4 border-b border-gray-100">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Date</label>
                        <input required type="date" className="w-full px-3 py-2 border border-blue-100 rounded-lg outline-none focus:ring-2 focus:ring-ecs-blue"
                            value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Package Name</label>
                        <input required autoFocus type="text" className="w-full px-3 py-2 border border-blue-100 rounded-lg outline-none focus:ring-2 focus:ring-ecs-blue"
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                <div className="px-4">
                    <button disabled={loading} type="submit" className="w-full py-3.5 bg-ecs-blue text-white font-bold rounded-xl shadow-lg active:scale-[98%] transition-transform disabled:opacity-70">
                        {loading ? 'Saving...' : 'Save Package'}
                    </button>
                </div>
            </form>
        </div>
    )
}
