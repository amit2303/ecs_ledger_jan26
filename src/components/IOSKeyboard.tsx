'use client'

import React, { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Delete, ChevronDown, Building2, UserCircle2, Package as PackageIcon } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────
interface CompanyItem { id: number; name: string }
interface EmployeeItem { id: number; name: string; salary: number }
interface PackageItem { id: number; description: string }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedPerson?: any | null
    isPersonPickerOpen?: boolean
    onSelectCompany?: (comp: CompanyItem) => void
    onSelectEmployee?: (emp: EmployeeItem) => void
    onSelectPackage?: (pkg: PackageItem) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectPerson?: (p: any) => void
    cursorPosition?: number
    onCursorMove?: (pos: number) => void
}

type KeyboardMode = 'letters' | 'numbers' | 'symbols'

// ─── Styles (CSS-in-JS object, avoids styled-jsx issues) ────────
const kbStyles = {
    wrapper: {
        WebkitUserSelect: 'none' as const,
        background: 'linear-gradient(180deg, rgba(210,210,215,0.95) 0%, rgba(200,200,206,0.97) 100%)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderTop: '0.5px solid rgba(0,0,0,0.15)',
    },
    suggestionBar: {
        background: 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        scrollbarWidth: 'none' as const,
        WebkitOverflowScrolling: 'touch' as const,
    },
    key: {
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
        WebkitTapHighlightColor: 'transparent',
    },
    keyActive: {
        background: 'rgba(188,188,200,0.75)',
        boxShadow: 'none',
        transform: 'scale(0.95)',
    },
    specialKey: {
        background: 'rgba(120,120,128,0.28)',
        backdropFilter: 'blur(8px)',
        WebkitTapHighlightColor: 'transparent',
    },
    specialKeyActive: {
        background: 'rgba(255,255,255,0.85)',
        transform: 'scale(0.95)',
    },
}

// ─── Letter / Number / Symbol Row Definitions ─────────────────
const LETTER_ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P']
const LETTER_ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']
const LETTER_ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
const NUMBER_ROW_1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const NUMBER_ROW_2 = ['-', '+', '/', ':', ';', '(', ')', '₹', '&', '@']
const NUMBER_ROW_3 = ['.', ',', '?', '!', "'", '"', '%']
const SYMBOL_ROW_1 = ['[', ']', '{', '}', '#', '%', '^', '*', '+', '=']
const SYMBOL_ROW_2 = ['_', '\\', '|', '~', '<', '>', '$', '€', '£', '•']
const SYMBOL_ROW_3 = ['.', ',', '?', '!', "'", '"', '`']

function BackspaceButton({
    onDown,
    onUp,
    onLeave,
    onTouchStart,
    onTouchEnd,
    style,
}: {
    onDown?: () => void
    onUp?: () => void
    onLeave?: () => void
    onTouchStart?: () => void
    onTouchEnd?: () => void
    style?: React.CSSProperties
}) {
    return (
        <button
            type="button"
            onMouseDown={onDown}
            onMouseUp={onUp}
            onMouseLeave={onLeave}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="h-[44px] rounded-[8px] flex items-center justify-center shrink-0 transition-transform duration-75 active:scale-[0.95]"
            style={{
                ...style,
                width: '44px',
            }}
        >
            <Delete className="w-[22px] h-[22px] stroke-[1.5] text-[#1c1c1e] pointer-events-none" />
        </button>
    )
}

