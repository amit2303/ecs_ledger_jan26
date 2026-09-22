'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { Plus, Pencil, Trash2, PauseCircle, PlayCircle, MoreVertical, Download, ChevronRight, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { ActionSheet } from '@/components/ActionSheet'
import { exportToExcel } from '@/utils/exportToExcel'

interface DashboardStats {
  totalClients: number
  totalVendors: number
  totalClientDue: number
  totalVendorDue: number
  ecsIncome: number
}

interface CompanySummary {
  id: number
  name: string
  diaryNumber?: string
  type: 'CLIENT' | 'VENDOR'
  amountDue: number
  address?: string
  ledgerLink?: string
  contact?: string
  email?: string
  packageCount?: number
  hasUpdates?: boolean
  isOnHold?: boolean
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'CLIENT' | 'VENDOR'>('CLIENT')
  const router = useRouter()

  // Action Sheet State
  const [selectedCompany, setSelectedCompany] = useState<CompanySummary | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [showDashboardActions, setShowDashboardActions] = useState(false)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<CompanySummary>>({})
  const [saving, setSaving] = useState(false)

  // Fetch logic ...
  const fetchCompanies = () => {
    fetch(`/api/companies?search=${search}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCompanies(data)
        } else {
          setCompanies([])
        }
      })
      .catch(() => setCompanies([]))
  }

  useEffect(() => {
    fetch('/api/stats').then(res => res.json()).then(setStats)
    fetchCompanies()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleLongPress = (company: CompanySummary) => {
    // Vibrate if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50)
    }
    setSelectedCompany(company)
    setIsSheetOpen(true)
  }

  const handleEditClick = () => {
    if (!selectedCompany) return
    const rawName = (selectedCompany.name || '').trim()
    const match = rawName.match(/^(\d+(?:\.\d+)?)\.?\s*(.*)$/)
    const sNo = match ? match[1] : ''
    const displayName = match && match[2] ? match[2].trim() : rawName

    setEditForm({
      ...selectedCompany,
      diaryNumber: sNo,
      name: displayName
    })
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = async () => {
    if (!selectedCompany) return

    // Client-side dependency check
    if (selectedCompany.packageCount && selectedCompany.packageCount > 0) {
      alert('Cannot delete company because it has associated packages. Please delete packages first.')
      return
    }

    if (!confirm(`Delete ${selectedCompany.name}?`)) return

    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to delete company')
      } else {
        fetchCompanies()
        // Refresh stats too
        fetch('/api/stats').then(res => res.json()).then(setStats)
      }
    } catch (err) {
      alert('Failed to delete company')
    }
  }

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return
    setSaving(true)
    try {
      const companyName = (editForm.name || '').trim()
      const finalName = editForm.diaryNumber?.trim()
        ? `${editForm.diaryNumber.trim()}.  ${companyName}`
        : companyName

      const res = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          address: editForm.address,
          contact: editForm.contact,
          email: editForm.email
        })
      })
      if (!res.ok) throw new Error('Failed to update')

      fetchCompanies()
      setIsEditModalOpen(false)
    } catch (err) {
      alert('Failed to update company')
    } finally {
      setSaving(false)
    }
  }

  const handleExportCompanies = () => {
    const dataToExport = companies.map(c => ({
      'Type': c.type,
      'Name': c.name,
      'Phone': c.contact || '-',
      'Email': c.email || '-',
      'Address': c.address || '-',
      'Total Due': c.amountDue || 0
    }))
    exportToExcel(dataToExport, `ECS_Company_List_${new Date().toISOString().split('T')[0]}`, 'Companies', 'ECS Ledger - Company List')
    setShowDashboardActions(false)
  }


  const handleToggleHold = async () => {
    if (!selectedCompany) return

    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}/toggle-hold`, { method: 'POST' })
      if (res.ok) {
        fetchCompanies()
        fetch('/api/stats').then(res => res.json()).then(setStats)
        setIsSheetOpen(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to toggle hold status')
      }
    } catch (err) {
      console.error('Failed to toggle hold status', err)
      alert('Failed to toggle hold status')
    }
  }

