'use client'

import React, { useEffect } from 'react'

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
                className="absolute inset-0 bg-black/40 ios-fade-in"
                onClick={onClose}
            />

            {/* Sheet Container — pinned to bottom with safe area */}
            <div className="absolute bottom-0 left-0 right-0 px-2 ios-slide-up safe-area-bottom" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
                {/* Grouped Actions Card */}
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(40px)', WebkitBackdropFilter: 'saturate(180%) blur(40px)' }}>
                    {/* Title */}
                    {title && (
                        <div className="px-4 pt-4 pb-2 text-center">
                            <p className="text-[13px] font-semibold text-gray-500 truncate">{title}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div>
                        {actions.map((action, index) => (
                            <React.Fragment key={index}>
                                {(index > 0 || title) && (
                                    <div className="mx-0" style={{ height: '0.5px', backgroundColor: 'rgba(60,60,67,0.15)' }} />
                                )}
                                <button
                                    onClick={() => {
                                        action.onClick()
                                        onClose()
                                    }}
                                    className={`w-full flex items-center justify-center gap-2.5 px-4 py-[18px] text-center font-normal transition-colors active:bg-black/5 ${
                                        action.variant === 'danger'
                                            ? 'text-ios-red'
                                            : 'text-ios-blue'
                                    }`}
                                    style={{ fontSize: '20px' }}
                                >
                                    {action.icon && <span className="opacity-80 flex items-center">{action.icon}</span>}
                                    {action.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Cancel Button — Detached */}
                <button
                    onClick={onClose}
                    className="w-full mt-2 py-[18px] rounded-2xl text-center font-semibold text-ios-blue active:bg-white/70 transition-colors"
                    style={{ fontSize: '20px', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(180%) blur(40px)', WebkitBackdropFilter: 'saturate(180%) blur(40px)' }}
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}
