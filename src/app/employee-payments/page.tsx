'use client'

import { useEffect, useState, useRef } from 'react'
import { Plus, ChevronRight, Pencil, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLongPress } from '@/hooks/useLongPress'
import { ActionSheet } from '@/components/ActionSheet'

interface EmployeeSummary {
    id: number
    name: string
    salary: number
    designation: string | null
    address: string | null
    totalSalary: number
    totalPaid: number
    balance: number
}

export default function EmployeePaymentsPage() {
    const router = useRouter()
    const [employees, setEmployees] = useState<EmployeeSummary[]>([])
    const [loading, setLoading] = useState(true)

    // Add Employee Modal
    const [showAddModal, setShowAddModal] = useState(false)
    const [addForm, setAddForm] = useState({ name: '', salary: '', designation: '', address: '' })
    const [saving, setSaving] = useState(false)
    const nameInputRef = useRef<HTMLInputElement>(null)

    // Edit Employee Modal
    const [editingEmployee, setEditingEmployee] = useState<EmployeeSummary | null>(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', salary: '', designation: '', address: '' })

    // Action Sheet
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null)
    const [isSheetOpen, setIsSheetOpen] = useState(false)

    useEffect(() => {
        fetchEmployees()
    }, [])

    useEffect(() => {
        if (showAddModal) {
            setTimeout(() => nameInputRef.current?.focus(), 50)
        }
    }, [showAddModal])

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees')
            if (!res.ok) throw new Error('Failed to fetch employees')
            const data = await res.json()
            setEmployees(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!addForm.name.trim() || !addForm.salary) return
        setSaving(true)
        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addForm.name,
                    salary: addForm.salary,
                    designation: addForm.designation || null,
                    address: addForm.address || null,
                }),
            })
            if (!res.ok) throw new Error('Failed to add employee')
            await fetchEmployees()
            setAddForm({ name: '', salary: '', designation: '', address: '' })
            setShowAddModal(false)
        } catch (err) {
            console.error(err)
            alert('Failed to add employee')
        } finally {
            setSaving(false)
        }
    }

    const handleEditEmployee = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingEmployee || !editForm.name.trim() || !editForm.salary) return
        setSaving(true)
        try {
            const res = await fetch(`/api/employees/${editingEmployee.id}`, {
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
            await fetchEmployees()
            setShowEditModal(false)
            setEditingEmployee(null)
        } catch (err) {
            console.error(err)
            alert('Failed to update employee')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteEmployee = async () => {
        if (!selectedEmployee) return
        if (!confirm(`Delete ${selectedEmployee.name}? This will remove all salary entries and payments.`)) return
        try {
            const res = await fetch(`/api/employees/${selectedEmployee.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete employee')
            await fetchEmployees()
        } catch (err) {
            console.error(err)
            alert('Failed to delete employee')
        }
    }

    const handleLongPress = (emp: EmployeeSummary) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
        setSelectedEmployee(emp)
        setIsSheetOpen(true)
    }

    const openEditModal = () => {
        if (!selectedEmployee) return
        setEditingEmployee(selectedEmployee)
        setEditForm({
            name: selectedEmployee.name,
            salary: String(selectedEmployee.salary),
            designation: selectedEmployee.designation || '',
            address: selectedEmployee.address || '',
        })
        setShowEditModal(true)
    }

    if (loading) return <div className="flex h-screen items-center justify-center text-ios-gray text-[17px]">Loading...</div>

    return (
        <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: '#F2F2F7' }}>
            {/* Header */}
            <header className="shrink-0 z-10" style={{ backgroundColor: '#F2F2F7' }}>
                <div className="flex items-center justify-center px-4 py-3">
                    <h1 className="text-[17px] font-semibold text-gray-900">Employees</h1>
                </div>
            </header>

            {/* Content — Employee List */}
            <div className="flex-1 flex flex-col min-h-0 mt-1">
                {/* List Header */}
                <div className="flex justify-between items-center px-8 pb-2 text-[12px] font-semibold text-ios-gray uppercase tracking-wider select-none">
                    <span>NAME</span>
                    <span className="pr-6">BALANCE</span>
                </div>

                <div className="flex-1 overflow-y-auto ios-scroll px-4 pb-44">
                    {employees.length === 0 ? (
                        <div className="ios-card p-8 text-center text-ios-gray text-[15px] rounded-2xl">
                            No employees added yet.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {employees.map((emp) => (
                                <EmployeeCard
                                    key={emp.id}
                                    employee={emp}
                                    onLongPress={() => handleLongPress(emp)}
                                    onClick={() => router.push(`/employee-payments/${emp.id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* FAB */}
            <div className="fixed bottom-0 left-0 w-full flex justify-center pointer-events-none z-40">
                <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl relative h-0">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="absolute right-5 w-14 h-14 bg-ios-blue text-white rounded-full flex items-center justify-center ios-press pointer-events-auto shadow-[0_6px_20px_rgba(0,122,255,0.4)]"
                        style={{ bottom: 'calc(56px + max(8px, env(safe-area-inset-bottom, 8px)) + 12px)' }}
                    >
                        <Plus className="w-7 h-7" strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Action Sheet */}
            <ActionSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                title={selectedEmployee?.name}
                actions={[
                    {
                        label: 'Edit Employee',
                        icon: <Pencil className="w-5 h-5" />,
                        onClick: openEditModal,
                    },
                    {
                        label: 'Delete Employee',
                        icon: <Trash2 className="w-5 h-5" />,
                        variant: 'danger',
                        onClick: handleDeleteEmployee,
                    },
                ]}
            />

            {/* Add Employee Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 ios-fade-in">
                    <div className="bg-white w-full max-w-md rounded-t-2xl overflow-hidden ios-slide-up">
                        <div className="ios-handle" />
                        <div className="px-4 pt-2 pb-3 flex justify-between items-center">
                            <button onClick={() => setShowAddModal(false)} className="text-ios-blue text-[17px]">Cancel</button>
                            <h3 className="font-semibold text-[17px] text-gray-900">Add Employee</h3>
                            <button
                                onClick={handleAddEmployee}
                                disabled={saving || !addForm.name.trim() || !addForm.salary}
                                className="text-ios-blue text-[17px] font-semibold disabled:opacity-40"
                            >
                                {saving ? '...' : 'Add'}
                            </button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="px-4 pb-8 space-y-3">
                            <input
                                ref={nameInputRef}
                                className="ios-input"
                                placeholder="Name *"
                                value={addForm.name}
                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                required
                            />
                            <input
                                type="number"
                                className="ios-input"
                                placeholder="Monthly Salary *"
                                value={addForm.salary}
                                onChange={(e) => setAddForm({ ...addForm, salary: e.target.value })}
                                required
                                min="0"
                            />
                            <input
                                className="ios-input"
                                placeholder="Designation (optional)"
                                value={addForm.designation}
                                onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                            />
                            <input
                                className="ios-input"
                                placeholder="Address (optional)"
                                value={addForm.address}
                                onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                            />
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Employee Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 ios-fade-in">
                    <div className="bg-white w-full max-w-md rounded-t-2xl overflow-hidden ios-slide-up">
                        <div className="ios-handle" />
                        <div className="px-4 pt-2 pb-3 flex justify-between items-center">
                            <button onClick={() => { setShowEditModal(false); setEditingEmployee(null) }} className="text-ios-blue text-[17px]">Cancel</button>
                            <h3 className="font-semibold text-[17px] text-gray-900">Edit Employee</h3>
                            <button
                                onClick={handleEditEmployee}
                                disabled={saving || !editForm.name.trim() || !editForm.salary}
                                className="text-ios-blue text-[17px] font-semibold disabled:opacity-40"
                            >
                                {saving ? '...' : 'Save'}
                            </button>
                        </div>
                        <form onSubmit={handleEditEmployee} className="px-4 pb-8 space-y-3">
                            <input
                                className="ios-input"
                                placeholder="Name *"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                required
                                autoFocus
                            />
                            <input
                                type="number"
                                className="ios-input"
                                placeholder="Monthly Salary *"
                                value={editForm.salary}
                                onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                                required
                                min="0"
                            />
                            <input
                                className="ios-input"
                                placeholder="Designation (optional)"
                                value={editForm.designation}
                                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                            />
                            <input
                                className="ios-input"
                                placeholder="Address (optional)"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            />
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function EmployeeCard({
    employee,
    onLongPress,
    onClick,
}: {
    employee: EmployeeSummary
    onLongPress: () => void
    onClick: () => void
}) {
    const bind = useLongPress(
        () => onLongPress(),
        () => onClick()
    )

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
                        <h3 className="text-[16px] font-semibold text-gray-900 leading-snug truncate">
                            {employee.name}
                        </h3>
                    </div>
                    <p className="text-[13px] text-ios-gray mt-1">
                        {employee.designation || 'No designation'} · ₹{employee.salary.toLocaleString('en-IN')}/mo
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                        <span className="text-[14px] text-ios-gray block">
                            ₹{employee.totalSalary.toLocaleString('en-IN')}
                        </span>
                        <span
                            className={`text-[18px] font-semibold tabular-nums block ${
                                employee.balance > 0
                                    ? 'text-ios-red'
                                    : employee.balance < 0
                                    ? 'text-ios-green'
                                    : 'text-ios-blue'
                            }`}
                        >
                            {employee.balance < 0
                                ? `- ₹${Math.abs(employee.balance).toLocaleString('en-IN')}`
                                : `₹${employee.balance.toLocaleString('en-IN')}`}
                        </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-ios-gray3" />
                </div>
            </div>
        </div>
    )
}
