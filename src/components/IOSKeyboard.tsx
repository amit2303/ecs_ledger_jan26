'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Delete, ArrowUp, ChevronDown } from 'lucide-react'

interface IOSKeyboardProps {
    isOpen: boolean
    onClose: () => void
    onKeyPress: (char: string) => void
    onBackspace: () => void
    onSend: () => void
    isFormValid: boolean
    sending?: boolean
}

type KeyboardMode = 'letters' | 'numbers' | 'symbols'

export function IOSKeyboard({
    isOpen,
    onClose,
    onKeyPress,
    onBackspace,
    onSend,
    isFormValid,
    sending = false
}: IOSKeyboardProps) {
    const [mode, setMode] = useState<KeyboardMode>('letters')
    const backspaceIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const backspaceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Trigger subtle tactile haptic if supported
    const triggerHaptic = useCallback(() => {
        try {
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(8)
            }
        } catch (_) {}
    }, [])

    const handleKeyTap = (char: string) => {
        triggerHaptic()
        onKeyPress(char)
    }

    const handleBackspaceStart = () => {
        triggerHaptic()
        onBackspace()
        // Start rapid delete if held down
        backspaceTimeoutRef.current = setTimeout(() => {
            backspaceIntervalRef.current = setInterval(() => {
                triggerHaptic()
                onBackspace()
            }, 60)
        }, 400)
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

    if (!isOpen) return null

    return (
        <div 
            className="w-full bg-[#D1D5DB] border-t border-[#B9BFC8] select-none touch-manipulation z-30 pb-safe shadow-2xl animate-in slide-in-from-bottom-2 duration-150"
            style={{ WebkitUserSelect: 'none' }}
        >
            {/* Minimal iOS Top Bar with Dismiss and Quick Action Buttons */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#C7CBD2] border-b border-[#B9BFC8] text-gray-700">
                <div className="flex items-center gap-2">
                    {/* Quick + and - shortcuts for instant transaction start */}
                    <button
                        type="button"
                        onClick={() => handleKeyTap('+')}
                        className="px-3 py-0.5 rounded-md bg-white/80 active:bg-white text-[13px] font-bold text-emerald-700 shadow-2xs active:scale-95 transition-all"
                    >
                        + Payment
                    </button>
                    <button
                        type="button"
                        onClick={() => handleKeyTap('-')}
                        className="px-3 py-0.5 rounded-md bg-white/80 active:bg-white text-[13px] font-bold text-red-600 shadow-2xs active:scale-95 transition-all"
                    >
                        - Expense
                    </button>
                </div>
                
                {/* Dismiss keyboard button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded-md text-gray-600 hover:text-gray-900 active:bg-gray-300 transition-colors flex items-center gap-1 text-[12px] font-medium"
                    title="Hide Keyboard"
                >
                    <span>Done</span>
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>

            {/* KEYBOARD ROWS */}
            <div className="flex flex-col gap-[7px] p-[5px] pb-2 max-w-lg mx-auto">
                {/* 1. LETTERS MODE (QWERTY) */}
                {mode === 'letters' && (
                    <>
                        {/* Row 1 */}
                        <div className="flex justify-center gap-[5px]">
                            {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[20px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        {/* Row 2 */}
                        <div className="flex justify-center gap-[5px] px-[12px]">
                            {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[20px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        {/* Row 3 */}
                        <div className="flex justify-center gap-[5px]">
                            <button
                                type="button"
                                onClick={() => setMode('numbers')}
                                className="w-[42px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-[15px] font-medium text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                            >
                                123
                            </button>
                            {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[20px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                            <button
                                type="button"
                                onMouseDown={handleBackspaceStart}
                                onMouseUp={handleBackspaceEnd}
                                onMouseLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                                className="w-[42px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                            >
                                <Delete className="w-5 h-5 stroke-[1.8]" />
                            </button>
                        </div>
                    </>
                )}

                {/* 2. NUMBERS MODE */}
                {mode === 'numbers' && (
                    <>
                        {/* Row 1 */}
                        <div className="flex justify-center gap-[5px]">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[20px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        {/* Row 2 */}
                        <div className="flex justify-center gap-[5px]">
                            {['-', '+', '/', ':', ';', '(', ')', '₹', '&', '@'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[19px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        {/* Row 3 */}
                        <div className="flex justify-center gap-[5px]">
                            <button
                                type="button"
                                onClick={() => setMode('symbols')}
                                className="w-[48px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-[14px] font-medium text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                            >
                                #+=
                            </button>
                            {['.', ',', '?', '!', "'", '"', '%'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[19px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                            <button
                                type="button"
                                onMouseDown={handleBackspaceStart}
                                onMouseUp={handleBackspaceEnd}
                                onMouseLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                                className="w-[48px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                            >
                                <Delete className="w-5 h-5 stroke-[1.8]" />
                            </button>
                        </div>
                    </>
                )}

                {/* 3. SYMBOLS MODE (#+=) */}
                {mode === 'symbols' && (
                    <>
                        {/* Row 1 */}
                        <div className="flex justify-center gap-[5px]">
                            {['[', ']', '{', '}', '#', '%', '^', '*', '+', '='].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[19px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        {/* Row 2 */}
                        <div className="flex justify-center gap-[5px]">
                            {['_', '\\', '|', '~', '<', '>', '$', '€', '£', '•'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[19px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                        </div>

                        {/* Row 3 */}
                        <div className="flex justify-center gap-[5px]">
                            <button
                                type="button"
                                onClick={() => setMode('numbers')}
                                className="w-[48px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-[14px] font-medium text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                            >
                                123
                            </button>
                            {['.', ',', '?', '!', "'", '"', '`'].map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => handleKeyTap(k)}
                                    className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[19px] font-normal text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    {k}
                                </button>
                            ))}
                            <button
                                type="button"
                                onMouseDown={handleBackspaceStart}
                                onMouseUp={handleBackspaceEnd}
                                onMouseLeave={handleBackspaceEnd}
                                onTouchStart={handleBackspaceStart}
                                onTouchEnd={handleBackspaceEnd}
                                className="w-[48px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                            >
                                <Delete className="w-5 h-5 stroke-[1.8]" />
                            </button>
                        </div>
                    </>
                )}

                {/* Row 4 (Common to all modes: Switch, @, Space, ., Send) */}
                <div className="flex justify-center gap-[5px] mt-[1px]">
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'letters' ? 'numbers' : 'letters')}
                        className="w-[50px] sm:w-[58px] h-[43px] bg-[#ACB3BE] active:bg-white rounded-[6px] text-[15px] font-medium text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                    >
                        {mode === 'letters' ? '123' : 'ABC'}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleKeyTap('@')}
                        className="w-[38px] sm:w-[42px] h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[18px] font-medium text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                    >
                        @
                    </button>

                    <button
                        type="button"
                        onClick={() => handleKeyTap(' ')}
                        className="flex-1 h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[14px] font-normal text-gray-500 shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center transition-colors"
                    >
                        space
                    </button>

                    <button
                        type="button"
                        onClick={() => handleKeyTap('.')}
                        className="w-[38px] sm:w-[42px] h-[43px] bg-white active:bg-[#BFC3CD] rounded-[6px] text-[20px] font-medium text-black shadow-[0_1px_0_rgba(0,0,0,0.35)] flex items-center justify-center shrink-0 transition-colors"
                    >
                        .
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (isFormValid && !sending) {
                                triggerHaptic()
                                onSend()
                            }
                        }}
                        disabled={!isFormValid || sending}
                        className={`w-[68px] sm:w-[76px] h-[43px] rounded-[6px] text-[15px] font-semibold flex items-center justify-center gap-1 shrink-0 transition-all ${
                            isFormValid && !sending
                                ? 'bg-[#007AFF] active:bg-[#0051A8] text-white shadow-[0_1px_0_rgba(0,0,0,0.35)] cursor-pointer'
                                : 'bg-[#ACB3BE]/70 text-gray-400 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                    </button>
                </div>
            </div>
        </div>
    )
}
