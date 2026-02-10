'use client'

import { useEffect, useState, use, useRef } from 'react'
import { ChevronLeft, Plus, ChevronRight, Pencil, Trash2, X, Save, Calendar, MoreVertical, Download, ArrowUpRight, FileText } from 'lucide-react'
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
        name: '',
        address: '',
        ledgerLink: '',
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
            setEditForm({
                name: data.name,
                address: data.address || '',
                ledgerLink: data.ledgerLink || '',
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

    // ... Company Update/Delete handlers (kept same, just removing buttons from UI where needed)
    const handleUpdateCompany = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch(`/api/companies/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
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

    if (loading) return <div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>
    if (error) return <div className="flex h-screen items-center justify-center text-red-500 p-4">{error}</div>
    if (!company) return <div className="flex h-screen items-center justify-center text-gray-400">Company not found</div>

    return (
        <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
            {/* Fixed Header: Static placement, shrink-0 */}
            <header className="bg-white border-b border-gray-200 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3 px-5 py-3 pt-4">
                    <Link href="/" className="shrink-0 text-gray-400 hover:text-gray-600 active:text-ecs-blue transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>

                    <div className="flex-1 min-w-0 mr-2">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full text-xl font-bold text-gray-900 border-b border-ecs-blue outline-none"
                                autoFocus
                            />
                        ) : (
                            <h1 className="text-xl font-bold text-gray-900 leading-none truncate">{company.name}</h1>
                        )}
                        <p className="text-xs text-gray-400 truncate mt-1">{company.address || 'No Address'}</p>
                    </div>

                    {/* Header Actions */}
                    <div className="flex shrink-0 gap-3">
                        {isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200">
                                    <X className="w-4 h-4" />
                                </button>
                                <button onClick={handleUpdateCompany} disabled={saving} className="p-2 text-white bg-ecs-blue rounded-full hover:bg-blue-700">
                                    <Save className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setShowCompanyActions(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="px-5 pb-5 grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2">
                        {/* Company Edit Fields */}
                        <input
                            placeholder="Address"
                            value={editForm.address}
                            onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                            className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                placeholder="Ledger Link (URL)"
                                value={editForm.ledgerLink}
                                onChange={e => setEditForm({ ...editForm, ledgerLink: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                            />
                            <input
                                placeholder="Director Name (Hidden in View)"
                                value={editForm.director}
                                onChange={e => setEditForm({ ...editForm, director: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                            />
                            <input
                                placeholder="Contact No"
                                value={editForm.contact}
                                onChange={e => setEditForm({ ...editForm, contact: e.target.value })}
                                className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                            />
                        </div>
                        <input
                            placeholder="Email"
                            value={editForm.email}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                        />
                    </div>
                )}

                {!isEditing && (
                    <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-y-3 gap-x-8 text-sm border-t border-gray-50 mt-2 pt-4">
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Net Due</p>
                            <span className={`text-lg font-bold ${company.netDue > 0 ? 'text-ecs-red' : 'text-green-600'}`}>
                                ₹{company.netDue.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Ledger Link</p>
                            {company.ledgerLink ? (
                                <a
                                    href={company.ledgerLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 font-bold text-ecs-blue truncate hover:underline group"
                                >
                                    OPEN
                                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                </a>
                            ) : (
                                <p className="font-medium text-gray-400 truncate">-</p>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Pkg</p>
                            <p className="font-medium text-gray-900">₹{company.totalPackageAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Paid</p>
                            <p className="font-medium text-green-600">₹{company.totalPaymentsReceived.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-auto ios-scroll pb-24 p-4 space-y-4">
                {/* Packages Section */}
                <div>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Packages</h2>
                    {company.packages.length === 0 ? (
                        <div className="text-center p-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">No packages added.</div>
                    ) : (
                        <div className="space-y-3">
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

                {/* Documents Section */}


                {/* ... */}

                <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
                    <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
                        <Link
                            href={`/companies/${id}/packages/new`}
                            className="absolute bottom-6 right-6 w-14 h-14 bg-ecs-blue text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
                        >
                            <Plus className="w-6 h-6" />
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

                {/* Edit Package Modal */}
                {isPkgEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-900">Edit Package</h3>
                                <button onClick={() => setIsPkgEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                            </div>
                            <form onSubmit={handleUpdatePackage} className="p-4 space-y-3">
                                <input
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="Description (e.g., Wedding 2024)"
                                    value={pkgEditForm.description}
                                    onChange={e => setPkgEditForm({ ...pkgEditForm, description: e.target.value })}
                                    required
                                />
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-9 p-2 border rounded-lg text-sm"
                                        value={pkgEditForm.date}
                                        onChange={e => setPkgEditForm({ ...pkgEditForm, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-3 bg-ecs-blue text-white font-bold rounded-xl mt-2 active:scale-95 transition-transform"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function PackageItem({ pkg, companyId, onLongPress }: { pkg: any, companyId: number, onLongPress: () => void }) {
    const router = useRouter()
    const pkgAmount = pkg.charges?.reduce((sum: number, c: any) => sum + Number(c.amount), 0) || 0
    const pkgTotalPaid = pkg.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
    const pkgBalance = pkgAmount - pkgTotalPaid

    const bind = useLongPress(() => {
        onLongPress()
    }, () => {
        router.push(`/companies/${companyId}/packages/${pkg.id}`)
    })

    return (
        <div
            {...bind}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:bg-gray-50 transition-colors hover:bg-gray-50 relative group cursor-pointer select-none touch-pan-y"
        >
            <div className="p-4 flex justify-between items-center">
                <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900">{pkg.description}</h3>
                        {pkg.hasUpdates && (
                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(pkg.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                    <div>
                        <span className="block text-sm font-bold text-ecs-blue">₹{pkgAmount.toLocaleString('en-IN')}</span>
                        {pkgBalance > 0 ? (
                            <span className="text-[10px] font-bold text-ecs-red uppercase">Bal: ₹{pkgBalance.toLocaleString('en-IN')}</span>
                        ) : (
                            <span className="text-[10px] font-bold text-green-600 uppercase">Paid</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}


