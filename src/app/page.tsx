'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/StatCard'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { ActionSheet } from '@/components/ActionSheet'
import { exportToExcel } from '@/utils/exportToExcel'
import { MoreVertical, Download } from 'lucide-react'

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
  type: 'CLIENT' | 'VENDOR'
  amountDue: number
  address?: string
  ledgerLink?: string
  contact?: string
  email?: string
  packageCount?: number
  hasUpdates?: boolean
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'CLIENT' | 'VENDOR'>('ALL')
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
    fetch(`/api/companies?search=${search}`).then(res => res.json()).then(setCompanies)
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
    setEditForm(selectedCompany)
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
      const res = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
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
      'Ledger Link': c.ledgerLink || '-',
      'Phone': c.contact || '-',
      'Email': c.email || '-',
      'Address': c.address || '-',
      'Total Due': c.amountDue || 0
    }))
    exportToExcel(dataToExport, `ECS_Company_List_${new Date().toISOString().split('T')[0]}`, 'Companies', 'ECS Ledger - Company List')
    setShowDashboardActions(false)
  }

  const handleResetUpdates = async () => {
    if (!selectedCompany) return

    try {
      const res = await fetch(`/api/companies/${selectedCompany.id}/reset-updates`, { method: 'POST' })
      if (res.ok) {
        fetchCompanies()
        setIsSheetOpen(false)
      }
    } catch (err) {
      console.error('Failed to reset updates', err)
    }
  }

  const filteredCompanies = companies.filter(c => {
    if (filter === 'ALL') return true
    return c.type === filter
  })

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden" suppressHydrationWarning>
      {/* Fixed Stats Grid */}
      <div className="shrink-0 bg-gray-50 z-10 p-4 pb-0">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Client Due" value={stats?.totalClientDue ?? '-'} valueColor="text-green-600" />
          <StatCard label="Total Vendor Due" value={stats?.totalVendorDue ?? '-'} valueColor="text-ecs-red" />
          <StatCard
            label="Total Clients"
            value={stats?.totalClients ?? '-'}
            showCurrency={false}
            onClick={() => setFilter(filter === 'CLIENT' ? 'ALL' : 'CLIENT')}
            isActive={filter === 'CLIENT'}
          />
          <StatCard
            label="Total Vendors"
            value={stats?.totalVendors ?? '-'}
            showCurrency={false}
            onClick={() => setFilter(filter === 'VENDOR' ? 'ALL' : 'VENDOR')}
            isActive={filter === 'VENDOR'}
          />
        </div>

        {/* Search Bar (Fixed) */}
        <div className="relative mt-4 flex gap-3 h-11">
          <input
            type="text"
            placeholder="Search client or vendor"
            className="h-full w-full pl-4 pr-4 bg-white border border-gray-200 rounded-xl text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-ecs-blue placeholder:text-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => setShowDashboardActions(true)}
            className="h-full aspect-square bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-900 active:bg-gray-50 shadow-sm flex items-center justify-center"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fixed Content Container (List Only) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-5 py-3 border-b border-gray-200/50 bg-gray-50/80 backdrop-blur-sm flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest z-10">
          <span>Company</span>
          <span>Due</span>
        </div>
        <ul className="flex-1 overflow-y-auto ios-scroll px-2 pt-2 pb-24">
          {filteredCompanies.map((company, index) => (
            <CompanyItem
              key={company.id}
              company={company}
              index={index}
              onLongPress={() => handleLongPress(company)}
            />
          ))}
          {filteredCompanies.length === 0 && (
            <li className="p-8 text-center text-gray-400 text-sm">No companies found.</li>
          )}
        </ul>
      </div>

      {/* FAB */}
      {/* FAB Wrapper to constrain width on desktop */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-20">
        <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
          <Link
            href="/add-company"
            className="absolute bottom-6 right-6 w-14 h-14 bg-ecs-blue text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* Action Sheet */}
      <ActionSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={selectedCompany?.name}
        actions={[
          ...(selectedCompany?.hasUpdates ? [{
            label: 'Updated in Diary',
            icon: <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-gray-400" /></div>,
            onClick: handleResetUpdates
          }] : []),
          {
            label: 'Edit Company',
            icon: <Pencil className="w-5 h-5" />,
            onClick: handleEditClick
          },
          {
            label: 'Delete Company',
            icon: <Trash2 className="w-5 h-5" />,
            variant: 'danger',
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

      {/* Edit Modal (Simple inline implementation) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Edit Company</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleUpdateCompany} className="p-4 space-y-3">
              <input
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="Company Name"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <input
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="Address"
                value={editForm.address || ''}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="Ledger Link (URL)"
                  value={editForm.ledgerLink || ''}
                  onChange={e => setEditForm({ ...editForm, ledgerLink: e.target.value })}
                />
                <input
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="Contact"
                  value={editForm.contact || ''}
                  onChange={e => setEditForm({ ...editForm, contact: e.target.value })}
                />
              </div>
              <input
                className="w-full p-2 border rounded-lg text-sm"
                placeholder="Email"
                value={editForm.email || ''}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
              />
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
  )
}

// Extracted for clean hook usage
function CompanyItem({ company, index, onLongPress }: { company: CompanySummary, index: number, onLongPress: () => void }) {
  const bind = useLongPress(() => {
    onLongPress()
  })

  return (
    <li className="mb-2 last:mb-20">
      <Link
        href={`/companies/${company.id}`}
        {...bind}
        className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-[98%] transition-all cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 leading-tight">{company.name}</h3>
              {company.hasUpdates && (
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-sm" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${company.type === 'CLIENT' ? 'bg-blue-50 text-ecs-blue' : 'bg-red-50 text-ecs-red'}`}>
                {company.type}
              </span>
              {company.packageCount !== undefined && (
                <span className="text-[10px] text-gray-400 font-medium">
                  {company.packageCount} {company.packageCount === 1 ? 'Package' : 'Packages'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-base font-black ${company.amountDue > 0 ? 'text-ecs-red' : 'text-green-600'}`}>
            ₹{(company.amountDue || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </Link>
    </li>
  )
}
