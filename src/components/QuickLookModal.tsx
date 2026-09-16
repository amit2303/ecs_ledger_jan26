import React, { useState, useEffect, useRef } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

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
        <QuickLookViewer
            key={url}
            onClose={onClose}
            url={url}
            alt={alt}
        />
    )
}

function QuickLookViewer({ onClose, url, alt }: { onClose: () => void; url: string; alt?: string }) {
    const [scale, setScale] = useState(1)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const dragStartRef = useRef({ x: 0, y: 0 })
    const pinchStartDistRef = useRef<number | null>(null)
    const pinchStartScaleRef = useRef(1)
    const lastTapRef = useRef(0)

    // Non-passive wheel zoom listener to prevent page scrolling while zooming
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault()
            const delta = -e.deltaY
            const factor = delta > 0 ? 1.15 : 0.85
            setScale(prev => {
                const next = Math.min(4, Math.max(1, prev * factor))
                if (next <= 1) setPosition({ x: 0, y: 0 })
                return next
            })
        }

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [])

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation()
        setScale(prev => Math.min(4, Math.round((prev + 0.5) * 10) / 10))
    }

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation()
        setScale(prev => {
            const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10)
            if (next <= 1) setPosition({ x: 0, y: 0 })
            return next
        })
    }

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation()
        setScale(1)
        setPosition({ x: 0, y: 0 })
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (scale > 1.05) {
            setScale(1)
            setPosition({ x: 0, y: 0 })
        } else {
            setScale(2.5)
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1 && e.button === 0) {
            e.preventDefault()
            setIsDragging(true)
            dragStartRef.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            }
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            e.preventDefault()
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            })
        }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            pinchStartDistRef.current = dist
            pinchStartScaleRef.current = scale
        } else if (e.touches.length === 1) {
            const now = Date.now()
            if (now - lastTapRef.current < 300) {
                // Double tap
                e.preventDefault()
                if (scale > 1.05) {
                    setScale(1)
                    setPosition({ x: 0, y: 0 })
                } else {
                    setScale(2.5)
                }
                lastTapRef.current = 0
                return
            }
            lastTapRef.current = now

            if (scale > 1) {
                setIsDragging(true)
                dragStartRef.current = {
                    x: e.touches[0].clientX - position.x,
                    y: e.touches[0].clientY - position.y
                }
            }
        }
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStartDistRef.current) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            )
            const newScale = Math.min(4, Math.max(1, pinchStartScaleRef.current * (dist / pinchStartDistRef.current)))
            setScale(newScale)
            if (newScale <= 1) {
                setPosition({ x: 0, y: 0 })
            }
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            setPosition({
                x: e.touches[0].clientX - dragStartRef.current.x,
                y: e.touches[0].clientY - dragStartRef.current.y
            })
        }
    }

    const handleTouchEnd = () => {
        pinchStartDistRef.current = null
        setIsDragging(false)
        if (scale <= 1) {
            setScale(1)
            setPosition({ x: 0, y: 0 })
        }
    }
    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
            onClick={() => {
                if (scale === 1) onClose()
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 z-50"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}
                title="Close"
            >
                <X className="w-5 h-5 text-white" />
            </button>

            {/* Floating Zoom Control Pill */}
            <div
                className="absolute bottom-6 inset-x-0 mx-auto w-fit z-50 flex items-center gap-1 px-3 py-1.5 rounded-full shadow-2xl"
                style={{
                    backgroundColor: 'rgba(30,30,30,0.75)',
                    backdropFilter: 'blur(20px)',
                    border: '0.5px solid rgba(255,255,255,0.15)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={scale <= 1}
                    className="p-1.5 text-white/90 hover:text-white disabled:opacity-30 active:opacity-60 transition-opacity"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={handleReset}
                    className="px-2 py-1 text-[12px] font-semibold tabular-nums text-white/90 hover:text-white transition-opacity"
                    title="Reset Zoom"
                >
                    {Math.round(scale * 100)}%
                </button>

                <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={scale >= 4}
                    className="p-1.5 text-white/90 hover:text-white disabled:opacity-30 active:opacity-60 transition-opacity"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>

                {scale > 1 && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="ml-1 p-1.5 text-white/70 hover:text-white active:opacity-60 transition-opacity"
                        title="Reset (100%)"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Image Container */}
            <div
                className="relative max-w-full max-h-full p-4 flex items-center justify-center w-full h-full"
                onClick={e => {
                    if (scale > 1) e.stopPropagation()
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    touchAction: 'none'
                }}
            >
                <img
                    src={url}
                    alt={alt || 'Quick Look'}
                    draggable={false}
                    onDoubleClick={handleDoubleClick}
                    className="max-w-full max-h-[85vh] object-contain rounded-2xl will-change-transform select-none"
                    style={{
                        transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
                        pointerEvents: 'auto'
                    }}
                />
            </div>
        </div>
    )
}
