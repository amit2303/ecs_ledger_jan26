'use client'

import { useEffect, useState, use, useRef } from 'react'
import { ChevronLeft, Plus, Pencil, Trash2, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { ActionSheet } from '@/components/ActionSheet'

interface SalaryEntry {
    id: number
    month: string
    amount: number
    description: string | null
    createdAt: string
}

interface SalaryPayment {
    id: number
    amount: number
    description: string | null
    date: string
    createdAt: string
}

interface EmployeeDetail {
    id: number
    name: string
    salary: number
    designation: string | null
    address: string | null
    totalSalary: number
    totalPaid: number
    balance: number
    salaryEntries: SalaryEntry[]
    salaryPayments: SalaryPayment[]
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [employee, setEmployee] = useState<EmployeeDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'SALARY' | 'PAYMENTS'>('SALARY')

    // Employee Edit
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', salary: '', designation: '', address: '' })
    const [saving, setSaving] = useState(false)
    const [showActions, setShowActions] = useState(false)

    // Add Salary Entry
    const [showAddSalary, setShowAddSalary] = useState(false)
    const [salaryForm, setSalaryForm] = useState({
        month: new Date().toISOString().slice(0, 7),
        amount: '',
        description: '',
    })
    const [savingSalary, setSavingSalary] = useState(false)
    const salaryAmountRef = useRef<HTMLInputElement>(null)

    // Add Payment
    const [showAddPayment, setShowAddPayment] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
    })
    const [savingPayment, setSavingPayment] = useState(false)
    const paymentAmountRef = useRef<HTMLInputElement>(null)

    // Action Sheets for entries
    const [selectedSalaryEntry, setSelectedSalaryEntry] = useState<SalaryEntry | null>(null)
    const [isSalarySheetOpen, setIsSalarySheetOpen] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null)
    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    useEffect(() => {
        if (showAddSalary) {
            setTimeout(() => salaryAmountRef.current?.focus(), 50)
        }
    }, [showAddSalary])

    useEffect(() => {
        if (showAddPayment) {
            setTimeout(() => paymentAmountRef.current?.focus(), 50)
        }
    }, [showAddPayment])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/employees/${id}`)
            if (!res.ok) throw new Error('Failed to fetch employee')
            const data = await res.json()
            setEmployee(data)
            setEditForm({
                name: data.name,
                salary: String(data.salary),
                designation: data.designation || '',
                address: data.address || '',
            })
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateEmployee = async () => {
        if (!employee) return
        setSaving(true)
        try {
            const res = await fetch(`/api/employees/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    salary: editForm.salary,
                    designation: editForm.designation || null,
                    address: editForm.address || null,
                }),
            })
            if (!res.ok) throw new Error('Failed to update employee')
            await fetchData()
            setIsEditing(false)
        } catch (err) {
            console.error(err)
            alert('Failed to update employee')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteEmployee = async () => {
        if (!confirm('Delete this employee? All salary entries and payments will be removed.')) return
        try {
            const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete employee')
            router.push('/employee-payments')
        } catch (err) {
            console.error(err)
            alert('Failed to delete employee')
        }
    }

    const handleAddSalaryEntry = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!salaryForm.amount) return
        setSavingSalary(true)
        try {
            const res = await fetch(`/api/employees/${id}/salary-entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    month: salaryForm.month,
                    amount: Number(salaryForm.amount),
                    description: salaryForm.description || null,
                }),
            })
            if (!res.ok) throw new Error('Failed to add salary entry')
            await fetchData()
            setSalaryForm({
                month: new Date().toISOString().slice(0, 7),
                amount: employee ? String(employee.salary) : '',
                description: '',
            })
            setShowAddSalary(false)
        } catch (err) {
            console.error(err)
            alert('Failed to add salary entry')
        } finally {
            setSavingSalary(false)
        }
    }

    const handleDeleteSalaryEntry = async (entryId: number) => {
        if (!confirm('Delete this salary entry?')) return
        try {
            const res = await fetch(`/api/salary-entries/${entryId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete salary entry')
            await fetchData()
        } catch (err) {
            console.error(err)
            alert('Failed to delete salary entry')
        }
    }

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!paymentForm.amount) return
        setSavingPayment(true)
        try {
            const res = await fetch(`/api/employees/${id}/salary-payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(paymentForm.amount),
                    description: paymentForm.description || null,
                    date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString(),
                }),
            })
            if (!res.ok) throw new Error('Failed to add payment')
            await fetchData()
            setPaymentForm({
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
            })
            setShowAddPayment(false)
        } catch (err) {
            console.error(err)
            alert('Failed to add payment')
        } finally {
            setSavingPayment(false)
        }
    }

    const handleDeletePayment = async (payId: number) => {
        if (!confirm('Delete this payment?')) return
        try {
            const res = await fetch(`/api/salary-payments/${payId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete payment')
            await fetchData()
        } catch (err) {
            console.error(err)
            alert('Failed to delete payment')
        }
    }

    const handleSalaryLongPress = (entry: SalaryEntry) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedSalaryEntry(entry)
        setIsSalarySheetOpen(true)
    }

    const handlePaymentLongPress = (payment: SalaryPayment) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedPayment(payment)
        setIsPaymentSheetOpen(true)
    }

    const formatMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-')
        const date = new Date(Number(year), Number(month) - 1)
        return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    }

    if (loading) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Loading...</div>
    if (error) return <div className="flex h-screen items-center justify-center text-ios-red text-[15px]">{error}</div>
    if (!employee) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Employee not found</div>

    return (
        <div className="absolute inset-0 flex flex-col w-full h-full overflow-hidden" style={{ backgroundColor: '#F2F2F7' }}>
            <header className="shrink-0 z-10" style={{ backgroundColor: '#F2F2F7' }}>
                {/* Nav Row */}
                <div className="flex items-center gap-1 px-1 py-2">
                    <Link href="/employee-payments" className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2">
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </Link>
                    <div className="flex-1 min-w-0 text-center">
                        {isEditing ? (
                            <div className="flex flex-col gap-1 w-full">
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full text-[17px] font-semibold text-center text-gray-900 bg-transparent border-b-2 border-ios-blue outline-none"
                                    autoFocus
                                    placeholder="Name"
                                />
                                <input
                                    type="number"
                                    value={editForm.salary}
                                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                                    className="w-full text-[13px] text-center text-ios-gray bg-transparent border-b border-ios-gray4 outline-none py-1"
                                    placeholder="Monthly Salary"
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-[17px] font-semibold text-gray-900 leading-tight truncate">{employee.name}</h1>
                                <p className="text-[13px] text-ios-gray mt-0.5">
                                    {employee.designation || 'Employee'} · ₹{employee.salary.toLocaleString('en-IN')}/mo
                                </p>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 pr-2">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-ios-blue text-[17px]">Cancel</button>
                                <button onClick={handleUpdateEmployee} disabled={saving} className="text-ios-blue text-[17px] font-semibold disabled:opacity-40">
                                    {saving ? '...' : 'Save'}
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setShowActions(true)} className="p-1 text-ios-blue active:opacity-60 transition-opacity">
                                <MoreVertical className="w-[22px] h-[22px]" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Edit fields for designation/address */}
                {isEditing && (
                    <div className="px-4 pb-3 space-y-2.5">
                        <input
                            placeholder="Designation"
                            value={editForm.designation}
                            onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                            className="ios-input"
                        />
                        <input
                            placeholder="Address"
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="ios-input"
                        />
                    </div>
                )}

                {/* Stats Row */}
                {!isEditing && (
                    <div className="px-4 pb-3">
                        <div className="ios-card p-3.5">
                            {/* Top: TOTAL SALARY */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100">
                                <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider">TOTAL SALARY</span>
                                <span className="text-[17px] font-semibold text-gray-900 tabular-nums">
                                    ₹{employee.totalSalary.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Bottom: BALANCE DUE (left) & TOTAL PAID (right) */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider block mb-0.5">BALANCE DUE</span>
                                    <span className={`text-[19px] font-bold tabular-nums ${employee.balance > 0 ? 'text-ios-red' : employee.balance < 0 ? 'text-ios-green' : 'text-ios-blue'}`}>
                                        {employee.balance < 0 ? `- ₹${Math.abs(employee.balance).toLocaleString('en-IN')}` : `₹${employee.balance.toLocaleString('en-IN')}`}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider block mb-0.5">TOTAL PAID</span>
                                    <span className="text-[19px] font-bold text-ios-green tabular-nums">
                                        ₹{employee.totalPaid.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* iOS Segmented Control — Tabs */}
                <div className="px-4 pb-3">
                    <div className="ios-segmented">
                        <button
                            onClick={() => setActiveTab('SALARY')}
                            className={`ios-segmented-btn ${activeTab === 'SALARY' ? 'active' : ''}`}
                        >
                            Salary
                        </button>
                        <button
                            onClick={() => setActiveTab('PAYMENTS')}
                            className={`ios-segmented-btn ${activeTab === 'PAYMENTS' ? 'active' : ''}`}
                        >
                            Payments
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto ios-scroll px-4 pt-3 pb-24">
                    {activeTab === 'SALARY' ? (
                        <div className="space-y-4">
                            {/* Add Salary Form */}
                            {showAddSalary && (
                                <form onSubmit={handleAddSalaryEntry} className="ios-card p-4 space-y-3 ios-scale-in">
                                    <h3 className="text-[15px] font-semibold text-gray-900">Add Salary Entry</h3>
                                    <input
                                        type="month"
                                        required
                                        className="ios-input"
                                        value={salaryForm.month}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                                    />
                                    <input
                                        ref={salaryAmountRef}
                                        type="number"
                                        min="0"
                                        placeholder="Amount"
                                        className="ios-input"
                                        value={salaryForm.amount}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        className="ios-input"
                                        value={salaryForm.description}
                                        onChange={(e) => setSalaryForm({ ...salaryForm, description: e.target.value })}
                                    />
                                    <div className="flex gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddSalary(false)}
                                            className="flex-1 py-3 text-[15px] font-medium text-ios-blue rounded-xl active:opacity-60 transition-opacity"
                                            style={{ backgroundColor: 'rgba(0,122,255,0.08)' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingSalary}
                                            className="flex-1 py-3 text-[15px] font-semibold text-white bg-ios-blue rounded-xl ios-press disabled:opacity-50"
                                        >
                                            {savingSalary ? 'Saving...' : 'Add'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Salary Entries List */}
                            {employee.salaryEntries.length === 0 ? (
                                <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">
                                    No salary entries yet.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {employee.salaryEntries.map((entry) => (
                                        <SalaryEntryItem
                                            key={entry.id}
                                            entry={entry}
                                            formatMonth={formatMonth}
                                            onLongPress={() => handleSalaryLongPress(entry)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Add Payment Form */}
                            {showAddPayment && (
                                <form onSubmit={handleAddPayment} className="ios-card p-4 space-y-3 ios-scale-in">
                                    <h3 className="text-[15px] font-semibold text-gray-900">Add Payment</h3>
                                    <input
                                        type="date"
                                        required
                                        className="ios-input"
                                        value={paymentForm.date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                    />
                                    <input
                                        ref={paymentAmountRef}
                                        type="number"
                                        min="0"
                                        placeholder="Amount"
                                        className="ios-input"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        className="ios-input"
                                        value={paymentForm.description}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                    />
                                    <div className="flex gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddPayment(false)}
                                            className="flex-1 py-3 text-[15px] font-medium text-ios-blue rounded-xl active:opacity-60 transition-opacity"
                                            style={{ backgroundColor: 'rgba(0,122,255,0.08)' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingPayment}
                                            className="flex-1 py-3 text-[15px] font-semibold text-white bg-ios-blue rounded-xl ios-press disabled:opacity-50"
                                        >
                                            {savingPayment ? 'Saving...' : 'Add'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Payments List */}
                            {employee.salaryPayments.length === 0 ? (
                                <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">
                                    No payments recorded yet.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {employee.salaryPayments.map((payment) => (
                                        <PaymentItem
                                            key={payment.id}
                                            payment={payment}
                                            onLongPress={() => handlePaymentLongPress(payment)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
                    <button
                        onClick={() => {
                            if (activeTab === 'SALARY') {
                                setSalaryForm({
                                    month: new Date().toISOString().slice(0, 7),
                                    amount: String(employee.salary),
                                    description: '',
                                })
                                setShowAddSalary(true)
                            } else {
                                setShowAddPayment(true)
                            }
                        }}
                        className="absolute bottom-[102px] right-5 w-14 h-14 bg-ios-blue text-white rounded-full flex items-center justify-center ios-press pointer-events-auto"
                        style={{ boxShadow: '0 4px 14px rgba(0,122,255,0.4)' }}
                    >
                        <Plus className="w-7 h-7" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Employee Actions Sheet */}
            <ActionSheet
                isOpen={showActions}
                onClose={() => setShowActions(false)}
                title={employee.name}
                actions={[
                    {
                        label: 'Edit Employee',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: () => {
                            setShowActions(false)
                            setIsEditing(true)
                        },
                    },
                    {
                        label: 'Delete Employee',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => {
                            setShowActions(false)
                            handleDeleteEmployee()
                        },
                    },
                ]}
            />

            {/* Salary Entry Action Sheet */}
            <ActionSheet
                isOpen={isSalarySheetOpen}
                onClose={() => setIsSalarySheetOpen(false)}
                title={selectedSalaryEntry ? formatMonth(selectedSalaryEntry.month) : undefined}
                actions={[
                    {
                        label: 'Delete Salary Entry',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => {
                            if (selectedSalaryEntry) handleDeleteSalaryEntry(selectedSalaryEntry.id)
                        },
                    },
                ]}
            />

            {/* Payment Action Sheet */}
            <ActionSheet
                isOpen={isPaymentSheetOpen}
                onClose={() => setIsPaymentSheetOpen(false)}
                title={selectedPayment ? `₹${selectedPayment.amount.toLocaleString('en-IN')}` : undefined}
                actions={[
                    {
                        label: 'Delete Payment',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => {
                            if (selectedPayment) handleDeletePayment(selectedPayment.id)
                        },
                    },
                ]}
            />
        </div>
    )
}

function SalaryEntryItem({
    entry,
    formatMonth,
    onLongPress,
}: {
    entry: SalaryEntry
    formatMonth: (m: string) => string
    onLongPress: () => void
}) {
    const bind = useLongPress(() => onLongPress())

    return (
        <div
            {...bind}
            id={`salary-${entry.id}`}
            className="ios-card px-4 py-3.5 select-none"
            style={{ cursor: 'default' }}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-[15px] font-semibold text-gray-900 truncate">
                        {formatMonth(entry.month)}
                    </h4>
                    {entry.description && (
                        <p className="text-[13px] text-ios-gray mt-0.5 truncate">{entry.description}</p>
                    )}
                </div>
                <span className="text-[17px] font-semibold text-gray-900 tabular-nums shrink-0">
                    ₹{entry.amount.toLocaleString('en-IN')}
                </span>
            </div>
        </div>
    )
}

function PaymentItem({
    payment,
    onLongPress,
}: {
    payment: SalaryPayment
    onLongPress: () => void
}) {
    const bind = useLongPress(() => onLongPress())

    return (
        <div
            {...bind}
            id={`payment-${payment.id}`}
            className="ios-card px-4 py-3.5 select-none"
            style={{ cursor: 'default' }}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-[15px] font-semibold text-gray-900 truncate">
                        {payment.description || 'Payment'}
                    </h4>
                    <p className="text-[13px] text-ios-gray mt-0.5">
                        {new Date(payment.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </p>
                </div>
                <span className="text-[17px] font-semibold text-ios-green tabular-nums shrink-0">
                    ₹{payment.amount.toLocaleString('en-IN')}
                </span>
            </div>
        </div>
    )
}
