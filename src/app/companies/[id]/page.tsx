'use client'

import { useEffect, useState, use, useRef } from 'react'
import { ChevronLeft, Plus, ChevronRight, Pencil, Trash2, X, Save, Calendar, MoreVertical, Download, FileText, PauseCircle, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { ActionSheet } from '@/components/ActionSheet'
import { exportToExcel, exportCompanyFullReport } from '@/utils/exportToExcel'


interface Transaction {
    id: number
    date: string
    description: string
    amount?: number
    charges?: { amount: number }[]
    payments?: { amount: number }[]
    hasUpdates?: boolean
}

interface CompanyDetail {
    id: number
    name: string
    type: 'CLIENT' | 'VENDOR'
    address: string
    ledgerLink: string
    director: string
    contact: string
    email: string
    totalPackageAmount: number
    totalPaymentsReceived: number
    netDue: number
    packages: Transaction[]
    payments: Transaction[]
    isOnHold?: boolean
}

export default function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [company, setCompany] = useState<CompanyDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Edit Company State
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        diaryNumber: '',
        name: '',
        address: '',
        director: '',
        contact: '',
        email: ''
    })
    const [saving, setSaving] = useState(false)

    // Package Actions State
    const [selectedPackage, setSelectedPackage] = useState<Transaction | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isPkgEditModalOpen, setIsPkgEditModalOpen] = useState(false)
    const [pkgEditForm, setPkgEditForm] = useState({ description: '', date: '' })



    // Company Action Sheet
    const [showCompanyActions, setShowCompanyActions] = useState(false)

    useEffect(() => {
        fetchData()
        fetchData()
    }, [id])


    const fetchData = async () => {
        try {
            const res = await fetch(`/api/companies/${id}`)
            if (!res.ok) {
                const errPayload = await res.json().catch(() => ({}))
                throw new Error(errPayload.error || `Error ${res.status}: Failed to fetch company`)
            }
            const data = await res.json()
            setCompany(data)
            const rawName = (data.name || '').trim()
            const match = rawName.match(/^(\d+(?:\.\d+)?)\.?\s*(.*)$/)
            const sNo = match ? match[1] : ''
            const displayName = match && match[2] ? match[2].trim() : rawName
            setEditForm({
                diaryNumber: sNo,
                name: displayName,
                address: data.address || '',
                director: data.director || '',
                contact: data.contact || '',
                email: data.email || ''
            })
        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateCompany = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setSaving(true)
        try {
            const finalName = editForm.diaryNumber.trim()
                ? `${editForm.diaryNumber.trim()}.  ${editForm.name.trim()}`
                : editForm.name.trim()

            const res = await fetch(`/api/companies/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: finalName,
                    address: editForm.address,
                    director: editForm.director,
                    contact: editForm.contact,
                    email: editForm.email
                })
            })

            if (!res.ok) throw new Error('Failed to update company')

            await fetchData()
            setIsEditing(false)
        } catch (err) {
            console.error(err)
            alert('Failed to update company')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteCompany = async () => {
        if (!confirm('Are you sure you want to delete this company?')) return

        try {
            const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to delete company')
            router.push('/')
        } catch (err: any) {
            alert(err.message)
        }
    }

    // Package Long Press Handlers
    const handlePackageLongPress = (pkg: Transaction) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedPackage(pkg)
        setIsSheetOpen(true)
    }

    const handleEditPackageClick = () => {
        if (!selectedPackage) return
        setPkgEditForm({
            description: selectedPackage.description,
            date: selectedPackage.date.split('T')[0]
        })
        setIsPkgEditModalOpen(true)
    }

    const handleDeletePackageClick = async () => {
        if (!selectedPackage) return

        // Client-side dependency check
        const hasCharges = (selectedPackage.charges?.length ?? 0) > 0
        const hasPayments = (selectedPackage.payments?.length ?? 0) > 0

        if (hasCharges || hasPayments) {
            alert('Cannot delete package because it has associated charges or payments. Please delete them first.')
            return
        }

        if (!confirm('Are you sure you want to delete this package?')) return

        try {
            const res = await fetch(`/api/packages/${selectedPackage.id}`, { method: 'DELETE' })
            const data = await res.json()

            if (!res.ok) {
                alert(data.error || 'Failed to delete package')
            } else {
                fetchData()
            }
        } catch (err: any) {
            alert('Failed to delete package')
        }
    }

    const handleUpdatePackage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPackage) return
        setSaving(true)
        try {
            const res = await fetch(`/api/packages/${selectedPackage.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...pkgEditForm, date: new Date(pkgEditForm.date).toISOString() })
            })
            if (!res.ok) throw new Error('Failed to update package')
            await fetchData()
            setIsPkgEditModalOpen(false)
        } catch (err) {
            alert('Failed to update package')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Loading...</div>
    if (error) return <div className="flex h-screen items-center justify-center text-ios-red p-4 text-[15px]">{error}</div>
    if (!company) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Company not found</div>

    return (
        <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: '#F2F2F7' }}>
            {/* Header */}
            <header className="shrink-0 z-10" style={{ backgroundColor: '#F2F2F7' }}>
                <div className="flex items-center gap-1 px-1 py-2">
                    <Link href="/" className="shrink-0 text-ios-blue active:opacity-60 transition-opacity flex items-center gap-0.5 pl-1 pr-2">
                        <ChevronLeft className="w-[22px] h-[22px]" />
                        <span className="text-[17px]">Back</span>
                    </Link>

                    <div className="flex-1 min-w-0 text-center">
                        {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="text"
                                    placeholder="No"
                                    value={editForm.diaryNumber}
                                    onChange={e => setEditForm({ ...editForm, diaryNumber: e.target.value })}
                                    className="w-12 text-[17px] font-bold text-center text-gray-900 bg-transparent border-b-2 border-ios-blue outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="flex-1 text-[17px] font-semibold text-center text-gray-900 bg-transparent border-b-2 border-ios-blue outline-none"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <h1 className="text-[17px] font-semibold text-gray-900 truncate">
                                    {(() => {
                                        const rawName = (company.name || '').trim()
                                        const match = rawName.match(/^(\d+(?:\.\d+)?)\.?\s*(.*)$/)
                                        return match && match[2] ? `${match[1]} ${match[2].trim()}` : company.name
                                    })()}
                                </h1>
                                {company.isOnHold && (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded-full font-semibold bg-ios-orange/15 text-ios-orange shrink-0">
                                        Hold
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Header Actions */}
                    <div className="shrink-0 pr-2">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsEditing(false)} className="text-ios-blue text-[17px]">Cancel</button>
                                <button onClick={() => handleUpdateCompany()} disabled={saving} className="text-ios-blue text-[17px] font-semibold">{saving ? '...' : 'Save'}</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowCompanyActions(true)} className="p-1 text-ios-blue active:opacity-60 transition-opacity">
                                <MoreVertical className="w-[22px] h-[22px]" />
                            </button>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="px-4 pb-4 space-y-2.5">
                        {/* Company Edit Fields */}
                        <input
                            placeholder="Address"
                            value={editForm.address}
                            onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            className="ios-input"
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                            <input
                                placeholder="Director"
                                value={editForm.director}
                                onChange={e => setEditForm({ ...editForm, director: e.target.value })}
                                className="ios-input"
                            />
                            <input
                                placeholder="Contact"
                                value={editForm.contact}
                                onChange={e => setEditForm({ ...editForm, contact: e.target.value })}
                                className="ios-input"
                            />
                        </div>
                        <input
                            placeholder="Email"
                            value={editForm.email}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="ios-input"
                        />
                    </div>
                )}

                {!isEditing && (
                    <div className="px-4 pb-3">
                        <div className="ios-card p-3.5">
                            {/* Top: TOTAL PACKAGE */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100">
                                <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider">TOTAL PACKAGE</span>
                                <span className="text-[17px] font-semibold text-gray-900 tabular-nums">
                                    ₹{company.totalPackageAmount.toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Bottom: NET DUE (left) & TOTAL PAID (right) */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider block mb-0.5">NET DUE</span>
                                    <span className={`text-[19px] font-bold tabular-nums ${company.netDue > 0 ? 'text-ios-red' : company.netDue < 0 ? 'text-ios-green' : 'text-ios-blue'}`}>
                                        {company.netDue < 0 ? `- ₹${Math.abs(company.netDue).toLocaleString('en-IN')}` : `₹${company.netDue.toLocaleString('en-IN')}`}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[12px] font-semibold text-ios-gray uppercase tracking-wider block mb-0.5">TOTAL PAID</span>
                                    <span className="text-[19px] font-bold text-ios-green tabular-nums">
                                        ₹{company.totalPaymentsReceived.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Content — Package List */}
            <div className="flex-1 flex flex-col min-h-0 mt-3">
                {/* List Header */}
                <div className="flex justify-between items-center px-8 pb-2 text-[12px] font-semibold text-ios-gray uppercase tracking-wider select-none">
                    <span>PACKAGES</span>
                    <span className="pr-6">AMOUNT</span>
                </div>

                <div className="flex-1 overflow-y-auto ios-scroll px-4 pb-44">
                    {company.packages.length === 0 ? (
                        <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">No packages added.</div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {company.packages.map((pkg: any) => (
                                <PackageItem
                                    key={pkg.id}
                                    pkg={pkg}
                                    companyId={company.id}
                                    onLongPress={() => handlePackageLongPress(pkg)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB above BottomNav */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-40">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
                    <Link
                        href={`/companies/${id}/packages/new`}
                        className="absolute right-5 w-14 h-14 bg-ios-blue text-white rounded-full flex items-center justify-center ios-press pointer-events-auto shadow-[0_6px_20px_rgba(0,122,255,0.4)]"
                        style={{ bottom: 'calc(56px + max(8px, env(safe-area-inset-bottom, 8px)) + 12px)' }}
                    >
                        <Plus className="w-7 h-7" strokeWidth={2.5} />
                    </Link>
                </div>
            </div>

            <ActionSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                title={selectedPackage?.description}
                actions={[
                    {
                        label: 'Edit Package',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: handleEditPackageClick
                    },
                    {
                        label: 'Delete Package',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: handleDeletePackageClick
                    }
                ]}
            />

            {/* Company Actions Sheet */}
            <ActionSheet
                isOpen={showCompanyActions}
                onClose={() => setShowCompanyActions(false)}
                title={company.name}
                actions={[
                    {
                        label: company.isOnHold ? 'Unhold Company' : 'Hold Company',
                        icon: company.isOnHold ? (
                            <PlayCircle className="w-5 h-5 text-ios-green" />
                        ) : (
                            <PauseCircle className="w-5 h-5 text-ios-orange" />
                        ),
                        onClick: async () => {
                            setShowCompanyActions(false)
                            try {
                                const res = await fetch(`/api/companies/${company.id}/toggle-hold`, { method: 'POST' })
                                if (res.ok) {
                                    fetchData()
                                } else {
                                    const data = await res.json()
                                    alert(data.error || 'Failed to toggle hold status')
                                }
                            } catch (e) {
                                console.error('Failed to toggle hold', e)
                                alert('Failed to toggle hold status')
                            }
                        }
                    },
                    {
                        label: 'Edit Company',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: () => {
                            setShowCompanyActions(false)
                            setIsEditing(true)
                        }
                    },
                    {
                        label: 'Download Packages',
                        icon: <Download className="w-5 h-5" />,
                        onClick: () => {
                            if (!company || !company.packages) return
                            const data = company.packages.map((p: any) => ({
                                'Description': p.description,
                                'Amount': p.amount,
                                'Net Due': p.netDue,
                                'Total Paid': p.amount - p.netDue,
                                'Status': p.netDue > 0 ? 'Pending' : 'Paid',
                                'Created At': new Date(p.date || Date.now()).toLocaleDateString()
                            }))
                            exportToExcel(data, `${company.name}_Packages_${new Date().toISOString().split('T')[0]}`, 'Packages', `${company.name} - Packages List`)
                            setShowCompanyActions(false)
                        }
                    },
                    {
                        label: 'Download Full Report',
                        icon: <FileText className="w-5 h-5" />,
                        onClick: () => {
                            if (!company || !company.packages) return
                            exportCompanyFullReport(company.name, company.packages as any)
                            setShowCompanyActions(false)
                        }
                    },
                    {
                        label: 'Delete Company',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: () => {
                            setShowCompanyActions(false)
                            handleDeleteCompany()
                        }
                    }
                ]}
            />

            {/* Edit Package Modal — iOS Form Sheet */}
            {isPkgEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 ios-fade-in">
                    <div className="bg-white w-full max-w-md rounded-t-2xl overflow-hidden ios-slide-up">
                        <div className="ios-handle" />
                        <div className="px-4 pt-2 pb-3 flex justify-between items-center">
                            <button onClick={() => setIsPkgEditModalOpen(false)} className="text-ios-blue text-[17px]">Cancel</button>
                            <h3 className="font-semibold text-[17px] text-gray-900">Edit Package</h3>
                            <button
                                onClick={handleUpdatePackage}
                                disabled={saving}
                                className="text-ios-blue text-[17px] font-semibold disabled:opacity-40"
                            >
                                {saving ? '...' : 'Save'}
                            </button>
                        </div>
                        <form onSubmit={handleUpdatePackage} className="px-4 pb-8 space-y-3">
                            <input
                                className="ios-input"
                                placeholder="Description (e.g., Wedding 2024)"
                                value={pkgEditForm.description}
                                onChange={e => setPkgEditForm({ ...pkgEditForm, description: e.target.value })}
                            />
                            <input
                                type="date"
                                className="ios-input"
                                value={pkgEditForm.date}
                                onChange={e => setPkgEditForm({ ...pkgEditForm, date: e.target.value })}
                                required
                            />
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function PackageItem({ pkg, companyId, onLongPress }: { pkg: any, companyId: number, onLongPress: () => void }) {
    const router = useRouter()
    const pkgAmount = pkg.charges?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0
    const pkgTotalPaid = pkg.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
    const pkgBalance = pkgAmount - pkgTotalPaid
    const isPaid = pkgBalance <= 0

    const bind = useLongPress(() => {
        onLongPress()
    }, () => {
        router.push(`/companies/${companyId}/packages/${pkg.id}`)
    })

    return (
        <div
            {...bind}
            className="relative overflow-hidden rounded-2xl ios-press select-none cursor-pointer"
            style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}
        >
            <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex-1 pr-3 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-gray-900 leading-snug truncate">{pkg.description}</h3>
                    </div>
                    <p className="text-[13px] text-ios-gray mt-1">{new Date(pkg.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                        <span className="text-[14px] text-ios-gray block">₹{pkgAmount.toLocaleString('en-IN')}</span>
                        <span className={`text-[18px] font-semibold tabular-nums block ${pkgBalance > 0 ? 'text-ios-red' : pkgBalance < 0 ? 'text-ios-green' : 'text-ios-blue'}`}>
                            {pkgBalance < 0 ? `- ₹${Math.abs(pkgBalance).toLocaleString('en-IN')}` : `₹${pkgBalance.toLocaleString('en-IN')}`}
                        </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-ios-gray3" />
                </div>
            </div>
        </div>
    )
}


