'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        if (!newPassword && !newUsername) {
            setError('Please enter a new username or password')
            setLoading(false)
            return
        }

        if (newPassword && newPassword !== confirmPassword) {
            setError('New passwords do not match')
            setLoading(false)
            return
        }

        if (newPassword && newPassword.length < 6) {
            setError('Password must be at least 6 characters')
            setLoading(false)
            return
        }

        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword,
                    newPassword: newPassword || undefined,
                    newUsername: newUsername || undefined
                })
            })

            if (res.ok) {
                setSuccess('Credentials updated successfully! Redirecting...')
                setTimeout(() => router.push('/'), 2000)
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to update credentials')
            }
        } catch (err) {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <header className="px-4 py-4 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3">
                <Link href="/" className="p-1 -ml-1 text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold text-ecs-blue">Update Credentials</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white p-4 space-y-4 border-b border-gray-100">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-50 text-green-600 text-xs p-3 rounded-lg">
                            {success}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Password (Required)</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ecs-blue transition-all"
                            required
                            placeholder="Required to make changes"
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100 my-4"></div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Username (Optional)</label>
                        <input
                            type="text"
                            value={newUsername}
                            onChange={e => setNewUsername(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ecs-blue transition-all"
                            placeholder="Leave empty to keep current"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">New Password (Optional)</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ecs-blue transition-all"
                            placeholder="Leave empty to keep current"
                        />
                    </div>

                    {newPassword && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ecs-blue transition-all"
                                required
                            />
                        </div>
                    )}
                </div>

                <div className="px-4 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-ecs-blue text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    )
}
