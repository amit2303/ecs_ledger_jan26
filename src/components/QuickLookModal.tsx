import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface QuickLookModalProps {
    isOpen: boolean
    onClose: () => void
    url: string
    alt?: string
}

export function QuickLookModal({ isOpen, onClose, url, alt }: QuickLookModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-50"
            >
                <X className="w-8 h-8" />
            </button>

            <div
                className="relative max-w-full max-h-full p-4 flex items-center justify-center w-full h-full"
                onClick={e => e.stopPropagation()} // Allow clicking image without closing? Actually better to close on background only or specific button.
            // Let's allow closing on background click (outer div).
            >
                <img
                    src={url}
                    alt={alt || 'Quick Look'}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
                />
            </div>
        </div>
    )
}
