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
            <header className="px-5 py-3 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3 shrink-0">
                <Link href="/" className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-lg font-bold text-gray-900">Update Credentials</h1>
            </header>

            <div className="flex-1 overflow-y-auto ios-scroll px-2 pt-2 pb-24">
                <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-white p-3 space-y-4 rounded-xl shadow-sm border border-gray-100">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg font-medium">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 text-green-600 text-xs p-3 rounded-lg font-medium">
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Current Password</label>
                            <input
                                required
                                type="password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                placeholder="Required to make changes"
                            />
                        </div>

                        <div className="pt-2 border-t border-gray-50 my-4"></div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">New Username</label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                placeholder="Leave empty to keep current"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                placeholder="Leave empty to keep current"
                            />
                        </div>

                        {newPassword && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Confirm New Password</label>
                                <input
                                    required
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-100 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-blue outline-none transition-all font-medium text-gray-900"
                                />
                            </div>
                        )}
                    </div>
                </form>
            </div>

            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl bg-white border-t border-gray-100 p-4 pointer-events-auto">
                    <button
                        form="change-password-form"
                        disabled={loading}
                        type="submit"
                        className="w-full py-3.5 bg-ecs-blue text-white font-bold rounded-xl shadow-lg active:scale-[98%] transition-transform disabled:opacity-70"
                    >
                        {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
