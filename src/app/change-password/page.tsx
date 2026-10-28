'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { startRegistration } from '@simplewebauthn/browser'
import { FaceIDIcon } from '@/components/FaceIDIcon'

interface PasskeyItem {
    id: string
    name: string | null
    deviceType: string
    createdAt: string
    lastUsedAt: string
}

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [newHisabPassword, setNewHisabPassword] = useState('')
    const [confirmHisabPassword, setConfirmHisabPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    // Biometric state
    const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
    const [loadingPasskeys, setLoadingPasskeys] = useState(true)
    const [registeringBiometric, setRegisteringBiometric] = useState(false)
    const [biometricError, setBiometricError] = useState('')
    const [biometricSuccess, setBiometricSuccess] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(true)

    const router = useRouter()

    const loadPasskeys = useCallback(async () => {
        try {
            setLoadingPasskeys(true)
            const res = await fetch('/api/auth/webauthn/passkeys')
            if (res.ok) {
                const data = await res.json()
                setPasskeys(data.passkeys || [])
            }
        } catch (err) {
            console.error('Failed to load passkeys:', err)
        } finally {
            setLoadingPasskeys(false)
        }
    }, [])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setSupportsWebAuthn(Boolean(window.PublicKeyCredential))
        }
        loadPasskeys()
    }, [loadPasskeys])

    const handleRegisterFaceID = async () => {
        setRegisteringBiometric(true)
        setBiometricError('')
        setBiometricSuccess('')

        try {
            // 1. Get registration options
            const optionsRes = await fetch('/api/auth/webauthn/register-options', {
                method: 'POST',
            })

            if (!optionsRes.ok) {
                const errData = await optionsRes.json()
                throw new Error(errData.error || 'Failed to initialize biometric registration')
            }

            const options = await optionsRes.json()

            // 2. Prompt Face ID / Touch ID enrollment
            const regResponse = await startRegistration({ optionsJSON: options })

            // Guess friendly name based on device
            let deviceName = 'Biometric Device'
            if (typeof navigator !== 'undefined') {
                const ua = navigator.userAgent
                if (/iPhone/.test(ua)) deviceName = 'iPhone (Face ID)'
                else if (/iPad/.test(ua)) deviceName = 'iPad (Face ID / Touch ID)'
                else if (/Macintosh/.test(ua)) deviceName = 'Mac (Touch ID)'
                else if (/Android/.test(ua)) deviceName = 'Android Device (Biometrics)'
                else if (/Windows/.test(ua)) deviceName = 'Windows PC (Hello Face/PIN)'
            }

            // 3. Verify on server
            const verifyRes = await fetch('/api/auth/webauthn/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: regResponse,
                    deviceName,
                }),
            })

            const verifyData = await verifyRes.json()
            if (verifyRes.ok && verifyData.success) {
                setBiometricSuccess('Face ID enabled! You can now use Face ID to sign in directly.')
                await loadPasskeys()
            } else {
                setBiometricError(verifyData.error || 'Failed to complete Face ID registration')
            }
        } catch (err: unknown) {
            const errorObj = err as Error
            if (errorObj.name === 'NotAllowedError') {
                setBiometricError('Face ID setup was cancelled.')
            } else {
                console.error('Face ID registration error:', err)
                setBiometricError(errorObj.message || 'Face ID registration failed')
            }
        } finally {
            setRegisteringBiometric(false)
        }
    }

    const handleDeletePasskey = async (id: string) => {
        if (!confirm('Remove this Face ID device from your account?')) return

        setDeletingId(id)
        setBiometricError('')
        setBiometricSuccess('')

        try {
            const res = await fetch(`/api/auth/webauthn/passkeys?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                setBiometricSuccess('Biometric device removed.')
                await loadPasskeys()
            } else {
                const data = await res.json()
                setBiometricError(data.error || 'Failed to remove device')
            }
        } catch {
            setBiometricError('Failed to remove device')
        } finally {
            setDeletingId(null)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        if (!newPassword && !newUsername && !newHisabPassword) {
            setError('Please enter a new username, app password, or Hisab Kitab password')
            setLoading(false)
            return
        }

        if (newPassword && newPassword !== confirmPassword) {
            setError('New app passwords do not match')
            setLoading(false)
            return
        }

        if (newPassword && newPassword.length < 6) {
            setError('App password must be at least 6 characters')
            setLoading(false)
            return
        }

        if (newHisabPassword && newHisabPassword !== confirmHisabPassword) {
            setError('Hisab Kitab passwords do not match')
            setLoading(false)
            return
        }

        if (newHisabPassword && newHisabPassword.length < 4) {
            setError('Hisab Kitab password must be at least 4 characters')
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
                    newUsername: newUsername || undefined,
                    newHisabPassword: newHisabPassword || undefined,
                }),
            })

            if (res.ok) {
                setSuccess('Security settings updated successfully! Redirecting...')
                setTimeout(() => router.push('/'), 2000)
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to update credentials')
            }
        } catch {
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
                    <Link
                        href="/"
                        className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2"
                    >
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </Link>
                    <div className="flex-1 text-center">
                        <h1 className="text-[17px] font-semibold text-gray-900">Security & Face ID</h1>
                    </div>
                    <div className="w-16" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto ios-scroll px-4 pt-4 pb-44 space-y-6">
                {/* Face ID / Biometrics Section */}
                <div>
                    <p className="ios-section-label px-0 mb-2">Face ID & Biometrics</p>

                    {biometricError && (
                        <div
                            className="ios-card p-3 mb-3 text-center text-[14px] text-ios-red font-medium"
                            style={{ backgroundColor: 'rgba(255,59,48,0.08)' }}
                        >
                            {biometricError}
                        </div>
                    )}

                    {biometricSuccess && (
                        <div
                            className="ios-card p-3 mb-3 flex items-center justify-center gap-2 text-[14px] text-ios-green font-medium"
                            style={{ backgroundColor: 'rgba(52,199,89,0.08)' }}
                        >
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{biometricSuccess}</span>
                        </div>
                    )}

                    <div className="ios-card overflow-hidden">
                        <div className="p-4 flex items-center gap-3.5 border-b border-black/5">
                            <div className="w-11 h-11 rounded-2xl bg-ios-blue/10 flex items-center justify-center text-ios-blue shrink-0">
                                <FaceIDIcon className="w-7 h-7" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[16px] font-semibold text-gray-900">Face ID Login</h3>
                                <p className="text-[13px] text-ios-gray">
                                    Instant, secure sign-in using your device biometric scan
                                </p>
                            </div>
                        </div>

                        {/* List of enrolled devices */}
                        {loadingPasskeys ? (
                            <div className="p-4 flex items-center justify-center text-ios-gray text-[14px]">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Checking registered devices...
                            </div>
                        ) : passkeys.length > 0 ? (
                            <div className="divide-y divide-black/5">
                                {passkeys.map((pk) => (
                                    <div key={pk.id} className="p-3.5 px-4 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-medium text-gray-900 truncate">
                                                {pk.name || 'Biometric Device'}
                                            </p>
                                            <p className="text-[12px] text-ios-gray">
                                                Added {new Date(pk.createdAt).toLocaleDateString()}
                                                {pk.lastUsedAt && ` • Used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePasskey(pk.id)}
                                            disabled={deletingId === pk.id}
                                            className="p-2 text-ios-red active:opacity-60 disabled:opacity-40"
                                            title="Remove device"
                                        >
                                            {deletingId === pk.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-[14px] text-ios-gray">
                                No Face ID devices enrolled yet on this account.
                            </div>
                        )}

                        {/* Register Button */}
                        {supportsWebAuthn && (
                            <div className="p-3 bg-gray-50/70 border-t border-black/5">
                                <button
                                    type="button"
                                    onClick={handleRegisterFaceID}
                                    disabled={registeringBiometric}
                                    className="w-full py-3 px-4 bg-white text-ios-blue text-[15px] font-semibold rounded-xl border border-black/10 shadow-sm flex items-center justify-center gap-2 ios-press disabled:opacity-50 active:scale-[0.98] transition-all"
                                >
                                    {registeringBiometric ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Enrolling Face ID...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaceIDIcon className="w-5 h-5 text-ios-blue" />
                                            <span>
                                                {passkeys.length > 0 ? 'Add Another Device' : 'Enable Face ID on this Device'}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Password / Username Update Form */}
                <form id="change-password-form" onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div
                            className="ios-card p-3 text-center text-[15px] text-ios-red font-medium"
                            style={{ backgroundColor: 'rgba(255,59,48,0.08)' }}
                        >
                            {error}
                        </div>
                    )}
                    {success && (
                        <div
                            className="ios-card p-3 text-center text-[15px] text-ios-green font-medium"
                            style={{ backgroundColor: 'rgba(52,199,89,0.08)' }}
                        >
                            {success}
                        </div>
                    )}

                    {/* Current Password Verification */}
                    <div>
                        <p className="ios-section-label px-0 mb-2">Password Change Verification</p>
                        <div className="ios-card overflow-hidden">
                            <div className="px-4 py-3">
                                <label className="text-[13px] text-ios-gray block mb-1">Current App Password</label>
                                <input
                                    required
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Required to change passwords below"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main App Credentials */}
                    <div>
                        <p className="ios-section-label px-0 mb-2">App Login Credentials</p>
                        <div className="ios-card overflow-hidden">
                            <div className="px-4 py-3" style={{ borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>
                                <label className="text-[13px] text-ios-gray block mb-1">New Username</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Leave empty to keep current"
                                />
                            </div>
                            <div
                                className="px-4 py-3"
                                style={{ borderBottom: newPassword ? '0.5px solid rgba(60,60,67,0.12)' : 'none' }}
                            >
                                <label className="text-[13px] text-ios-gray block mb-1">New App Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Leave empty to keep current"
                                />
                            </div>
                            {newPassword && (
                                <div className="px-4 py-3 ios-scale-in">
                                    <label className="text-[13px] text-ios-gray block mb-1">
                                        Confirm New App Password
                                    </label>
                                    <input
                                        required
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                        placeholder="Re-enter new app password"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Hisab Kitab Password Section */}
                    <div>
                        <p className="ios-section-label px-0 mb-2">Hisab Kitab Dashboard Password</p>
                        <div className="ios-card overflow-hidden">
                            <div
                                className="px-4 py-3"
                                style={{ borderBottom: newHisabPassword ? '0.5px solid rgba(60,60,67,0.12)' : 'none' }}
                            >
                                <label className="text-[13px] text-ios-gray block mb-1">New Hisab Kitab Password</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    value={newHisabPassword}
                                    onChange={(e) => setNewHisabPassword(e.target.value)}
                                    className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                    placeholder="Leave empty to keep current"
                                />
                            </div>
                            {newHisabPassword && (
                                <div className="px-4 py-3 ios-scale-in">
                                    <label className="text-[13px] text-ios-gray block mb-1">
                                        Confirm Hisab Kitab Password
                                    </label>
                                    <input
                                        required
                                        type="password"
                                        inputMode="numeric"
                                        value={confirmHisabPassword}
                                        onChange={(e) => setConfirmHisabPassword(e.target.value)}
                                        className="w-full text-[17px] text-gray-900 bg-transparent outline-none placeholder:text-ios-gray3"
                                        placeholder="Re-enter new Hisab Kitab password"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* Bottom Button above BottomNav */}
            <div
                className="fixed left-0 right-0 mx-auto w-full max-w-md lg:max-w-lg xl:max-w-xl px-4 pointer-events-none z-40"
                style={{ bottom: 'calc(56px + max(8px, env(safe-area-inset-bottom, 8px)) + 10px)' }}
            >
                <button
                    form="change-password-form"
                    disabled={loading}
                    type="submit"
                    className="w-full py-[14px] bg-ios-blue text-white text-[16px] font-semibold rounded-2xl shadow-[0_4px_16px_rgba(0,122,255,0.35)] ios-press pointer-events-auto disabled:opacity-50 active:scale-[0.98] transition-all"
                >
                    {loading ? 'Updating...' : 'Save Password Changes'}
                </button>
            </div>
        </div>
    )
}
