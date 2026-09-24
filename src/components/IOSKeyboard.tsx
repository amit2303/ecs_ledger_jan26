'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Delete, ChevronDown, Building2, UserCircle2, Package as PackageIcon } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────
interface CompanyItem { id: number; name: string }
interface EmployeeItem { id: number; name: string; salary: number }
interface PackageItem { id: number; description: string }
interface PersonItem { canonical: string; display: string; color: string; bg: string; border: string }

interface IOSKeyboardProps {
    isOpen: boolean
    onClose: () => void
    onKeyPress: (char: string) => void
    onBackspace: () => void
    onSend: () => void
    isFormValid: boolean
    sending?: boolean
    // Smart suggestion props
    inputValue: string
    companySuggestions?: CompanyItem[]
    employeeSuggestions?: EmployeeItem[]
    companyPackages?: PackageItem[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    persons?: readonly any[]
    selectedCompany?: CompanyItem | null
    selectedEmployee?: EmployeeItem | null
    selectedPackage?: PackageItem | null
    selectedPerson?: PersonItem | null
    isPersonPickerOpen?: boolean
    onSelectCompany?: (comp: CompanyItem) => void
    onSelectEmployee?: (emp: EmployeeItem) => void
    onSelectPackage?: (pkg: PackageItem) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectPerson?: (p: any) => void
}

type KeyboardMode = 'letters' | 'numbers' | 'symbols'

export function IOSKeyboard({
    isOpen,
    onClose,
    onKeyPress,
    onBackspace,
    onSend,
    isFormValid,
    sending = false,
    inputValue,
    companySuggestions = [],
    employeeSuggestions = [],
    companyPackages = [],
    persons = [],
    selectedCompany = null,
    selectedEmployee = null,
    selectedPackage = null,
    selectedPerson = null,
    isPersonPickerOpen = false,
    onSelectCompany,
    onSelectEmployee,
    onSelectPackage,
    onSelectPerson,
}: IOSKeyboardProps) {
    const [mode, setMode] = useState<KeyboardMode>('letters')
    const [activeKey, setActiveKey] = useState<string | null>(null)
    const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Trigger subtle tactile haptic if supported
    const triggerHaptic = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(6)
            }
        } catch (_) {}
    }, [])

    const handleKeyTap = (char: string) => {
        triggerHaptic()
        setActiveKey(char)
        setTimeout(() => setActiveKey(null), 120)
        onKeyPress(char)
    }

    const handleBackspaceStart = () => {
        triggerHaptic()
        onBackspace()
        backspaceTimeoutRef.current = setTimeout(() => {
            backspaceIntervalRef.current = setInterval(() => {
                triggerHaptic()
                onBackspace()
            }, 55)
        }, 350)
    }

    const handleBackspaceEnd = () => {
        if (backspaceTimeoutRef.current) clearTimeout(backspaceTimeoutRef.current)
        if (backspaceIntervalRef.current) clearInterval(backspaceIntervalRef.current)
    }

    useEffect(() => {
        return () => {
            if (backspaceTimeoutRef.current) clearTimeout(backspaceTimeoutRef.current)
            if (backspaceIntervalRef.current) clearInterval(backspaceIntervalRef.current)
        }
    }, [])

    // Determine which contextual suggestions to show inside the keyboard
    const showCompanySuggestions = companySuggestions.length > 0 && !selectedCompany && inputValue.startsWith('+')
    const showEmployeeSuggestions = employeeSuggestions.length > 0 && !selectedEmployee && !selectedCompany && inputValue.startsWith('-')
    const showPackageSuggestions = selectedCompany && companyPackages.length > 0 && !selectedPackage
    const showPersonPicker = isPersonPickerOpen && persons.length > 0
    const hasSuggestions = showCompanySuggestions || showEmployeeSuggestions || showPackageSuggestions || showPersonPicker

    if (!isOpen) return null

    // ─── Key Component with Liquid Glass Effect ───────────────────
    const GlassKey = ({ 
        char, 
        wide, 
        extraWide,
        special,
        children,
        onTap,
        onDown,
        onUp,
        onLeave,
        onTouchStart,
        onTouchEnd,
        className = ''
    }: {
        char?: string
        wide?: boolean
        extraWide?: boolean
        special?: boolean
        children?: React.ReactNode
        onTap?: () => void
        onDown?: () => void
        onUp?: () => void
        onLeave?: () => void
        onTouchStart?: () => void
        onTouchEnd?: () => void
        className?: string
    }) => {
        const isActive = char ? activeKey === char : false
        return (
            <button
                type="button"
                onClick={onTap || (char ? () => handleKeyTap(char) : undefined)}
                onMouseDown={onDown}
                onMouseUp={onUp}
                onMouseLeave={onLeave}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className={`
                    ${wide ? 'w-[44px]' : extraWide ? 'flex-1' : 'flex-1'}
                    h-[44px] rounded-[8px] flex items-center justify-center
                    transition-all duration-75 ease-out
                    ${special 
                        ? `bg-[rgba(120,120,128,0.24)] backdrop-blur-sm text-[#1c1c1e]
                           ${isActive ? 'bg-[rgba(255,255,255,0.85)] scale-[0.95]' : 'active:bg-[rgba(255,255,255,0.85)] active:scale-[0.95]'}`
                        : `bg-[rgba(255,255,255,0.65)] backdrop-blur-sm text-[#1c1c1e]
                           shadow-[0_1px_3px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]
                           ${isActive ? 'bg-[rgba(200,200,210,0.7)] scale-[0.95] shadow-[0_0_0_rgba(0,0,0,0)]' : 'active:bg-[rgba(200,200,210,0.7)] active:scale-[0.95]'}`
                    }
                    ${className}
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                {children || (
                    <span className={`${special ? 'text-[15px] font-semibold' : 'text-[22px] font-light'} select-none pointer-events-none`}>
                        {char}
                    </span>
                )}
            </button>
        )
    }

    return (
        <div 
            className="w-full select-none touch-manipulation z-30"
            style={{ 
                WebkitUserSelect: 'none',
                background: 'linear-gradient(180deg, rgba(210,210,215,0.92) 0%, rgba(200,200,206,0.95) 100%)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderTop: '0.5px solid rgba(0,0,0,0.15)',
                animation: 'ios-kb-slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1) both',
            }}
        >
            {/* ─── Contextual Smart Suggestion Bar (integrated into keyboard) ─── */}
            {hasSuggestions && (
                <div 
                    className="overflow-x-auto flex items-center gap-1.5 px-3 py-[6px]"
                    style={{
                        background: 'rgba(255,255,255,0.35)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {/* Company Suggestions */}
                    {showCompanySuggestions && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                            </span>
                            {companySuggestions.map(comp => {
                                const isMisc = comp.id === -1
                                return (
                                    <button
                                        key={comp.id}
                                        type="button"
                                        onClick={() => { triggerHaptic(); onSelectCompany?.(comp) }}
                                        className="px-3 py-[5px] rounded-full text-[13px] font-medium shrink-0 transition-all active:scale-[0.95]"
                                        style={{
                                            background: isMisc ? 'rgba(0,122,255,0.12)' : 'rgba(255,255,255,0.7)',
                                            color: isMisc ? '#007AFF' : '#1c1c1e',
                                            border: `0.5px solid ${isMisc ? 'rgba(0,122,255,0.25)' : 'rgba(0,0,0,0.08)'}`,
                                            backdropFilter: 'blur(8px)',
                                            fontWeight: isMisc ? 700 : 500,
                                        }}
                                    >
                                        {comp.name.replace(/^\d+\.?\s*/, '')}
                                    </button>
                                )
                            })}
                        </>
                    )}

                    {/* Employee / Head Suggestions */}
                    {showEmployeeSuggestions && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <UserCircle2 className="w-3 h-3" />
                            </span>
                            <button
                                type="button"
                                onClick={() => { triggerHaptic(); onSelectCompany?.({ id: -1, name: 'ECS MISC' }) }}
                                className="px-3 py-[5px] rounded-full text-[13px] font-bold shrink-0 transition-all active:scale-[0.95]"
                                style={{
                                    background: 'rgba(0,122,255,0.12)',
                                    color: '#007AFF',
                                    border: '0.5px solid rgba(0,122,255,0.25)',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                ECS MISC
                            </button>
                            {employeeSuggestions.map(emp => (
                                <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => { triggerHaptic(); onSelectEmployee?.(emp) }}
                                    className="px-3 py-[5px] rounded-full text-[13px] font-medium shrink-0 transition-all active:scale-[0.95]"
                                    style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        color: '#1c1c1e',
                                        border: '0.5px solid rgba(0,0,0,0.08)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    {emp.name}
                                </button>
                            ))}
                        </>
                    )}

                    {/* Package Suggestions */}
                    {showPackageSuggestions && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <PackageIcon className="w-3 h-3" />
                            </span>
                            {companyPackages.map(pkg => (
                                <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => { triggerHaptic(); onSelectPackage?.(pkg) }}
                                    className="px-3 py-[5px] rounded-full text-[13px] font-medium shrink-0 transition-all active:scale-[0.95]"
                                    style={{
                                        background: 'rgba(255,255,255,0.7)',
                                        color: '#1c1c1e',
                                        border: '0.5px solid rgba(0,0,0,0.08)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    {pkg.description}
                                </button>
                            ))}
                        </>
                    )}

                    {/* Person (@) Picker */}
                    {showPersonPicker && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider shrink-0">@</span>
                            {persons.map(p => (
                                <button
                                    key={p.canonical}
                                    type="button"
                                    onClick={() => { triggerHaptic(); onSelectPerson?.(p) }}
                                    className="px-3 py-[5px] rounded-full text-[13px] font-semibold shrink-0 transition-all active:scale-[0.95]"
                                    style={{
                                        background: p.bg,
                                        color: p.color,
                                        border: `0.5px solid ${p.border}`,
                                    }}
                                >
                                    {p.display}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* ─── Quick Action Bar (+ Payment / - Expense / Done) ─── */}
            <div 
                className="flex items-center justify-between px-3 py-[5px]"
                style={{
                    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                }}
            >
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleKeyTap('+')}
                        className="px-3 py-[4px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.94]"
                        style={{
                            background: 'rgba(52,199,89,0.15)',
                            color: '#30D158',
                            border: '0.5px solid rgba(52,199,89,0.25)',
                        }}
                    >
                        + Payment
                    </button>
                    <button
                        type="button"
                        onClick={() => handleKeyTap('-')}
                        className="px-3 py-[4px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.94]"
                        style={{
                            background: 'rgba(255,69,58,0.12)',
                            color: '#FF453A',
                            border: '0.5px solid rgba(255,69,58,0.2)',
                        }}
                    >
                        − Expense
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-[4px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.94] flex items-center gap-1"
                    style={{
                        color: '#007AFF',
                    }}
                >
                    Done
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* ─── KEYBOARD ROWS ─── */}
            <div className="flex flex-col gap-[6px] px-[3px] pt-[4px] pb-[3px] max-w-lg mx-auto">
                {/* 1. LETTERS MODE (QWERTY) */}
                {mode === 'letters' && (
                    <>
                        {/* Row 1 */}
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                        </div>

                        {/* Row 2 */}
                        <div className="flex justify-center gap-[5px] px-[14px]">
                            {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                        </div>

                        {/* Row 3 */}
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            <GlassKey special wide onTap={() => setMode('numbers')}>
                                <span className="text-[15px] font-semibold select-none">123</span>
                            </GlassKey>
                            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                            <GlassKey 
                                special 
                                wide
                                onDown={handleBackspaceStart}
                                onUp={handleBackspaceEnd}
                                onLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                            >
                                <Delete className="w-[22px] h-[22px] stroke-[1.5] text-[#1c1c1e] pointer-events-none" />
                            </GlassKey>
                        </div>
                    </>
                )}

                {/* 2. NUMBERS MODE */}
                {mode === 'numbers' && (
                    <>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {['-', '+', '/', ':', ';', '(', ')', '₹', '&', '@'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            <GlassKey special wide onTap={() => setMode('symbols')}>
                                <span className="text-[14px] font-semibold select-none">#+=</span>
                            </GlassKey>
                            {['.', ',', '?', '!', "'", '"', '%'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                            <GlassKey 
                                special 
                                wide
                                onDown={handleBackspaceStart}
                                onUp={handleBackspaceEnd}
                                onLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                            >
                                <Delete className="w-[22px] h-[22px] stroke-[1.5] text-[#1c1c1e] pointer-events-none" />
                            </GlassKey>
                        </div>
                    </>
                )}

                {/* 3. SYMBOLS MODE */}
                {mode === 'symbols' && (
                    <>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {['[', ']', '{', '}', '#', '%', '^', '*', '+', '='].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {['_', '\\', '|', '~', '<', '>', '$', '€', '£', '•'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            <GlassKey special wide onTap={() => setMode('numbers')}>
                                <span className="text-[14px] font-semibold select-none">123</span>
                            </GlassKey>
                            {['.', ',', '?', '!', "'", '"', '`'].map((k) => (
                                <GlassKey key={k} char={k} />
                            ))}
                            <GlassKey 
                                special 
                                wide
                                onDown={handleBackspaceStart}
                                onUp={handleBackspaceEnd}
                                onLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                            >
                                <Delete className="w-[22px] h-[22px] stroke-[1.5] text-[#1c1c1e] pointer-events-none" />
                            </GlassKey>
                        </div>
                    </>
                )}

                {/* Row 4: Bottom row (Switch, @, Space, ., Send) */}
                <div className="flex justify-center gap-[5px] px-[1px] mt-[1px]">
                    <GlassKey 
                        special 
                        className="!w-[52px] shrink-0 !flex-none"
                        onTap={() => setMode(mode === 'letters' ? 'numbers' : 'letters')}
                    >
                        <span className="text-[15px] font-semibold select-none pointer-events-none">
                            {mode === 'letters' ? '123' : 'ABC'}
                        </span>
                    </GlassKey>

                    <GlassKey char="@" className="!w-[40px] shrink-0 !flex-none" />

                    <button
                        type="button"
                        onClick={() => handleKeyTap(' ')}
                        className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center transition-all duration-75 active:scale-[0.98]"
                        style={{
                            background: 'rgba(255,255,255,0.65)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <span className="text-[15px] font-normal text-[#8e8e93] select-none">space</span>
                    </button>

                    <GlassKey char="." className="!w-[40px] shrink-0 !flex-none" />

                    {/* Send Button — iOS 26 Liquid Glass Blue */}
                    <button
                        type="button"
                        onClick={() => {
                            if (isFormValid && !sending) {
                                triggerHaptic()
                                onSend()
                            }
                        }}
                        disabled={!isFormValid || sending}
                        className="w-[52px] h-[44px] rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-100"
                        style={{
                            background: isFormValid && !sending
                                ? 'linear-gradient(180deg, #3B9FFF 0%, #007AFF 100%)'
                                : 'rgba(120,120,128,0.2)',
                            boxShadow: isFormValid && !sending
                                ? '0 2px 8px rgba(0,122,255,0.35), inset 0 1px 0 rgba(255,255,255,0.3)'
                                : 'none',
                            opacity: isFormValid && !sending ? 1 : 0.45,
                            cursor: isFormValid && !sending ? 'pointer' : 'not-allowed',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        {/* iOS 26 style up arrow */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="pointer-events-none">
                            <path 
                                d="M12 4L12 20M12 4L6 10M12 4L18 10" 
                                stroke={isFormValid && !sending ? '#fff' : '#8e8e93'}
                                strokeWidth="2.5" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Bottom safe area padding */}
            <div style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }} />

            {/* Injected keyframe animation */}
            <style jsx>{`
                @keyframes ios-kb-slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0.5;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    )
}
