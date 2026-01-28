'use client'

import { useEffect, useState, use } from 'react'
import { ChevronLeft, Plus, X, Save, Pencil, Trash2, MoreVertical, Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { exportStatementToExcel } from '@/utils/exportToExcel'
import { ActionSheet } from '@/components/ActionSheet'

interface Transaction {
    id: number
    date: string
    description: string
    amount: number
}

interface PackageDetail {
    id: number
    companyId: number
    description: string
    amount: number
    date: string
    payments: Transaction[]
    charges: Transaction[]
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
    const [chargeForm, setChargeForm] = useState({ description: '', amount: '' })
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

    useEffect(() => {
        fetchData()
    }, [id, packageId])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/companies/${id}`)
            if (!res.ok) throw new Error('Failed to fetch company')
            const companyData = await res.json()

            const foundPkg = companyData.packages.find((p: any) => p.id === Number(packageId))
            if (!foundPkg) throw new Error('Package not found')

            // Sort Charges: Oldest first (Newest at bottom)
            if (foundPkg.charges) {
                foundPkg.charges.sort((a: any, b: any) => a.id - b.id)
            }

            // Sort Payments: Oldest date first (Newest at bottom)
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
                    amount: chargeForm.amount,
                    date: new Date().toISOString()
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
        if (!confirm('Currently, deleting a charge is permanent. Continue?')) return // Simplified confirmation
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
        setChargeForm({ description: charge.description, amount: String(charge.amount) })
        setShowAddCharge(true)
    }

    const resetChargeForm = () => {
        setChargeForm({ description: '', amount: '' })
        setEditingChargeId(null)
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

    // Payment Handlers (Reuse similar logic if possible but for simplicity duplicating basic delete)
    // Note: Edit Payment is missing form UI in original, so I will add a DELETE button only for now unless requested.
    // Plan said: "Add Edit and Delete buttons for each payment".
    // I will add Delete for sure. For Edit, I'll need a form. Currently there is no "New Payment" form on this page, it's a link to `/payment/new`.
    // So for editing payment, it's tricky. I'll just add Delete for now, and Edit button that alerts "Not implemented" or redirects if I had a route.
    // Actually, I can implement inline delete easily.

    // Correction: There is a link to `/companies/${id}/packages/${pkg.id}/payment/new`.
    // So I should probably modify the Payment implementation to be inline or simply add Delete.
    // Given the task size, I'll prioritize Delete. I'll add a Delete button.

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

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>
    if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>
    if (!pkg) return <div className="flex h-screen items-center justify-center text-gray-400">Package not found</div>

    const pkgTotalAmount = pkg.charges?.reduce((sum, c) => sum + Number(c.amount), 0) || 0
    const pkgTotalPaid = pkg.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const pkgBalance = pkgTotalAmount - pkgTotalPaid

    // ... existing helpers ...

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
        <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2 p-2">
                    <Link href={`/companies/${id}`} className="p-2 text-gray-500 hover:text-gray-900">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        {isEditingPkg ? (
                            <input
                                value={pkgEditForm.description}
                                onChange={e => setPkgEditForm({ ...pkgEditForm, description: e.target.value })}
                                className="w-full text-lg font-bold text-ecs-blue border-b border-ecs-blue outline-none"
                                autoFocus
                            />
                        ) : (
                            <h1 className="text-lg font-bold text-ecs-blue leading-tight truncate">{pkg.description}</h1>
                        )}
                    </div>

                    {/* Package Actions */}
                    <div className="flex items-center gap-1 pr-2">
                        {isEditingPkg ? (
                            <>
                                <button onClick={() => setIsEditingPkg(false)} className="p-2 text-gray-400"><X className="w-4 h-4" /></button>
                                <button onClick={handleUpdatePackage} className="p-2 text-ecs-blue"><Save className="w-4 h-4" /></button>
                            </>
                        ) : (
                            <button onClick={() => setShowPkgActions(true)} className="p-2 text-gray-400 hover:text-ecs-blue">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="px-5 pb-5 pt-4 text-sm border-t border-gray-50 mt-2">
                    <div className="mb-3">
                        <div className="flex flex-col">
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Charges</p>
                            <p className="font-medium text-gray-900 text-xl">₹{pkgTotalAmount.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8">
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Net Due</p>
                            <span className={`text-lg font-bold ${pkgBalance > 0 ? 'text-ecs-red' : 'text-green-600'}`}>
                                ₹{pkgBalance.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Paid</p>
                            <p className="font-medium text-green-600 text-lg">₹{pkgTotalPaid.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-t border-gray-50">
                    <button
                        onClick={() => setActiveTab('AMOUNT')}
                        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'AMOUNT' ? 'text-ecs-blue border-b-2 border-ecs-blue bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 bg-white'}`}
                    >
                        Charges
                    </button>
                    <button
                        onClick={() => setActiveTab('PAYMENTS')}
                        className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === 'PAYMENTS' ? 'text-ecs-blue border-b-2 border-ecs-blue bg-blue-50/50' : 'text-gray-500 hover:text-gray-700 bg-white'}`}
                    >
                        Payments
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto ios-scroll p-4">
                {activeTab === 'AMOUNT' ? (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {/* Add/Edit Charge Form */}
                            {showAddCharge ? (
                                <form onSubmit={handleSaveCharge} className="bg-white rounded-xl shadow-md border border-blue-100 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">{editingChargeId ? 'Edit Charge' : 'New Charge'}</h3>
                                    <div>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Description (e.g. Extra Samples)"
                                            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-gold outline-none transition-all"
                                            value={chargeForm.description}
                                            onChange={e => setChargeForm({ ...chargeForm, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Amount"
                                            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-gold outline-none transition-all"
                                            value={chargeForm.amount}
                                            onChange={e => {
                                                const val = e.target.value
                                                if (Number(val) < 0) return
                                                setChargeForm({ ...chargeForm, amount: val })
                                            }}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetChargeForm}
                                            className="flex-1 py-2 text-sm font-semibold text-gray-500 bg-gray-100 rounded-lg active:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingCharge}
                                            className="flex-1 py-2 text-sm font-semibold text-white bg-ecs-blue rounded-lg shadow active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                        >
                                            {savingCharge ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
                                        </button>
                                    </div>
                                </form>
                            ) : null}

                            {/* Charges List */}
                            {(pkg.charges || []).length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-4 italic">No charges added yet.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {(pkg.charges || []).map((charge) => (
                                        <ChargeItem
                                            key={charge.id}
                                            charge={charge}
                                            onLongPress={() => handleChargeLongPress(charge)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-3">
                            {/* Add Payment Form */}
                            {showAddPayment ? (
                                <form onSubmit={handleSavePayment} className="bg-white rounded-xl shadow-md border border-blue-100 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">{editingPaymentId ? 'Edit Payment' : 'New Payment'}</h3>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-3 py-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-gold outline-none transition-all"
                                                value={paymentForm.date}
                                                onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Amount"
                                                className="w-full px-3 py-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-gold outline-none transition-all"
                                                value={paymentForm.amount}
                                                onChange={e => {
                                                    const val = e.target.value
                                                    if (Number(val) < 0) return
                                                    setPaymentForm({ ...paymentForm, amount: val })
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Description (optional)"
                                            className="w-full px-3 py-3 border border-gray-200 rounded-lg text-base bg-gray-50 focus:bg-white focus:ring-2 focus:ring-ecs-gold outline-none transition-all"
                                            value={paymentForm.description}
                                            onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetPaymentForm}
                                            className="flex-1 py-2 text-sm font-semibold text-gray-500 bg-gray-100 rounded-lg active:bg-gray-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={savingPayment}
                                            className="flex-1 py-2 text-sm font-semibold text-white bg-ecs-blue rounded-lg shadow active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                        >
                                            {savingPayment ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
                                        </button>
                                    </div>
                                </form>
                            ) : null}

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {pkg.payments.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 py-8">No payments received yet.</p>
                                ) : (
                                    <ul className="divide-y divide-gray-50">
                                        {pkg.payments.map((pay) => (
                                            <PaymentItem
                                                key={pay.id}
                                                payment={pay}
                                                onLongPress={() => handlePaymentLongPress(pay)}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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

            {/* Floating Action Button (FAB) */}
            {/* Floating Action Button (FAB) Wrapper */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
                    <button
                        onClick={() => {
                            if (activeTab === 'AMOUNT') {
                                // Toggle add charge form
                                if (showAddCharge) {
                                    resetChargeForm()
                                } else {
                                    setShowAddCharge(true)
                                }
                            } else {
                                // Toggle add payment form
                                if (showAddPayment) {
                                    resetPaymentForm()
                                } else {
                                    setShowAddPayment(true)
                                }
                            }
                        }}
                        className="absolute bottom-6 right-6 w-14 h-14 bg-ecs-blue text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
                    >
                        {(activeTab === 'AMOUNT' && showAddCharge) || (activeTab === 'PAYMENTS' && showAddPayment) ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
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
                title={`Payment: ₹${selectedPayment?.amount}`}
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
        </div>
    )
}

function ChargeItem({ charge, onLongPress }: { charge: Transaction, onLongPress: () => void }) {
    const bind = useLongPress(onLongPress, undefined, { delay: 500 }) // allow default click/scroll unless long press triggers? Actually no onClick needed here unless we want to do something.
    // If no onClick is passed, click does nothing (which is fine, these are just items).
    // EXCEPT: we still want selection/focus if needed? No, just visual.

    return (
        <li
            {...bind}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex justify-between items-center group relative active:bg-gray-50 select-none cursor-pointer"
        >
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-900 break-words">{charge.description}</p>
                {/* Date removed as per request */}
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-ecs-blue">₹{Number(charge.amount).toLocaleString('en-IN')}</span>
                {/* No visible buttons */}
            </div>
        </li>
    )
}

function PaymentItem({ payment, onLongPress }: { payment: Transaction, onLongPress: () => void }) {
    const bind = useLongPress(onLongPress, undefined, { delay: 500 })

    return (
        <li
            {...bind}
            className="p-4 flex justify-between items-center group active:bg-gray-50 select-none cursor-pointer"
        >
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-gray-900 break-words">{payment.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(payment.date).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-green-600">+ ₹{Number(payment.amount).toLocaleString('en-IN')}</span>
                {/* No visible buttons */}
            </div>
        </li>
    )
}
