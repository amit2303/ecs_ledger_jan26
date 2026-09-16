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
            className="fixed inset-0 z-50 flex items-center justify-center ios-fade-in"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
                <X className="w-5 h-5 text-white" />
            </button>

            <div
                className="relative max-w-full max-h-full p-4 flex items-center justify-center w-full h-full"
                onClick={e => e.stopPropagation()}
            >
                <img
                    src={url}
                    alt={alt || 'Quick Look'}
                    className="max-w-full max-h-[90vh] object-contain rounded-2xl ios-scale-in"
                    style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
                />
            </div>
        </div>
    )
}
