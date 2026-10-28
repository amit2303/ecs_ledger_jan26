'use client'

import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

interface ProtectedSectionProps {
    children: React.ReactNode
    sectionName: string
    sectionSubtitle?: string
}

export function lockProtectedSections() {
    try {
        sessionStorage.removeItem('hisab_kitab_unlocked')
    } catch (e) {
        console.error(e)
    }
}

export function ProtectedSection({
    children,
    sectionName,
    sectionSubtitle,
}: ProtectedSectionProps) {
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [authLoading, setAuthLoading] = useState(false)
    const [passcode, setPasscode] = useState('')
    const [showPasscode, setShowPasscode] = useState(false)
    const [authError, setAuthError] = useState('')
    const [isShaking, setIsShaking] = useState(false)

    useEffect(() => {
        try {
            const saved = sessionStorage.getItem('hisab_kitab_unlocked')
            if (saved === 'true') {
                setIsUnlocked(true)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsCheckingAuth(false)
        }
    }, [])

    const verifyPasscodeServer = async (code: string) => {
        if (authLoading) return
        try {
            setAuthLoading(true)
            setAuthError('')
            const res = await fetch('/api/expert-hisab/verify-passcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: code }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setIsUnlocked(true)
                setAuthError('')
                try {
                    sessionStorage.setItem('hisab_kitab_unlocked', 'true')
                } catch (e) {
                    console.error(e)
                }
            } else {
                setAuthError(data.error || 'Incorrect password')
                setIsShaking(true)
                setTimeout(() => setIsShaking(false), 500)
                setPasscode('')
            }
        } catch {
            setAuthError('Connection error, try again')
            setIsShaking(true)
            setTimeout(() => setIsShaking(false), 500)
        } finally {
            setAuthLoading(false)
        }
    }

    const handlePasscodeChange = (val: string) => {
        const cleaned = val.replace(/\D/g, '').slice(0, 6)
        setPasscode(cleaned)
        if (cleaned.length === 6) {
            verifyPasscodeServer(cleaned)
        }
    }

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault()
        if (passcode.length >= 1) {
            verifyPasscodeServer(passcode)
        }
    }

    if (isCheckingAuth) {
        return (
            <div className="flex-1 w-full min-h-[70vh] flex items-center justify-center bg-[#F2F2F7]">
                <div className="text-gray-500 text-[14px] bg-white px-5 py-3 rounded-full shadow-sm border border-black/5 font-medium animate-pulse">
                    Checking access...
                </div>
            </div>
        )
    }

    if (!isUnlocked) {
        return (
            <div className="flex-1 w-full min-h-[70vh] flex flex-col items-center justify-center px-4 py-8 bg-[#F2F2F7] select-none">
                <div
                    className={`w-full max-w-sm bg-white rounded-3xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-black/5 space-y-4 text-center ${
                        isShaking ? 'animate-shake' : ''
                    }`}
                >
                    <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto text-[#007AFF]">
                        <Lock className="w-7 h-7 stroke-[2.2]" />
                    </div>

                    <div>
                        <h2 className="text-[18px] font-bold text-gray-950 tracking-tight">
                            Enter password to unlock {sectionName}
                        </h2>
                        <p className="text-[13px] text-gray-500 mt-1">
                            {sectionSubtitle || `${sectionName} is protected`}
                        </p>
                    </div>

                    <form onSubmit={handleUnlock} className="space-y-3 pt-1">
                        <div className="relative">
                            <input
                                type={showPasscode ? 'text' : 'password'}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={passcode}
                                onChange={(e) => handlePasscodeChange(e.target.value)}
                                placeholder="Enter password"
                                className="w-full text-center tracking-[0.2em] text-[18px] font-bold py-3.5 px-9 bg-[#F2F2F7] border border-black/10 rounded-2xl text-gray-900 placeholder:tracking-normal placeholder:text-[14px] placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40 focus:border-[#007AFF] transition-all"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasscode(!showPasscode)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {authError && (
                            <p className="text-[13px] font-semibold text-[#EF4444]">
                                {authError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={passcode.length < 1 || authLoading}
                            className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0066CC] disabled:opacity-50 text-white font-semibold rounded-2xl text-[16px] shadow-[0_4px_14px_rgba(0,122,255,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>{authLoading ? 'Verifying...' : 'Unlock'}</span>
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
