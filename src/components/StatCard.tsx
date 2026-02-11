'use client'

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    icon?: LucideIcon
    className?: string
    valueColor?: string
    showCurrency?: boolean
    onClick?: () => void
    isActive?: boolean
}

export function StatCard({ label, value, icon: Icon, className = '', valueColor = 'text-gray-900', showCurrency = true, onClick, isActive }: StatCardProps) {
    const labelColor = isActive ? 'text-amber-800' : 'text-gray-500'
    const displayValueColor = isActive ? 'text-amber-900' : valueColor
    const iconColor = isActive ? 'text-amber-600' : 'text-gray-400'
    const containerClasses = isActive
        ? 'bg-amber-50 border-amber-200 shadow-md ring-1 ring-amber-100'
        : 'bg-white border-gray-100 shadow-sm'

    return (
        <div
            onClick={onClick}
            className={`${containerClasses} rounded-xl p-3 border transition-all flex flex-col items-start ${className} ${onClick ? 'cursor-pointer active:scale-[98%]' : ''}`}
        >
            <span className={`${labelColor} text-[10px] font-medium uppercase tracking-wider mb-1`}>{label}</span>
            <div className={`text-lg font-medium ${displayValueColor}`}>
                {typeof value === 'number' && showCurrency ? `₹${value.toLocaleString('en-IN')}` : value}
            </div>
            {Icon && <Icon className={`w-4 h-4 ${iconColor} mt-2`} />}
        </div>
    )
}
