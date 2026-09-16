'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
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
        <div className="flex flex-col h-full" style={{ backgroundColor: '#F2F2F7' }}>
            {/* iOS Nav Bar */}
            <header className="ios-navbar shrink-0 z-10">
                <div className="flex items-center gap-1 px-1 py-2">
                    <Link href="/" className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2">
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </Link>
                    <div className="flex-1 text-center">
                        <h1 className="text-[17px] font-semibold text-gray-900">Update Credentials</h1>
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto ios-scroll px-4 pt-4 pb-28">
                <form id="change-password-form" onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="ios-card p-3 text-center text-[15px] text-ios-red font-medium" style={{ backgroundColor: 'rgba(255,59,48,0.08)' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="ios-card p-3 text-center text-[15px] text-ios-green font-medium" style={{ backgroundColor: 'rgba(52,199,89,0.08)' }}>
                            {success}
                        </div>
                    )}

                    {/* Current Password */}
                    <div>
                        <p className="ios-section-label px-0 mb-2">Verification</p>
                        <div className="ios-card overflow-hidden">
                            <div className="px-4 py-3">
                                <label className="text-[13px] text-ios-gray block mb-1">Current Password</label>
                                <input
                                    required
                                    type="password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Required to make changes"
                                />
                            </div>
                        </div>
                    </div>

                    {/* New Credentials */}
                    <div>
                        <p className="ios-section-label px-0 mb-2">New Credentials</p>
                        <div className="ios-card overflow-hidden">
                            <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                                <label className="text-[13px] text-ios-gray block mb-1">New Username</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Leave empty to keep current"
                                />
                            </div>
                            <div className="px-4 py-3" style={{ borderBottom: newPassword ? '0.5px solid rgba(60,60,67,0.12)' : 'none' }}>
                                <label className="text-[13px] text-ios-gray block mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Leave empty to keep current"
                                />
                            </div>
                            {newPassword && (
                                <div className="px-4 py-3 ios-scale-in">
                                    <label className="text-[13px] text-ios-gray block mb-1">Confirm Password</label>
                                    <input
                                        required
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                        placeholder="Re-enter new password"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Bottom Button */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl p-4 pointer-events-auto safe-area-bottom" style={{ backgroundColor: 'rgba(242,242,247,0.9)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '0.5px solid rgba(60,60,67,0.12)' }}>
                    <button
                        form="change-password-form"
                        disabled={loading}
                        type="submit"
                        className="w-full py-[14px] bg-ios-blue text-white text-[17px] font-semibold rounded-2xl ios-press disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
