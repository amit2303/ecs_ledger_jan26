'use client'

import React, { useState, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

interface LeaveDeductionModalProps {
    isOpen: boolean
    onClose: () => void
    employeeName: string
    defaultBaseSalary: number
    defaultMonth?: string
    initialLeaves?: number
    initialDescription?: string
    isEditing?: boolean
    onApply: (data: {
        baseSalary: number
        leaves: number
        deduction: number
        netSalary: number
        month: string
        description: string
    }) => Promise<void> | void
}

export function LeaveDeductionModal({
    isOpen,
    onClose,
    employeeName,
    defaultBaseSalary,
    defaultMonth,
    initialLeaves = 0,
    isEditing = false,
    onApply,
}: LeaveDeductionModalProps) {
    const [leaves, setLeaves] = useState<number>(initialLeaves > 0 ? initialLeaves : 1)
    const [applying, setApplying] = useState<boolean>(false)

    useEffect(() => {
        if (isOpen) {
            setLeaves(initialLeaves > 0 ? initialLeaves : 1)
            setApplying(false)
            document.body.style.overflow = 'hidden'
            document.body.classList.add('modal-open')
        } else {
            document.body.style.overflow = ''
            document.body.classList.remove('modal-open')
        }
        return () => {
            document.body.style.overflow = ''
            document.body.classList.remove('modal-open')
        }
    }, [isOpen, initialLeaves])

    if (!isOpen) return null

    const baseSalary = Number(defaultBaseSalary) || 0
    // 30 days month calculation
    const dailyRate = baseSalary / 30
    const deduction = Math.round(dailyRate * leaves)
    const netSalary = Math.max(0, baseSalary - deduction)
    const month = defaultMonth || new Date().toISOString().slice(0, 7)
    const description =
        leaves > 0
            ? `${leaves} leave${leaves === 1 ? '' : 's'} deducted (-₹${deduction.toLocaleString('en-IN')})`
            : ''

    const handleApply = async () => {
        setApplying(true)
        try {
            await onApply({
                baseSalary,
                leaves,
                deduction,
                netSalary,
                month,
                description,
            })
            onClose()
        } catch (err) {
            console.error('Failed to apply leave deduction:', err)
        } finally {
            setApplying(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 ios-fade-in">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <div
                className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden ios-slide-up flex flex-col relative z-10"
                style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
                    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                }}
            >
                {/* iOS Handle */}
                <div className="ios-handle" />

                {/* Header */}
                <div className="px-5 pt-1 pb-3 flex justify-between items-center border-b border-gray-100">
                    <button
                        onClick={onClose}
                        className="text-ios-blue text-[17px] active:opacity-60 transition-opacity"
                    >
                        Cancel
                    </button>
                    <div className="text-center">
                        <h3 className="font-semibold text-[17px] text-gray-900 leading-tight">
                            {defaultMonth ? (() => {
                                const parts = defaultMonth.split('-')
                                if (parts.length >= 2) {
                                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1)
                                    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                                }
                                return 'Deduct Leaves'
                            })() : 'Deduct Leaves'}
                        </h3>
                        <p className="text-[12px] text-ios-gray truncate max-w-[200px]">
                            {employeeName} · Deduct Leaves
                        </p>
                    </div>
                    <button
                        onClick={handleApply}
                        disabled={applying}
                        className="text-ios-blue text-[17px] font-semibold disabled:opacity-40 active:opacity-60 transition-opacity"
                    >
                        {applying ? 'Saving...' : 'Apply'}
                    </button>
                </div>

                {/* Body: Just the clean stepper & salary result */}
                <div className="p-6 flex flex-col items-center">
                    <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider mb-4">
                        NUMBER OF LEAVES
                    </span>

                    {/* Counter Row: [ - ]  COUNT  [ + ] */}
                    <div className="flex items-center justify-center gap-6 w-full max-w-xs">
                        <button
                            type="button"
                            onClick={() => setLeaves((prev) => Math.max(0, prev - 1))}
                            disabled={leaves <= 0}
                            className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-800 active:bg-gray-200 disabled:opacity-30 transition-all shadow-sm cursor-pointer"
                        >
                            <Minus className="w-6 h-6 stroke-[2.5]" />
                        </button>

                        <div className="text-center min-w-[100px]">
                            <span className="text-[44px] font-bold text-gray-900 tabular-nums leading-none block">
                                {leaves}
                            </span>
                            <span className="text-[13px] text-ios-gray font-medium mt-1 block">
                                {leaves === 1 ? 'day' : 'days'}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setLeaves((prev) => prev + 1)}
                            className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-800 active:bg-gray-200 transition-all shadow-sm cursor-pointer"
                        >
                            <Plus className="w-6 h-6 stroke-[2.5]" />
                        </button>
                    </div>

                    {/* Quick Net Salary Result */}
                    <div className="mt-6 w-full bg-[#F2F2F7] rounded-2xl p-4 text-center">
                        <span className="text-[12px] text-ios-gray uppercase tracking-wider font-semibold block mb-0.5">
                            Payable Salary
                        </span>
                        <div className="text-[28px] font-bold text-gray-900 tabular-nums leading-tight">
                            ₹{netSalary.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[13px] text-ios-gray mt-1">
                            {leaves > 0 ? (
                                <span className="text-ios-red font-medium">
                                    -₹{deduction.toLocaleString('en-IN')} ({leaves}d @ ₹{Math.round(dailyRate)}/day)
                                </span>
                            ) : (
                                <span>Full Salary (no leaves)</span>
                            )}
                        </p>
                    </div>

                    {/* Apply Button */}
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={applying}
                        className="w-full mt-5 py-3.5 bg-ios-blue text-white rounded-xl font-semibold text-[16px] ios-press disabled:opacity-40 transition-opacity flex items-center justify-center shadow-sm cursor-pointer"
                    >
                        {applying ? 'Saving...' : `Apply ₹${netSalary.toLocaleString('en-IN')}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
