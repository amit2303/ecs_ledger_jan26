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
    accentColor?: string  // e.g. 'blue', 'red', 'green', 'orange'
}

export function StatCard({ label, value, icon: Icon, className = '', valueColor = 'text-gray-900', showCurrency = true, onClick, isActive, accentColor }: StatCardProps) {
    // Soft, light pastel tints for active state
    const tintMap: Record<string, { bg: string, ring: string, text: string }> = {
        blue: { bg: 'rgba(0, 122, 255, 0.08)', ring: '0 0 0 1.5px rgba(0, 122, 255, 0.35)', text: 'text-ios-blue' },
        red: { bg: 'rgba(224, 83, 83, 0.08)', ring: '0 0 0 1.5px rgba(224, 83, 83, 0.35)', text: 'text-ios-red' },
        green: { bg: 'rgba(48, 164, 108, 0.08)', ring: '0 0 0 1.5px rgba(48, 164, 108, 0.35)', text: 'text-ios-green' },
        orange: { bg: 'rgba(245, 158, 11, 0.08)', ring: '0 0 0 1.5px rgba(245, 158, 11, 0.35)', text: 'text-ios-orange' },
    }

    const activeConf = accentColor && tintMap[accentColor] ? tintMap[accentColor] : tintMap.blue

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl p-4 transition-all flex flex-col items-start ${className} ${onClick ? 'ios-press cursor-pointer' : ''}`}
            style={{
                backgroundColor: isActive ? activeConf.bg : '#FFFFFF',
                boxShadow: isActive
                    ? `${activeConf.ring}, 0 2px 8px rgba(0,0,0,0.04)`
                    : '0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}
        >
            <span className="text-[13px] font-medium text-ios-gray mb-1">{label}</span>
            <div className={`text-[22px] font-semibold tracking-tight tabular-nums ${isActive ? activeConf.text : valueColor}`}>
                {typeof value === 'number' && showCurrency ? (value < 0 ? `- ₹${Math.abs(value).toLocaleString('en-IN')}` : `₹${value.toLocaleString('en-IN')}`) : value}
            </div>
            {Icon && <Icon className="w-4 h-4 text-ios-gray mt-2" />}
        </div>
    )
}