export function IOSKeyboard({
    isOpen,
    onClose,
    onKeyPress,
    onBackspace,
    onSend,
    isFormValid,
    sending = false,
    inputValue = '',
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
    cursorPosition = 0,
    onCursorMove,
    onSelectIncome,
    onSelectExpense,
}: IOSKeyboardProps & {
    onSelectIncome?: () => void
    onSelectExpense?: () => void
}) {
    const [mode, setMode] = useState<KeyboardMode>('numbers')
    
    // Reset to numbers mode when keyboard opens
    useEffect(() => {
        if (isOpen) {
            setMode('numbers')
        }
    }, [isOpen])
    
    // Trackpad mode for spacebar long press
    const [isTrackpadMode, setIsTrackpadMode] = useState(false)
    const trackpadStartX = useRef(0)
    const trackpadStartCursor = useRef(0)
    const spaceLongPressTimeout = useRef<NodeJS.Timeout | null>(null)
    const [activeKey, setActiveKey] = useState<string | null>(null)
    const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const activeKeyTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Trigger subtle tactile haptic if supported
    const triggerHaptic = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(6)
            }
        } catch (_) {}
    }, [])

    const handleKeyTap = useCallback((char: string) => {
        triggerHaptic()
        setActiveKey(char)
        if (activeKeyTimerRef.current) clearTimeout(activeKeyTimerRef.current)
        activeKeyTimerRef.current = setTimeout(() => setActiveKey(null), 120)

        // Auto switch from numbers to letters (QWERTY) when Space is pressed after entering amount
        if (char === ' ' && mode === 'numbers') {
            const hasAmountPattern = /^[+-]?\d+/
            if (hasAmountPattern.test(inputValue.trim())) {
                setMode('letters')
            }
        }

        onKeyPress(char)
    }, [triggerHaptic, onKeyPress, mode, inputValue])

    const handleBackspaceStart = useCallback(() => {
        triggerHaptic()
        onBackspace()
        backspaceTimeoutRef.current = setTimeout(() => {
            backspaceIntervalRef.current = setInterval(() => {
                triggerHaptic()
                onBackspace()
            }, 55)
        }, 350)
    }, [triggerHaptic, onBackspace])

    const handleBackspaceEnd = useCallback(() => {
        if (backspaceTimeoutRef.current) clearTimeout(backspaceTimeoutRef.current)
        if (backspaceIntervalRef.current) clearInterval(backspaceIntervalRef.current)
        backspaceTimeoutRef.current = null
        backspaceIntervalRef.current = null
    }, [])

    useEffect(() => {
        return () => {
            if (backspaceTimeoutRef.current) clearTimeout(backspaceTimeoutRef.current)
            if (backspaceIntervalRef.current) clearInterval(backspaceIntervalRef.current)
            if (activeKeyTimerRef.current) clearTimeout(activeKeyTimerRef.current)
        }
    }, [])

    const handleIncomeClick = () => {
        triggerHaptic()
        if (onSelectIncome) {
            onSelectIncome()
        } else {
            onKeyPress('+')
        }
        setMode('numbers')
    }

    const handleExpenseClick = () => {
        triggerHaptic()
        if (onSelectExpense) {
            onSelectExpense()
        } else {
            onKeyPress('-')
        }
        setMode('numbers')
    }

    // Determine which contextual suggestions to show inside the keyboard (strictly mutually exclusive)
    const safeInput = inputValue || ''
    const hasDetectedPerson = /@\s*(?:AMIT|SUMIT|SSM|PAPA|MAMAJI|PANKAJ|BHAIYA)\b/i.test(safeInput) || !!selectedPerson

    const sign = safeInput[0]
    const afterSign = (sign === '+' || sign === '-') ? safeInput.substring(1).trimStart() : ''
    const amountMatch = afterSign.match(/^(\d+(?:\.\d+)?)/)
    const hasAmount = Boolean(amountMatch)
    const restAfterAmount = hasAmount ? afterSign.substring(amountMatch![0].length).trim() : ''

    // Priority 1: Company suggestions (payment flow, amount typed, company not selected or deleted in edit)
    const showCompanySuggestions = !selectedCompany && safeInput.startsWith('+') && companySuggestions.length > 0

    // Priority 2: Employee suggestions (expense flow, amount typed, employee not selected or deleted in edit)
    const showEmployeeSuggestions = !showCompanySuggestions && !selectedEmployee && !selectedCompany && safeInput.startsWith('-') && employeeSuggestions.length > 0

    // Calculate if description or package is ready
    let hasDescriptionOrPackage = false
    let textAfterComp = ''
    if (hasAmount) {
        if (sign === '+') {
            const cleanCompName = selectedCompany ? selectedCompany.name.replace(/^\d+\.?\s*/, '').trim().toUpperCase() : ''
            textAfterComp = cleanCompName 
                ? restAfterAmount.replace(cleanCompName, '').trim() 
                : (selectedCompany ? restAfterAmount : restAfterAmount.split(/\s+/).slice(1).join(' '))
            
            // For income: either package is selected, OR description is typed after company
            if (selectedPackage || textAfterComp.length > 0) {
                hasDescriptionOrPackage = true
            }
        } else if (sign === '-') {
            const isMisc = selectedCompany?.id === -1 || restAfterAmount.toUpperCase().includes('ECS MISC')
            if (isMisc) {
                const textAfterMisc = restAfterAmount.replace(/ECS\s*M[I|S]SC/i, '').trim()
                if (textAfterMisc.length > 0) {
                    hasDescriptionOrPackage = true
                }
            } else if (selectedEmployee) {
                // Employee payment: description is optional, so as soon as employee is selected, person can be chosen!
                hasDescriptionOrPackage = true
            } else if (restAfterAmount.length > 0 && employeeSuggestions.length === 0) {
                hasDescriptionOrPackage = true
            }
        }
    }

    // Priority 3: Package suggestions (payment flow, company selected with packages)
    // Shown when no package is selected AND no description typed yet
    const showPackageSuggestions = !showCompanySuggestions && 
        !showEmployeeSuggestions && 
        !!selectedCompany && 
        selectedCompany.id !== -1 &&
        companyPackages.length > 0 && 
        !selectedPackage && 
        !textAfterComp && 
        !safeInput.includes('@')

    // Priority 4: Person picker
    // Shown automatically when description/package is ready and person is not yet selected,
    // OR if user typed '@' or actively picking person
    const showPersonPicker = !showCompanySuggestions && 
        !showEmployeeSuggestions && 
        !showPackageSuggestions && 
        !hasDetectedPerson && 
        (hasDescriptionOrPackage || !!isPersonPickerOpen || safeInput.includes('@')) && 
        persons.length > 0

    const hasSuggestions = showCompanySuggestions || showEmployeeSuggestions || showPackageSuggestions || showPersonPicker

    if (!isOpen) return null

    // ─── Render Helpers ───────────────────────────────────────────
    const renderKey = (char: string, fontSize = '22px') => {
        const isActive = activeKey === char
        return (
            <button
                key={char}
                type="button"
                onClick={() => handleKeyTap(char)}
                className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center transition-transform duration-75"
                style={{
                    ...kbStyles.key,
                    ...(isActive ? kbStyles.keyActive : {}),
                }}
            >
                <span className="select-none pointer-events-none" style={{ fontSize, fontWeight: 300 }}>
                    {char}
                </span>
            </button>
        )
    }

    const renderSpecialKey = (
        content: React.ReactNode,
        opts: {
            onTap?: () => void
            onDown?: () => void
            onUp?: () => void
            onLeave?: () => void
            onTouchStart?: () => void
            onTouchEnd?: () => void
            width?: string
        } = {}
    ) => (
        <button
            type="button"
            onClick={opts.onTap}
            onMouseDown={opts.onDown}
            onMouseUp={opts.onUp}
            onMouseLeave={opts.onLeave}
            onTouchStart={opts.onTouchStart}
            onTouchEnd={opts.onTouchEnd}
            className="h-[44px] rounded-[8px] flex items-center justify-center shrink-0 transition-transform duration-75 active:scale-[0.95]"
            style={{
                ...kbStyles.specialKey,
                width: opts.width || '44px',
            }}
        >
            {content}
        </button>
    )

    // ─── Suggestion Pill ──────────────────────────────────────────
    const renderSuggestionPill = (
        key: string | number,
        label: string,
        onClick: () => void,
        highlight = false,
        pillStyle?: React.CSSProperties
    ) => (
        <button
            key={key}
            type="button"
            onClick={() => { triggerHaptic(); onClick() }}
            className="px-3 py-[5px] rounded-full text-[13px] shrink-0 transition-all active:scale-[0.95]"
            style={{
                background: highlight ? 'rgba(0,122,255,0.14)' : 'rgba(255,255,255,0.75)',
                color: highlight ? '#007AFF' : '#1c1c1e',
                border: `0.5px solid ${highlight ? 'rgba(0,122,255,0.3)' : 'rgba(0,0,0,0.1)'}`,
                fontWeight: highlight ? 700 : 500,
                backdropFilter: 'blur(8px)',
                WebkitTapHighlightColor: 'transparent',
                ...pillStyle,
            }}
        >
            {label}
        </button>
    )

    // ─── Trackpad (Spacebar) Handlers ─────────────────────────────
    const handleSpaceTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0]
        trackpadStartX.current = touch.clientX
        trackpadStartCursor.current = cursorPosition
        spaceLongPressTimeout.current = setTimeout(() => {
            setIsTrackpadMode(true)
            triggerHaptic()
        }, 250)
    }

    const handleSpaceTouchMove = (e: React.TouchEvent) => {
        if (!isTrackpadMode) {
            const touch = e.touches[0]
            if (Math.abs(touch.clientX - trackpadStartX.current) > 10) {
                if (spaceLongPressTimeout.current) clearTimeout(spaceLongPressTimeout.current)
            }
            return
        }
        
        const touch = e.touches[0]
        const diffX = touch.clientX - trackpadStartX.current
        
        // Every 8 pixels of movement shifts cursor by 1 character
        const shift = Math.floor(diffX / 8)
        let newPos = trackpadStartCursor.current + shift
        if (newPos < 0) newPos = 0
        if (newPos > inputValue.length) newPos = inputValue.length
        
        if (newPos !== cursorPosition) {
            onCursorMove?.(newPos)
            triggerHaptic()
        }
    }

    const handleSpaceTouchEnd = (e: React.TouchEvent) => {
        if (spaceLongPressTimeout.current) clearTimeout(spaceLongPressTimeout.current)
        if (isTrackpadMode) {
            setIsTrackpadMode(false)
        } else {
            // Normal tap
            handleKeyTap(' ')
        }
    }

    return (
        <div
            className="w-full select-none touch-manipulation z-30"
            style={kbStyles.wrapper}
        >
            {/* ─── Quick Action Bar (+ Income, - Expense, Done) ─── */}
            <div
                className="flex items-center justify-between px-3 py-[6px]"
                style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
            >
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleIncomeClick}
                        className="px-3.5 py-1 rounded-full text-[13px] flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                        style={{
                            background: safeInput.startsWith('+')
                                ? '#ffffff'
                                : 'rgba(120,120,128,0.14)',
                            color: '#1c1c1e',
                            border: `0.5px solid ${safeInput.startsWith('+') ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'}`,
                            boxShadow: safeInput.startsWith('+') ? '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)' : 'none',
                            fontWeight: safeInput.startsWith('+') ? 600 : 500,
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <span className="text-[15px] font-semibold leading-none">+</span>
                        <span>Income</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleExpenseClick}
                        className="px-3.5 py-1 rounded-full text-[13px] flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                        style={{
                            background: safeInput.startsWith('-')
                                ? '#ffffff'
                                : 'rgba(120,120,128,0.14)',
                            color: '#1c1c1e',
                            border: `0.5px solid ${safeInput.startsWith('-') ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'}`,
                            boxShadow: safeInput.startsWith('-') ? '0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)' : 'none',
                            fontWeight: safeInput.startsWith('-') ? 600 : 500,
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        <span className="text-[15px] font-semibold leading-none">−</span>
                        <span>Expense</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-[4px] rounded-full text-[13px] font-semibold transition-all active:scale-[0.94] flex items-center gap-1 shrink-0"
                    style={{ color: '#007AFF', WebkitTapHighlightColor: 'transparent' }}
                >
                    Done
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* ─── Contextual Smart Suggestion Bar ─── */}
            {hasSuggestions && (
                <div
                    className="overflow-x-auto flex items-center gap-1.5 px-3 py-[6px]"
                    style={kbStyles.suggestionBar}
                >
                    {/* Company Suggestions (for +) */}
                    {showCompanySuggestions && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] shrink-0 flex items-center gap-0.5">
                                <Building2 className="w-3 h-3" />
                            </span>
                            {companySuggestions.map(comp =>
                                renderSuggestionPill(
                                    comp.id,
                                    comp.name.replace(/^\d+\.?\s*/, ''),
                                    () => onSelectCompany?.(comp),
                                    comp.id === -1
                                )
                            )}
                        </>
                    )}

                    {/* Employee / Head Suggestions (for -) */}
                    {showEmployeeSuggestions && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] shrink-0 flex items-center gap-0.5">
                                <UserCircle2 className="w-3 h-3" />
                            </span>
                            {renderSuggestionPill(
                                'ecs-misc',
                                'ECS MISC',
                                () => onSelectCompany?.({ id: -1, name: 'ECS MISC' })
                            )}
                            {employeeSuggestions.map(emp =>
                                renderSuggestionPill(
                                    emp.id,
                                    emp.name,
                                    () => onSelectEmployee?.(emp)
                                )
                            )}
                        </>
                    )}

                    {/* Package Suggestions (after company selected) */}
                    {showPackageSuggestions && (
                        <>
                            <span className="text-[11px] font-semibold text-[#8e8e93] shrink-0 flex items-center gap-0.5">
                                <PackageIcon className="w-3 h-3" />
                            </span>
                            {companyPackages.map(pkg =>
                                renderSuggestionPill(
                                    pkg.id,
                                    pkg.description,
                                    () => onSelectPackage?.(pkg),
                                    pkg.id === (selectedPackage as PackageItem | null)?.id
                                )
                            )}
                        </>
                    )}

                    {/* @Person Picker */}
                    {showPersonPicker && (
                        <>
                            <span className="text-[11px] font-bold text-[#8e8e93] shrink-0 flex items-center gap-0.5">
                                <UserCircle2 className="w-3 h-3 text-[#8e8e93]" />
                                <span>Person</span>
                            </span>
                            {persons.map((p: any) =>
                                renderSuggestionPill(
                                    p.canonical,
                                    p.display,
                                    () => onSelectPerson?.(p),
                                    false,
                                    {
                                        color: p.color || '#007AFF',
                                        background: p.bg || 'rgba(255,255,255,0.85)',
                                        border: `0.5px solid ${p.border || 'rgba(0,122,255,0.25)'}`,
                                        fontWeight: 600,
                                    }
                                )
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── KEYBOARD ROWS ─── */}
            <div className="flex flex-col gap-[6px] px-[3px] pt-[4px] pb-[3px] max-w-lg mx-auto">

                {/* ═══ LETTERS MODE ═══ */}
                {mode === 'letters' && (
                    <>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {LETTER_ROW_1.map(k => renderKey(k))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[14px]">
                            {LETTER_ROW_2.map(k => renderKey(k))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {renderSpecialKey(
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                                    <path d="M12 20V4M12 4L6 10M12 4L18 10"/>
                                </svg>,
                                { onTap: () => triggerHaptic() }
                            )}
                            {LETTER_ROW_3.map(k => renderKey(k))}
                            <BackspaceButton
                                onDown={handleBackspaceStart}
                                onUp={handleBackspaceEnd}
                                onLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                                style={kbStyles.specialKey}
                            />
                        </div>
                    </>
                )}

                {/* ═══ NUMBERS MODE ═══ */}
                {mode === 'numbers' && (
                    <>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {NUMBER_ROW_1.map(k => renderKey(k))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {NUMBER_ROW_2.map(k => renderKey(k, '19px'))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {renderSpecialKey(
                                <span className="text-[14px] font-semibold select-none pointer-events-none">#+=</span>,
                                { onTap: () => setMode('symbols'), width: '48px' }
                            )}
                            {NUMBER_ROW_3.map(k => renderKey(k, '19px'))}
                            <BackspaceButton
                                onDown={handleBackspaceStart}
                                onUp={handleBackspaceEnd}
                                onLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                                style={kbStyles.specialKey}
                            />
                        </div>
                    </>
                )}

                {/* ═══ SYMBOLS MODE ═══ */}
                {mode === 'symbols' && (
                    <>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {SYMBOL_ROW_1.map(k => renderKey(k, '19px'))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {SYMBOL_ROW_2.map(k => renderKey(k, '19px'))}
                        </div>
                        <div className="flex justify-center gap-[5px] px-[1px]">
                            {renderSpecialKey(
                                <span className="text-[14px] font-semibold select-none pointer-events-none">123</span>,
                                { onTap: () => setMode('numbers'), width: '48px' }
                            )}
                            {SYMBOL_ROW_3.map(k => renderKey(k, '19px'))}
                            <BackspaceButton
                                onDown={handleBackspaceStart}
                                onUp={handleBackspaceEnd}
                                onLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                                style={kbStyles.specialKey}
                            />
                        </div>
                    </>
                )}

                {/* ═══ Bottom Row: Switch, @, Space, ., Send ═══ */}
                <div className="flex justify-center gap-[5px] px-[1px] mt-[1px]">
                    {renderSpecialKey(
                        <span className="text-[15px] font-semibold select-none pointer-events-none">
                            {mode === 'letters' ? '123' : 'ABC'}
                        </span>,
                        { onTap: () => setMode(mode === 'letters' ? 'numbers' : 'letters'), width: '52px' }
                    )}

                    {/* @ key */}
                    <button
                        type="button"
                        onClick={() => handleKeyTap('@')}
                        className="w-[40px] h-[44px] rounded-[8px] flex items-center justify-center shrink-0 transition-transform duration-75 active:scale-[0.95]"
                        style={kbStyles.key}
                    >
                        <span className="text-[18px] font-medium select-none pointer-events-none">@</span>
                    </button>

                    {/* Space */}
                    <button
                        type="button"
                        onTouchStart={handleSpaceTouchStart}
                        onTouchMove={handleSpaceTouchMove}
                        onTouchEnd={handleSpaceTouchEnd}
                        onMouseDown={() => {
                            // Desktop fallback just does tap
                            handleKeyTap(' ')
                        }}
                        className="flex-1 h-[44px] rounded-[8px] flex items-center justify-center transition-transform duration-75 active:scale-[0.98]"
                        style={kbStyles.key}
                    >
                        <span className="text-[15px] font-normal text-[#8e8e93] select-none">
                            {isTrackpadMode ? '' : 'space'}
                        </span>
                    </button>

                    {/* . key */}
                    <button
                        type="button"
                        onClick={() => handleKeyTap('.')}
                        className="w-[40px] h-[44px] rounded-[8px] flex items-center justify-center shrink-0 transition-transform duration-75 active:scale-[0.95]"
                        style={kbStyles.key}
                    >
                        <span className="text-[20px] font-medium select-none pointer-events-none">.</span>
                    </button>

                    {/* Send Button */}
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

            {/* Bottom safe area padding for iPhones with home indicator */}
            <div style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }} />
        </div>
    )
}