  const filteredCompanies = (Array.isArray(companies) ? companies : []).filter(c => {
    // When searching, search across all companies (clients and vendors)
    if (search.trim()) return true
    // Otherwise show only the active tab (Clients by default, or Vendors when clicked)
    return c.type === filter
  })

  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: '#F2F2F7' }} suppressHydrationWarning>
      {/* Stats & Controls — Fixed top */}
      <div className="shrink-0 z-10 px-4 pt-3 pb-0">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            label="Total Client Due"
            value={stats?.totalClientDue ?? '-'}
            valueColor="text-ios-green"
            accentColor="green"
          />
          <StatCard
            label="Total Vendor Due"
            value={stats?.totalVendorDue ?? '-'}
            valueColor="text-ios-red"
            accentColor="red"
          />
          <StatCard
            label="Clients"
            value={stats?.totalClients ?? '-'}
            showCurrency={false}
            onClick={() => setFilter('CLIENT')}
            isActive={filter === 'CLIENT'}
            accentColor="blue"
          />
          <StatCard
            label="Vendors"
            value={stats?.totalVendors ?? '-'}
            showCurrency={false}
            onClick={() => setFilter('VENDOR')}
            isActive={filter === 'VENDOR'}
            accentColor="orange"
          />
        </div>

        {/* Search Bar & Actions — Premium Apple Card Style */}
        <div className="relative mt-3 flex items-center gap-2.5 h-[44px]">
          <div
            className="flex-1 h-full relative rounded-2xl bg-white flex items-center px-3.5 transition-all focus-within:ring-2 focus-within:ring-ios-blue/30"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)',
            }}
          >
            <Search className="w-[18px] h-[18px] text-gray-400 shrink-0 mr-2.5" />
            <input
              type="text"
              placeholder="Search companies..."
              className="h-full w-full text-[15px] text-gray-900 placeholder-gray-400 bg-transparent outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-gray-400 hover:text-gray-600 active:opacity-60 transition-opacity shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowDashboardActions(true)}
            className="h-[44px] w-[44px] rounded-2xl bg-white flex items-center justify-center text-gray-600 ios-press shrink-0 transition-transform"
            style={{
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)',
            }}
            title="More Options"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

      </div>

      {/* Company List */}
      <div className="flex-1 flex flex-col min-h-0 mt-3">
        {/* List Header */}
        <div className="flex justify-between items-center px-8 pb-2 text-[12px] font-semibold text-ios-gray uppercase tracking-wider select-none">
          <span>COMPANY</span>
          <span className="pr-6">DUE</span>
        </div>

        <div className="flex-1 overflow-y-auto ios-scroll px-4 pb-32">
          {filteredCompanies.length > 0 ? (
            <div className="flex flex-col gap-2">
              {filteredCompanies.map((company) => (
                <CompanyItem
                  key={company.id}
                  company={company}
                  onLongPress={() => handleLongPress(company)}
                />
              ))}

              {/* Add Company at bottom of list */}
              <Link
                href="/add-company"
                className="mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white border border-dashed border-gray-300 text-ios-blue font-medium text-[15px] hover:bg-blue-50/50 active:scale-[0.99] transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
                <span>Add New {filter === 'CLIENT' ? 'Client' : 'Vendor'}</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">No companies found.</div>
              <Link
                href="/add-company"
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white border border-dashed border-gray-300 text-ios-blue font-medium text-[15px] hover:bg-blue-50/50 active:scale-[0.99] transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
                <span>Add New {filter === 'CLIENT' ? 'Client' : 'Vendor'}</span>
              </Link>
            </div>
          )}
        </div>
      </div>



      {/* Action Sheet */}
      <ActionSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={selectedCompany?.name}
        actions={[
          {
            label: selectedCompany?.isOnHold ? 'Unhold Company' : 'Hold Company',
            icon: selectedCompany?.isOnHold ? (
              <PlayCircle className="w-5 h-5 text-ios-green" />
            ) : (
              <PauseCircle className="w-5 h-5 text-ios-orange" />
            ),
            onClick: handleToggleHold
          },
          {
            label: 'Edit Company',
            icon: <Pencil className="w-5 h-5" />,
            onClick: handleEditClick
          },
          {
            label: 'Delete Company',
            icon: <Trash2 className="w-5 h-5" />,
            variant: 'danger' as const,
            onClick: handleDeleteClick
          }
        ]}
      />

      {/* Dashboard Actions Sheet */}
      <ActionSheet
        isOpen={showDashboardActions}
        onClose={() => setShowDashboardActions(false)}
        title="Dashboard Actions"
        actions={[
          {
            label: 'Download Company List',
            icon: <Download className="w-5 h-5" />,
            onClick: handleExportCompanies
          }
        ]}
      />

      {/* Edit Modal — iOS Form Sheet style */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 ios-fade-in">
          <div
            className="bg-white w-full max-w-md rounded-t-2xl overflow-hidden ios-slide-up"
            style={{ maxHeight: '90vh' }}
          >
            {/* Handle */}
            <div className="ios-handle" />

            <div className="px-4 pt-2 pb-3 flex justify-between items-center">
              <button onClick={() => setIsEditModalOpen(false)} className="text-ios-blue text-[17px]">Cancel</button>
              <h3 className="font-semibold text-[17px] text-gray-900">Edit Company</h3>
              <button
                onClick={handleUpdateCompany}
                disabled={saving}
                className="text-ios-blue text-[17px] font-semibold disabled:opacity-40"
              >
                {saving ? 'Saving' : 'Save'}
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="px-4 pb-8 space-y-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <input
                    className="ios-input"
                    placeholder="Diary No"
                    value={editForm.diaryNumber || ''}
                    onChange={e => setEditForm({ ...editForm, diaryNumber: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    className="ios-input"
                    placeholder="Company Name"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <input
                className="ios-input"
                placeholder="Address"
                value={editForm.address || ''}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
              />
              <input
                className="ios-input"
                placeholder="Contact"
                value={editForm.contact || ''}
                onChange={e => setEditForm({ ...editForm, contact: e.target.value })}
              />
              <input
                className="ios-input"
                placeholder="Email"
                value={editForm.email || ''}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Company card item — rounded card with color-coded left accent stripe
function CompanyItem({ company, onLongPress }: { company: CompanySummary, onLongPress: () => void }) {
  const bind = useLongPress(() => {
    onLongPress()
  })

  const isClient = company.type === 'CLIENT'
  const rawName = (company.name || '').trim()
  const match = rawName.match(/^(\d+(?:\.\d+)?)\.?\s*(.*)$/)
  const sNo = match ? match[1] : null
  const displayName = match && match[2] ? match[2].trim() : rawName

  return (
    <Link
      href={`/companies/${company.id}`}
      {...bind}
      className={`relative overflow-hidden rounded-2xl ios-press select-none block ${company.isOnHold ? 'opacity-55' : ''}`}
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: isClient
          ? '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(224, 83, 83, 0.22)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex-1 min-w-0 pr-3">
          {/* Top line: 1 BOOSTER */}
          <div className="flex items-center min-w-0">
            <h3 className="text-[16px] font-semibold text-gray-900 leading-snug truncate">
              {sNo && (
                <span className="font-bold tabular-nums mr-1.5">{sNo}</span>
              )}
              {displayName}
            </h3>
            {company.isOnHold && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-ios-orange flex items-center gap-1 shrink-0 ml-2" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-ios-orange" />
                On Hold
              </span>
            )}
          </div>

          {/* Packages count below company name */}
          {company.packageCount !== undefined && (
            <p className="text-[13px] text-ios-gray mt-1">
              {company.packageCount} {company.packageCount === 1 ? 'Package' : 'Packages'}
            </p>
          )}
        </div>

        {/* Right: Due Amount + Chevron */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className={`text-[17px] font-semibold tabular-nums ${company.isOnHold ? 'text-ios-gray line-through' : (company.amountDue || 0) > 0 ? 'text-ios-red' : (company.amountDue || 0) < 0 ? 'text-ios-green' : 'text-ios-blue'}`}>
            {(company.amountDue || 0) < 0 ? `- ₹${Math.abs(company.amountDue || 0).toLocaleString('en-IN')}` : `₹${(company.amountDue || 0).toLocaleString('en-IN')}`}
          </span>
          <ChevronRight className="w-5 h-5 text-ios-gray3" />
        </div>
      </div>
    </Link>
  )
}
