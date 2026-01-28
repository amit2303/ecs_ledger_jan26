'use client'

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
    label: string
    value: string | number
    icon?: LucideIcon
    className?: string
    valueColor?: string
    showCurrency?: boolean
}

export function StatCard({ label, value, icon: Icon, className = '', valueColor = 'text-gray-900', showCurrency = true }: StatCardProps) {
    return (
        <div className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-start ${className}`}>
            <span className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</span>
            <div className={`text-xl font-bold ${valueColor}`}>
                {typeof value === 'number' && showCurrency ? `₹${value.toLocaleString('en-IN')}` : value}
            </div>
            {Icon && <Icon className="w-4 h-4 text-gray-400 mt-2" />}
        </div>
    )
}
