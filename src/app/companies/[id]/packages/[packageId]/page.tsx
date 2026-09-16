'use client'

import { useEffect, useState, use, useRef } from 'react'
import { ChevronLeft, Plus, X, Save, Pencil, Trash2, MoreVertical, Download, Upload, FileText, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { exportStatementToExcel } from '@/utils/exportToExcel'
import { ActionSheet } from '@/components/ActionSheet'
import imageCompression from 'browser-image-compression'
import { QuickLookModal } from '@/components/QuickLookModal'

interface Transaction {
    id: number
    date: string
    description: string
    amount: number
    hasUpdates?: boolean
}

interface PackageDetail {
    id: number
    companyId: number
    description: string
    amount: number
    date: string
    payments: Transaction[]
    charges: Transaction[]
    monthlyCharges?: any[]
    documents?: { id: number; url: string; name: string; type: string }[]
}

export default function PackagePage({ params }: { params: Promise<{ id: string, packageId: string }> }) {
    const { id, packageId } = use(params)
    const router = useRouter()
    const [pkg, setPkg] = useState<PackageDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'AMOUNT' | 'PAYMENTS'>('AMOUNT')

    // Package Edit State
    const [isEditingPkg, setIsEditingPkg] = useState(false)
    const [pkgEditForm, setPkgEditForm] = useState({ description: '', date: '' })
    const [showPkgActions, setShowPkgActions] = useState(false)

    // Charge State
    const [showAddCharge, setShowAddCharge] = useState(false)
    const [editingChargeId, setEditingChargeId] = useState<number | null>(null)
    const [chargeForm, setChargeForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0] })
    const [isDiscount, setIsDiscount] = useState(false)
    const [savingCharge, setSavingCharge] = useState(false)

    // Action Sheet States
    const [selectedCharge, setSelectedCharge] = useState<Transaction | null>(null)
    const [isChargeSheetOpen, setIsChargeSheetOpen] = useState(false)

    const [selectedPayment, setSelectedPayment] = useState<Transaction | null>(null)
    const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false)

    // Payment Form State
    const [showAddPayment, setShowAddPayment] = useState(false)
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
    const [paymentForm, setPaymentForm] = useState({ description: '', paymentMode: 'CASH', amount: '', date: new Date().toISOString().split('T')[0] })
    const [savingPayment, setSavingPayment] = useState(false)

    // Document State
    const fileInputRef = useRef<HTMLInputElement>(null)
    const chargeAmountRef = useRef<HTMLInputElement>(null)
    const paymentAmountRef = useRef<HTMLInputElement>(null)
    const [documents, setDocuments] = useState<any[]>([])
    const [selectedDoc, setSelectedDoc] = useState<any>(null)
    const [showDocActions, setShowDocActions] = useState(false)
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null)

    // Monthly Charge State
    const [showAddMonthlyCharge, setShowAddMonthlyCharge] = useState(false)
    const [monthlyChargeForm, setMonthlyChargeForm] = useState({ description: '', amount: '' })
    const [savingMonthlyCharge, setSavingMonthlyCharge] = useState(false)
    const monthlyChargeAmountRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showAddMonthlyCharge) {
            setTimeout(() => monthlyChargeAmountRef.current?.focus(), 50)
        }
    }, [showAddMonthlyCharge])

    useEffect(() => {
        if (showAddCharge) {
            setTimeout(() => chargeAmountRef.current?.focus(), 50)
        }
    }, [showAddCharge])

    useEffect(() => {
        if (showAddPayment) {
            setTimeout(() => paymentAmountRef.current?.focus(), 50)
        }
    }, [showAddPayment])

    useEffect(() => {
        fetchData()
    }, [id, packageId])

    useEffect(() => {
        if (pkg?.id) fetchDocuments()
    }, [pkg?.id])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/companies/${id}`)
            if (!res.ok) throw new Error('Failed to fetch company')
            const companyData = await res.json()

            const foundPkg = companyData.packages.find((p: any) => p.id === Number(packageId))
            if (!foundPkg) throw new Error('Package not found')

            // Sort Charges: Oldest at the top, newest at the bottom
            if (foundPkg.charges) {
                foundPkg.charges.sort((a: any, b: any) => {
                    const dateA = new Date(a.date).getTime()
                    const dateB = new Date(b.date).getTime()
                    if (dateA !== dateB) return dateA - dateB
                    return a.id - b.id
                })
            }

            // Sort Payments: Oldest at the top, newest at the bottom
            if (foundPkg.payments) {
                foundPkg.payments.sort((a: any, b: any) => {
                    const dateA = new Date(a.date).getTime()
                    const dateB = new Date(b.date).getTime()
                    if (dateA !== dateB) return dateA - dateB
                    return a.id - b.id
                })
            }

            setPkg(foundPkg)
            setPkgEditForm({
                description: foundPkg.description,
                date: foundPkg.date ? new Date(foundPkg.date).toISOString().split('T')[0] : ''
            })
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePackage = async () => {
        if (!pkg) return
        try {
            const res = await fetch(`/api/packages/${pkg.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkgEditForm)
            })
            if (!res.ok) throw new Error('Failed to update package')
            await fetchData()
            setIsEditingPkg(false)
        } catch (err) {
            console.error(err)
            alert('Failed to update package')
        }
    }

    const handleDeletePackage = async () => {
        if (!pkg) return
        if (!confirm('Are you sure you want to delete this package?')) return
        try {
            const res = await fetch(`/api/packages/${pkg.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete package')
            }
            router.push(`/companies/${id}`)
        } catch (err: any) {
            console.error(err)
            alert(err.message)
        }
    }

    const handleSaveCharge = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pkg) return
        setSavingCharge(true)
        try {
            const isEdit = editingChargeId !== null
            const url = isEdit ? `/api/charges/${editingChargeId}` : `/api/packages/${pkg.id}/charges`
            const method = isEdit ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: chargeForm.description,
                    amount: isDiscount ? -Math.abs(Number(chargeForm.amount)) : Math.abs(Number(chargeForm.amount)),
                    date: chargeForm.date ? new Date(chargeForm.date).toISOString() : new Date().toISOString()
                })
            })

            if (!res.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'add'} charge`)

            await fetchData()
            resetChargeForm()
        } catch (err) {
            console.error(err)
            alert('Failed to save charge')
        } finally {
            setSavingCharge(false)
        }
    }

    const handleDeleteCharge = async (chargeId: number) => {
        if (!confirm('Currently, deleting a charge is permanent. Continue?')) return
        try {
            const res = await fetch(`/api/charges/${chargeId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete charge')
            await fetchData()
        } catch (err) {
            console.error(err)
            alert('Failed to delete charge')
        }
    }

    const handleEditChargeClick = (charge: Transaction) => {
        setEditingChargeId(charge.id)
        const amt = Number(charge.amount)
        setIsDiscount(amt < 0)
        setChargeForm({
            description: charge.description,
            amount: String(Math.abs(amt)),
            date: new Date(charge.date).toISOString().split('T')[0]
        })
        setShowAddCharge(true)
    }

    const resetChargeForm = () => {
        setChargeForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] })
        setEditingChargeId(null)
        setIsDiscount(false)
        setShowAddCharge(false)
    }

    const handleEditPaymentClick = (payment: Transaction) => {
        setEditingPaymentId(payment.id)
        setPaymentForm({
            description: payment.description,
            amount: String(payment.amount),
            date: new Date(payment.date).toISOString().split('T')[0],
            paymentMode: 'CASH'
        })
        setShowAddPayment(true)
    }

    const handleSaveMonthlyCharge = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!monthlyChargeForm.description || !monthlyChargeForm.amount) return
        setSavingMonthlyCharge(true)
        try {
            const res = await fetch(`/api/packages/${packageId}/monthly-charges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(monthlyChargeForm)
            })
            if (!res.ok) throw new Error('Failed to create monthly charge')
            setMonthlyChargeForm({ description: '', amount: '' })
            setShowAddMonthlyCharge(false)
            await fetchData()
        } catch (err: any) {
            alert(err.message || 'Error saving monthly charge')
        } finally {
            setSavingMonthlyCharge(false)
        }
    }

    const handleDeleteMonthlyCharge = async (mcId: number, desc: string) => {
        if (!confirm(`Delete recurring monthly charge "${desc}"? (Existing generated charges will remain)`)) return
        try {
            const res = await fetch(`/api/monthly-charges/${mcId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete monthly charge')
            await fetchData()
        } catch (err: any) {
            alert(err.message || 'Error deleting monthly charge')
        }
    }

    const handleDeletePayment = async (payId: number) => {
        if (!confirm('Delete this payment?')) return
        try {
            const res = await fetch(`/api/payments/${payId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete payment')
            await fetchData()
        } catch (err) {
            console.error(err)
            alert('Failed to delete payment')
        }
    }

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pkg) return
        setSavingPayment(true)
        try {
            const isEdit = editingPaymentId !== null
            const url = isEdit ? `/api/payments/${editingPaymentId}` : '/api/payments'
            const method = isEdit ? 'PUT' : 'POST'

            const body = isEdit ? {
                amount: paymentForm.amount,
                description: paymentForm.description,
                date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString()
            } : {
                packageId: pkg.id,
                amount: paymentForm.amount,
                description: paymentForm.description,
                date: paymentForm.date ? new Date(paymentForm.date).toISOString() : new Date().toISOString()
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'add'} payment`)

            await fetchData()
            resetPaymentForm()
        } catch (err) {
            console.error(err)
            alert('Failed to save payment')
        } finally {
            setSavingPayment(false)
        }
    }

    const resetPaymentForm = () => {
        setPaymentForm({ description: '', paymentMode: 'CASH', amount: '', date: new Date().toISOString().split('T')[0] })
        setEditingPaymentId(null)
        setShowAddPayment(false)
    }

    const fetchDocuments = async () => {
        if (!process.env.NEXT_PUBLIC_API_URL && !window.location.origin) return
        try {
            const res = await fetch(`/api/packages/${packageId}/documents`)
            if (res.ok) {
                const docs = await res.json()
                setDocuments(docs)
            }
        } catch (e) { console.error(e) }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !pkg) return

        const options = {
            maxSizeMB: 10,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.6
        }

        const compressedFiles: File[] = []
        for (const file of Array.from(e.target.files)) {
            if (file.type.startsWith('image/')) {
                try {
                    console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`)
                    const compressedFile = await imageCompression(file, options)
                    compressedFiles.push(new File([compressedFile], file.name, { type: file.type }))
                } catch (error) {
                    console.error('Compression failed:', error)
                    compressedFiles.push(file)
                }
            } else {
                compressedFiles.push(file)
            }
        }

        const formData = new FormData()
        compressedFiles.forEach(file => {
            formData.append('files', file)
        })

        try {
            const res = await fetch(`/api/packages/${pkg.id}/documents`, {
                method: 'POST',
                body: formData
            })
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.details || errorData.error || 'Upload failed')
            }
            await fetchDocuments()
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (err: any) {
            console.error(err)
            alert(`Failed to upload files: ${err.message}`)
        }
    }

    const handleDeleteDocument = async (docId: number) => {
        if (!confirm('Delete this file?')) return
        try {
            const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Delete failed')
            await fetchDocuments()
        } catch (err) {
            alert('Failed to delete file')
        }
    }

    const handleDocLongPress = (doc: any) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedDoc(doc)
        setShowDocActions(true)
    }

    if (loading) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Loading...</div>
    if (error) return <div className="flex h-screen items-center justify-center text-ios-red text-[15px]">{error}</div>
    if (!pkg) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Package not found</div>

    const pkgTotalAmount = pkg.charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
    const pkgTotalPaid = pkg.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const pkgBalance = pkgTotalAmount - pkgTotalPaid

    const handleChargeLongPress = (charge: Transaction) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedCharge(charge)
        setIsChargeSheetOpen(true)
    }

    const handlePaymentLongPress = (payment: Transaction) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedPayment(payment)
        setIsPaymentSheetOpen(true)
    }

    return (
        <div className="absolute inset-0 flex flex-col w-full h-full overflow-hidden" style={{ backgroundColor: '#F2F2F7' }}>
            <header className="shrink-0 z-10" style={{ backgroundColor: '#F2F2F7' }}>
                {/* Nav Row */}
                <div className="flex items-center gap-1 px-1 py-2">
                    <Link href={`/companies/${id}`} className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2">
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </Link>
                    <div className="flex-1 min-w-0 text-center">
                        {isEditingPkg ? (
                            <div className="flex flex-col gap-1 w-full">
                                <input
                                    value={pkgEditForm.description}
                                    onChange={e => setPkgEditForm({ ...pkgEditForm, description: e.target.value })}
                                    className="w-full text-[17px] font-semibold text-center text-gray-900 bg-transparent border-b-2 border-ios-blue outline-none"
                                    autoFocus
                                    placeholder="Description"
                                />
                                <input
                                    type="date"
                                    value={pkgEditForm.date}
                                    onChange={e => setPkgEditForm({ ...pkgEditForm, date: e.target.value })}
                                    className="w-full text-[13px] text-center text-ios-gray bg-transparent border-b border-ios-gray4 outline-none py-1"
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="text-[17px] font-semibold text-gray-900 leading-tight truncate">{pkg.description}</h1>
                                <p className="text-[13px] text-ios-gray mt-0.5">{pkg.date ? new Date(pkg.date).toLocaleDateString() : 'No Date'}</p>
                            </>
                        )}
                    </div>

                    {/* Package Actions */}
                    <div className="shrink-0 pr-2">
                        {isEditingPkg ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditingPkg(false)} className="text-ios-blue text-[17px]">Cancel</button>
                                <button onClick={handleUpdatePackage} className="text-ios-blue text-[17px] font-semibold">Save</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowPkgActions(true)} className="p-1 text-ios-blue active:opacity-60 transition-opacity">
                                <MoreVertical className="w-[22px] h-[22px]" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="px-4 pb-3">
                    <div className="ios-card p-3.5">
                        {/* Top: TOTAL PACKAGE */}
                        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100">
                            <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider">TOTAL PACKAGE</span>
                            <span className="text-[17px] font-semibold text-gray-900 tabular-nums">
                                ₹{pkgTotalAmount.toLocaleString('en-IN')}
                            </span>
                        </div>

                        {/* Bottom: NET DUE (left) & TOTAL PAID (right) */}
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider block mb-0.5">NET DUE</span>
                                <span className={`text-[19px] font-bold tabular-nums ${pkgBalance > 0 ? 'text-ios-red' : pkgBalance < 0 ? 'text-ios-green' : 'text-ios-blue'}`}>
                                    {pkgBalance < 0 ? `- ₹${Math.abs(pkgBalance).toLocaleString('en-IN')}` : `₹${pkgBalance.toLocaleString('en-IN')}`}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider block mb-0.5">TOTAL PAID</span>
                                <span className="text-[19px] font-bold text-ios-green tabular-nums">
                                    ₹{pkgTotalPaid.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* iOS Segmented Control — Tabs */}
                <div className="px-4 pb-3">
                    <div className="ios-segmented">
                        <button
                            onClick={() => setActiveTab('AMOUNT')}
                            className={`ios-segmented-btn ${activeTab === 'AMOUNT' ? 'active' : ''}`}
                        >
                            Charges
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
                    {activeTab === 'AMOUNT' ? (
                        <div className="space-y-4">
                            {/* Monthly Charges Section */}
                            <div className="space-y-2">
                                {!showAddMonthlyCharge && (
                                    <div className="flex justify-end px-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddMonthlyCharge(true)}
                                            className="text-[13px] font-semibold text-ios-blue flex items-center gap-1 active:opacity-60"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Monthly Charges
                                        </button>
                                    </div>
                                )}

                                {/* Add Monthly Charge Form */}
                                {showAddMonthlyCharge && (
                                    <form onSubmit={handleSaveMonthlyCharge} className="ios-card p-4 space-y-3 ios-scale-in">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[15px] font-semibold text-gray-900">New Monthly Charge</h3>
                                            <span className="text-[11px] text-ios-gray font-medium">Repeats 1st of every month</span>
                                        </div>
                                        <input
                                            ref={monthlyChargeAmountRef}
                                            autoFocus
                                            type="number"
                                            min="0"
                                            placeholder="Amount (e.g. 5000)"
                                            className="ios-input"
                                            value={monthlyChargeForm.amount}
                                            onChange={e => setMonthlyChargeForm({ ...monthlyChargeForm, amount: e.target.value })}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description (e.g. BIS management)"
                                            className="ios-input"
                                            value={monthlyChargeForm.description}
                                            onChange={e => setMonthlyChargeForm({ ...monthlyChargeForm, description: e.target.value })}
                                            required
                                        />
                                        <div className="flex gap-2.5 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowAddMonthlyCharge(false)
                                                    setMonthlyChargeForm({ description: '', amount: '' })
                                                }}
                                                className="flex-1 py-3 text-[15px] font-medium text-ios-blue rounded-xl active:opacity-60 transition-opacity"
                                                style={{ backgroundColor: 'rgba(0,122,255,0.08)' }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={savingMonthlyCharge}
                                                className="flex-1 py-3 text-[15px] font-semibold text-white bg-ios-blue rounded-xl ios-press disabled:opacity-50"
                                            >
                                                {savingMonthlyCharge ? 'Saving...' : 'Add Monthly Charge'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Monthly Charges List */}
                                {(pkg.monthlyCharges || []).length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {(pkg.monthlyCharges || []).map((mc: any) => (
                                            <div
                                                key={mc.id}
                                                className="ios-card px-4 py-3 flex items-center justify-between"
                                            >
                                                <div className="flex-1 min-w-0 pr-3">
                                                    <h4 className="text-[15px] font-semibold text-gray-900 truncate">{mc.description}</h4>
                                                    <p className="text-[12px] text-ios-gray mt-0.5">Repeats on 1st of every month</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="text-[16px] font-semibold text-gray-900 tabular-nums">
                                                        ₹{Number(mc.amount).toLocaleString('en-IN')}<span className="text-[11px] text-ios-gray font-normal">/mo</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMonthlyCharge(mc.id, mc.description)}
                                                        className="p-1.5 text-ios-gray hover:text-ios-red active:opacity-60 transition-colors"
                                                        title="Delete Monthly Charge"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>


                            {/* Add/Edit Charge Form */}
                            {showAddCharge && (
                                <form onSubmit={handleSaveCharge} className="ios-card p-4 space-y-3 ios-scale-in">
                                    <h3 className="text-[15px] font-semibold text-gray-900">{editingChargeId ? 'Edit Charge' : 'New Charge'}</h3>
                                    <input
                                        type="date"
                                        required
                                        className="ios-input"
                                        value={chargeForm.date}
                                        onChange={e => setChargeForm({ ...chargeForm, date: e.target.value })}
                                    />
                                    <input
                                        ref={chargeAmountRef}
                                        autoFocus
                                        type="number"
                                        min="0"
                                        placeholder="Amount"
                                        className="ios-input"
                                        value={chargeForm.amount}
                                        onChange={e => {
                                            const val = e.target.value
                                            if (Number(val) < 0) return
                                            setChargeForm({ ...chargeForm, amount: val })
                                        }}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        className="ios-input"
                                        value={chargeForm.description}
                                        onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
                                    />
                                    <label className="flex items-center gap-2.5 py-1">
                                        <input
                                            type="checkbox"
                                            className="w-[22px] h-[22px] rounded accent-ios-blue"
                                            checked={isDiscount}
                                            onChange={e => setIsDiscount(e.target.checked)}
                                        />
                                        <span className="text-[15px] text-gray-900">Apply as Discount</span>
                                    </label>
                                    <div className="flex gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={resetChargeForm}
                                            className="flex-1 py-3 text-[15px] font-medium text-ios-blue rounded-xl active:opacity-60 transition-opacity"
                                            style={{ backgroundColor: 'rgba(0,122,255,0.08)' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingCharge}
                                            className="flex-1 py-3 text-[15px] font-semibold text-white bg-ios-blue rounded-xl ios-press disabled:opacity-50"
                                        >
                                            {savingCharge ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Charges List */}
                            {(pkg.charges || []).length === 0 ? (
                                <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">No charges added yet.</div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {(pkg.charges || []).map((charge) => (
                                        <ChargeItem
                                            key={charge.id}
                                            charge={charge}
                                            onLongPress={() => handleChargeLongPress(charge)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Documents Section */}
                            <div className="space-y-2 pt-2">
                                <p className="ios-section-label px-0">Documents</p>

                                {documents.length === 0 ? (
                                    <div className="ios-card p-6 text-center text-ios-gray text-[15px]">
                                        No documents attached.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {documents.map((doc: any) => (
                                            <DocumentItem
                                                key={doc.id}
                                                doc={doc}
                                                onLongPress={() => handleDocLongPress(doc)}
                                                onDelete={() => handleDeleteDocument(doc.id)}
                                                onPreview={(d) => {
                                                    if (d.type?.startsWith('image/')) {
                                                        setPreviewDoc({ url: d.url, name: d.name })
                                                    } else {
                                                        window.open(d.url, '_blank')
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Add Payment Form */}
                            {showAddPayment && (
                                <form onSubmit={handleSavePayment} className="ios-card p-4 space-y-3 ios-scale-in">
                                    <h3 className="text-[15px] font-semibold text-gray-900">{editingPaymentId ? 'Edit Payment' : 'New Payment'}</h3>
                                    <input
                                        type="date"
                                        required
                                        className="ios-input"
                                        value={paymentForm.date}
                                        onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                    />
                                    <input
                                        ref={paymentAmountRef}
                                        autoFocus
                                        type="number"
                                        min="0"
                                        placeholder="Amount"
                                        className="ios-input"
                                        value={paymentForm.amount}
                                        onChange={e => {
                                            const val = e.target.value
                                            if (Number(val) < 0) return
                                            setPaymentForm({ ...paymentForm, amount: val })
                                        }}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description (optional)"
                                        className="ios-input"
                                        value={paymentForm.description}
                                        onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                    />
                                    <div className="flex gap-2.5 pt-1">
                                        <button
                                            type="button"
                                            onClick={resetPaymentForm}
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
                                            {savingPayment ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Payments List */}
                            {(pkg.payments || []).length === 0 ? (
                                <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">No payments added yet.</div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {(pkg.payments || []).map((payment: any) => (
                                        <PaymentItem
                                            key={payment.id}
                                            payment={payment}
                                            onLongPress={() => handlePaymentLongPress(payment)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Documents Section */}
                            <div className="space-y-2 pt-2">
                                <p className="ios-section-label px-0">Documents</p>
                                {documents.length === 0 ? (
                                    <div className="ios-card p-6 text-center text-ios-gray text-[15px]">
                                        No documents attached.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                        {documents.map((doc: any) => (
                                            <DocumentItem
                                                key={doc.id}
                                                doc={doc}
                                                onLongPress={() => handleDocLongPress(doc)}
                                                onDelete={() => handleDeleteDocument(doc.id)}
                                                onPreview={(d) => {
                                                    if (d.type?.startsWith('image/')) {
                                                        setPreviewDoc({ url: d.url, name: d.name })
                                                    } else {
                                                        window.open(d.url, '_blank')
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Package Actions Sheet */}
            <ActionSheet
                isOpen={showPkgActions}
                onClose={() => setShowPkgActions(false)}
                title={pkg.description}
                actions={[
                    {
                        label: 'Download Statement',
                        icon: <Download className="w-5 h-5" />,
                        onClick: () => {
                            if (!pkg) return
                            exportStatementToExcel(
                                pkg.charges || [],
                                pkg.payments || [],
                                `${pkg.description}_Statement_${new Date().toISOString().split('T')[0]}`,
                                `${pkg.description} - Statement`
                            )
                            setShowPkgActions(false)
                        }
                    },
                    {
                        label: 'Edit Package',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: () => {
                            setShowPkgActions(false)
                            setIsEditingPkg(true)
                        }
                    },
                    {
                        label: 'Delete Package',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => {
                            setShowPkgActions(false)
                            handleDeletePackage()
                        }
                    }
                ]}
            />

            {/* Hidden File Input (Always mounted across all tabs) */}
            <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* Floating Action Buttons */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-6 left-5 w-14 h-14 bg-white text-ios-blue rounded-full flex items-center justify-center ios-press pointer-events-auto"
                        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
                    >
                        <Upload className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => {
                            if (activeTab === 'AMOUNT') {
                                if (showAddCharge) {
                                    resetChargeForm()
                                } else {
                                    setShowAddCharge(true)
                                }
                            } else if (activeTab === 'PAYMENTS') {
                                if (showAddPayment) {
                                    resetPaymentForm()
                                } else {
                                    setShowAddPayment(true)
                                }
                            }
                        }}
                        className="absolute bottom-6 right-5 w-14 h-14 bg-ios-blue text-white rounded-full flex items-center justify-center ios-press pointer-events-auto"
                        style={{ boxShadow: '0 4px 14px rgba(0,122,255,0.4)' }}
                    >
                        {(activeTab === 'AMOUNT' && showAddCharge) || (activeTab === 'PAYMENTS' && showAddPayment) ? <X className="w-7 h-7" strokeWidth={2.5} /> : <Plus className="w-7 h-7" strokeWidth={2.5} />}
                    </button>
                </div>
            </div>

            {/* Charge Action Sheet */}
            <ActionSheet
                isOpen={isChargeSheetOpen}
                onClose={() => setIsChargeSheetOpen(false)}
                title={selectedCharge?.description}
                actions={[
                    {
                        label: 'Edit Charge',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: () => selectedCharge && handleEditChargeClick(selectedCharge)
                    },
                    {
                        label: 'Delete Charge',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => selectedCharge && handleDeleteCharge(selectedCharge.id)
                    }
                ]}
            />

            {/* Payment Action Sheet */}
            <ActionSheet
                isOpen={isPaymentSheetOpen}
                onClose={() => setIsPaymentSheetOpen(false)}
                title={selectedPayment ? `Payment: ₹${selectedPayment.amount}` : 'Payment'}
                actions={[
                    {
                        label: 'Edit Payment',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: () => selectedPayment && handleEditPaymentClick(selectedPayment)
                    },
                    {
                        label: 'Delete Payment',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => selectedPayment && handleDeletePayment(selectedPayment.id)
                    }
                ]}
            />

            <ActionSheet
                isOpen={showDocActions}
                onClose={() => setShowDocActions(false)}
                title={selectedDoc?.name}
                actions={[
                    {
                        label: 'View File',
                        icon: <FileText className="w-5 h-5" />,
                        onClick: () => {
                            if (selectedDoc.type?.startsWith('image/')) {
                                setPreviewDoc({ url: selectedDoc.url, name: selectedDoc.name })
                            } else {
                                window.open(selectedDoc.url, '_blank')
                            }
                            setShowDocActions(false)
                        }
                    },
                    {
                        label: 'Delete File',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => {
                            if (selectedDoc) handleDeleteDocument(selectedDoc.id)
                            setShowDocActions(false)
                        }
                    }
                ]}
            />

            <QuickLookModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                url={previewDoc?.url || ''}
                alt={previewDoc?.name}
            />
        </div>
    )
}

function ChargeItem({ charge, onLongPress }: { charge: Transaction, onLongPress: () => void }) {
    const bind = useLongPress(onLongPress, undefined, { delay: 500 })
    const isDiscount = Number(charge.amount) < 0

    return (
        <div
            {...bind}
            className="relative overflow-hidden rounded-2xl ios-press select-none cursor-pointer"
            style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}
        >
            <div className="px-4 py-3 flex justify-between items-center">
                <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                        <p className="text-[16px] font-semibold text-gray-900 leading-snug truncate">{charge.description}</p>
                    </div>
                    <p className="text-[13px] text-ios-gray mt-0.5">{new Date(charge.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-[18px] font-semibold tabular-nums shrink-0 ${isDiscount ? 'text-ios-red' : 'text-gray-900'}`}>
                    {isDiscount ? '-' : ''}₹{Math.abs(Number(charge.amount)).toLocaleString('en-IN')}
                </span>
            </div>
        </div>
    )
}

function PaymentItem({ payment, onLongPress }: { payment: Transaction, onLongPress: () => void }) {
    const bind = useLongPress(onLongPress, undefined, { delay: 500 })

    return (
        <div
            {...bind}
            className="relative overflow-hidden rounded-2xl ios-press select-none cursor-pointer"
            style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}
        >
            <div className="px-4 py-3 flex justify-between items-center">
                <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                        <p className="text-[16px] font-semibold text-gray-900 leading-snug truncate">{payment.description}</p>
                    </div>
                    <p className="text-[13px] text-ios-gray mt-0.5">{new Date(payment.date).toLocaleDateString()}</p>
                </div>
                <span className="text-[18px] font-semibold text-ios-green tabular-nums shrink-0">+ ₹{Number(payment.amount).toLocaleString('en-IN')}</span>
            </div>
        </div>
    )
}

function DocumentItem({ doc, onLongPress, onDelete, onPreview }: { doc: any, onLongPress: () => void, onDelete: () => void, onPreview: (doc: any) => void }) {
    const bind = useLongPress(onLongPress, () => {
        onPreview(doc)
    })

    const isImage = doc.type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(doc.url || '')
    const uploadDate = doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
        : ''

    return (
        <div
            {...bind}
            className="group relative aspect-square rounded-2xl overflow-hidden ios-card cursor-pointer select-none ios-press"
        >
            {isImage ? (
                <img
                    src={doc.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center" style={{ backgroundColor: '#F2F2F7' }}>
                    <FileText className="w-8 h-8 text-ios-gray mb-1" />
                    <span className="text-[11px] font-semibold text-ios-gray uppercase">
                        {doc.type?.split('/')[1] || 'PDF'}
                    </span>
                </div>
            )}

            {/* Date Tag Overlay (Upload date only - no file name) */}
            {uploadDate && (
                <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 pt-5 pointer-events-none flex items-center justify-center" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
                    <span className="text-[11px] font-medium text-white/95 tracking-wide">
                        {uploadDate}
                    </span>
                </div>
            )}

            {/* Delete button (top-right corner) */}
            <button
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete()
                }}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                title="Delete document"
            >
                <X className="w-3.5 h-3.5 text-white" />
            </button>
        </div>
    )
}
