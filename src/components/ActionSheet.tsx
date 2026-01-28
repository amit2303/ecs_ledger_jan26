'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface Action {
    label: string
    onClick: () => void
    variant?: 'default' | 'danger'
    icon?: React.ReactNode
}

interface ActionSheetProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    actions: Action[]
}

export function ActionSheet({ isOpen, onClose, title, actions }: ActionSheetProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl transform transition-transform animate-in slide-in-from-bottom duration-300">
                <div className="flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <span className="font-bold text-gray-900 text-sm md:text-base">{title || 'Options'}</span>
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="p-2 space-y-1 overflow-y-auto">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    action.onClick()
                                    onClose()
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left font-medium transition-colors ${action.variant === 'danger'
                                        ? 'text-red-500 bg-red-50 hover:bg-red-100'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {action.icon && <span className="opacity-70">{action.icon}</span>}
                                {action.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 pt-2">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl active:scale-95 transition-transform"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
