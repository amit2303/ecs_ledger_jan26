'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            if (res.ok) {
                // Use replace to prevent back button returning to login
                // and use window.location for a full page refresh to ensure cookie is recognized
                window.location.href = '/'
            } else {
                const data = await res.json()
                setError(data.error || 'Login failed')
            }
        } catch (err) {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F2F2F7' }}>
            <div className="w-full max-w-sm space-y-8">
                {/* Logo & Title */}
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-5 rounded-[22px] overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                        <img src="/logo.jpg" alt="ECS" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">ECS Ledger</h1>
                    <p className="text-[15px] text-ios-gray mt-1">Financial Dashboard</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="ios-card p-3 text-center text-[15px] text-ios-red font-medium" style={{ backgroundColor: 'rgba(255,59,48,0.08)' }}>
                            {error}
                        </div>
                    )}

                    <div className="ios-card overflow-hidden">
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                placeholder="Enter username"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <div className="px-4 py-3">
                            <label className="text-[13px] text-ios-gray block mb-1">Password</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="flex-1 text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-ios-gray active:opacity-60 p-1"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-[14px] bg-ios-blue text-white text-[17px] font-semibold rounded-2xl ios-press disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    )
}
