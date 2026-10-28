'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'
import { FaceIDIcon } from '@/components/FaceIDIcon'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [faceIDLoading, setFaceIDLoading] = useState(false)
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(true)

    useEffect(() => {
        // Retrieve remembered username
        try {
            const savedUser = localStorage.getItem('ecs_last_user')
            if (savedUser) {
                setUsername(savedUser)
            }
        } catch {
            // Ignore localStorage errors
        }

        // Check if WebAuthn is supported
        if (typeof window !== 'undefined') {
            const isSupported = Boolean(window.PublicKeyCredential)
            setSupportsWebAuthn(isSupported)
        }
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })

            if (res.ok) {
                try {
                    localStorage.setItem('ecs_last_user', username)
                } catch {
                    // Ignore
                }
                window.location.href = '/'
            } else {
                const data = await res.json()
                setError(data.error || 'Login failed')
            }
        } catch {
            setError('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const handleFaceIDLogin = async () => {
        setFaceIDLoading(true)
        setError('')

        try {
            // 1. Fetch authentication options
            const optionsRes = await fetch('/api/auth/webauthn/login-options', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() || undefined }),
            })

            if (!optionsRes.ok) {
                const errData = await optionsRes.json()
                throw new Error(errData.error || 'Failed to initialize Face ID sign-in')
            }

            const options = await optionsRes.json()

            // 2. Start biometric prompt
            const authResponse = await startAuthentication({ optionsJSON: options })

            // 3. Verify response on server
            const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authResponse),
            })

            const verifyData = await verifyRes.json()

            if (verifyRes.ok && verifyData.success) {
                if (verifyData.user?.username) {
                    try {
                        localStorage.setItem('ecs_last_user', verifyData.user.username)
                    } catch {
                        // Ignore
                    }
                }
                window.location.href = '/'
            } else {
                setError(verifyData.error || 'Face ID verification failed. Please sign in with password.')
            }
        } catch (err: unknown) {
            const errorObj = err as Error
            if (errorObj.name === 'NotAllowedError') {
                // User cancelled the prompt
                return
            }
            console.error('Face ID sign-in error:', err)
            setError(errorObj.message || 'Face ID sign-in failed. Please sign in with password.')
        } finally {
            setFaceIDLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F2F2F7' }}>
            <div className="w-full max-w-sm space-y-6">
                {/* Logo & Title */}
                <div className="text-center">
                    <div
                        className="w-24 h-24 mx-auto mb-4 rounded-[22px] overflow-hidden"
                        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    >
                        <img src="/logo.jpg" alt="ECS" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">ECS Ledger</h1>
                    <p className="text-[15px] text-ios-gray mt-1">Financial Dashboard</p>
                </div>

                {error && (
                    <div
                        className="ios-card p-3 text-center text-[14px] text-ios-red font-medium leading-snug"
                        style={{ backgroundColor: 'rgba(255,59,48,0.08)' }}
                    >
                        {error}
                    </div>
                )}

                {/* Primary Face ID Quick Login Button (if supported) */}
                {supportsWebAuthn && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={handleFaceIDLogin}
                            disabled={faceIDLoading || loading}
                            className="w-full py-3.5 px-4 bg-white text-gray-900 text-[17px] font-semibold rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-black/5 flex items-center justify-center gap-3 ios-press disabled:opacity-50 transition-all hover:bg-gray-50 active:scale-[0.98]"
                        >
                            {faceIDLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin text-ios-blue" />
                                    <span>Scanning Face ID...</span>
                                </>
                            ) : (
                                <>
                                    <FaceIDIcon className="w-6 h-6 text-ios-blue" />
                                    <span>Sign in with Face ID</span>
                                </>
                            )}
                        </button>

                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-gray-300 w-full" />
                            <span className="bg-[#F2F2F7] px-3 text-[13px] text-ios-gray font-medium uppercase tracking-wider">
                                or password
                            </span>
                        </div>
                    </div>
                )}

                {/* Standard Username/Password Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="ios-card overflow-hidden">
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                            <label className="text-[13px] text-ios-gray block mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
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
                                    onChange={(e) => setPassword(e.target.value)}
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
                        disabled={loading || faceIDLoading}
                        className="w-full py-[14px] bg-ios-blue text-white text-[17px] font-semibold rounded-2xl ios-press disabled:opacity-50 active:scale-[0.98] transition-all"
                    >
                        {loading ? 'Signing in...' : 'Sign In with Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
