'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

export interface SwipeAction {
    key: string
    label: string
    icon: React.ReactNode
    color: string // e.g. '#007AFF', '#FF3B30', '#FF9500', '#34C759'
    textColor?: string
    onClick: (e: React.MouseEvent) => void
}

interface SwipeableRowProps {
    id: string | number
    children: React.ReactNode
    leftActions?: SwipeAction[] // Revealed when swiped RIGHT
    rightActions?: SwipeAction[] // Revealed when swiped LEFT
    className?: string
    style?: React.CSSProperties
    onClick?: () => void
    disabled?: boolean
}

// Apple iOS standard compact action button width
const ACTION_WIDTH = 64

export function SwipeableRow({
    id,
    children,
    leftActions = [],
    rightActions = [],
    className = '',
    style = {},
    onClick,
    disabled = false,
}: SwipeableRowProps) {
    const [offset, setOffset] = useState<number>(0)
    const [isDragging, setIsDragging] = useState<boolean>(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const foregroundRef = useRef<HTMLDivElement>(null)

    // Touch & pointer tracking refs
    const startX = useRef<number>(0)
    const startY = useRef<number>(0)
    const currentOffset = useRef<number>(0)
    const isHorizontalSwipe = useRef<boolean | null>(null)
    const hasMoved = useRef<boolean>(false)
    const wasOpenBeforeDrag = useRef<boolean>(false)

    const totalLeftWidth = leftActions.length * ACTION_WIDTH
    const totalRightWidth = rightActions.length * ACTION_WIDTH

    // Close this row if another row starts swiping
    useEffect(() => {
        const handleCloseOthers = (e: Event) => {
            const customEvent = e as CustomEvent
            if (customEvent.detail !== id && currentOffset.current !== 0) {
                setOffset(0)
                currentOffset.current = 0
            }
        }

        window.addEventListener('swipe-row-opened', handleCloseOthers)
        return () => {
            window.removeEventListener('swipe-row-opened', handleCloseOthers)
        }
    }, [id])

    // Close on any window scroll (native iOS behavior)
    useEffect(() => {
        const handleScroll = () => {
            if (currentOffset.current !== 0) {
                setOffset(0)
                currentOffset.current = 0
            }
        }

        window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
        return () => {
            window.removeEventListener('scroll', handleScroll, { capture: true })
        }
    }, [])

    const closeRow = useCallback(() => {
        setOffset(0)
        currentOffset.current = 0
    }, [])

    // --- Gesture handlers ---
    const handleStart = useCallback((clientX: number, clientY: number) => {
        if (disabled) return
        startX.current = clientX
        startY.current = clientY
        isHorizontalSwipe.current = null
        hasMoved.current = false
        wasOpenBeforeDrag.current = currentOffset.current !== 0
    }, [disabled])

    const handleMove = useCallback((clientX: number, clientY: number, e?: Event) => {
        if (disabled) return
        const deltaX = clientX - startX.current
        const deltaY = clientY - startY.current

        // Determine intent on first few pixels
        if (isHorizontalSwipe.current === null) {
            const absX = Math.abs(deltaX)
            const absY = Math.abs(deltaY)
            if (absX > 5 || absY > 5) {
                if (absX >= absY) {
                    isHorizontalSwipe.current = true
                    setIsDragging(true)
                    // Notify other rows to close
                    window.dispatchEvent(new CustomEvent('swipe-row-opened', { detail: id }))
                } else {
                    isHorizontalSwipe.current = false
                    return
                }
            } else {
                return
            }
        }

        if (!isHorizontalSwipe.current) return

        // Prevent page scroll when swiping horizontally
        if (e && e.cancelable) {
            try {
                e.preventDefault()
            } catch {
                // ignore
            }
        }

        hasMoved.current = true

        // Base offset before this drag gesture
        const base = wasOpenBeforeDrag.current ? currentOffset.current : 0
        let newOffset = base + deltaX

        // Rubber-band resistance when pulling past the action buttons (iOS style)
        if (newOffset > totalLeftWidth) {
            const overflow = newOffset - totalLeftWidth
            newOffset = totalLeftWidth + overflow * 0.18
        } else if (newOffset < -totalRightWidth) {
            const overflow = -newOffset - totalRightWidth
            newOffset = -totalRightWidth - overflow * 0.18
        }

        // Don't pull left if there are no right actions
        if (newOffset < 0 && totalRightWidth === 0) {
            newOffset = newOffset * 0.1
        }
        // Don't pull right if there are no left actions
        if (newOffset > 0 && totalLeftWidth === 0) {
            newOffset = newOffset * 0.1
        }

        currentOffset.current = newOffset
        setOffset(newOffset)
    }, [disabled, id, totalLeftWidth, totalRightWidth])

    const handleEnd = useCallback(() => {
        if (disabled) return
        setIsDragging(false)

        if (!isHorizontalSwipe.current) {
            return
        }

        const current = currentOffset.current
        let targetOffset = 0

        if (current > 0 && totalLeftWidth > 0) {
            // Swiped right -> reveal left actions (snaps smoothly)
            if (current > Math.min(totalLeftWidth * 0.32, 34)) {
                targetOffset = totalLeftWidth
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10)
                }
            } else {
                targetOffset = 0
            }
        } else if (current < 0 && totalRightWidth > 0) {
            // Swiped left -> reveal right actions (snaps smoothly)
            if (-current > Math.min(totalRightWidth * 0.32, 28)) {
                targetOffset = -totalRightWidth
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(10)
                }
            } else {
                targetOffset = 0
            }
        }

        currentOffset.current = targetOffset
        setOffset(targetOffset)
    }, [disabled, totalLeftWidth, totalRightWidth])

    // Native touch listeners with { passive: false } for iOS touch prevention
    useEffect(() => {
        const el = foregroundRef.current
        if (!el) return

        const onTouchStartNative = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                handleStart(e.touches[0].clientX, e.touches[0].clientY)
            }
        }

        const onTouchMoveNative = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY, e)
            }
        }

        const onTouchEndNative = () => {
            handleEnd()
        }

        el.addEventListener('touchstart', onTouchStartNative, { passive: true })
        el.addEventListener('touchmove', onTouchMoveNative, { passive: false })
        el.addEventListener('touchend', onTouchEndNative, { passive: true })
        el.addEventListener('touchcancel', onTouchEndNative, { passive: true })

        return () => {
            el.removeEventListener('touchstart', onTouchStartNative)
            el.removeEventListener('touchmove', onTouchMoveNative)
            el.removeEventListener('touchend', onTouchEndNative)
            el.removeEventListener('touchcancel', onTouchEndNative)
        }
    }, [handleStart, handleMove, handleEnd])

    // Mouse drag support for desktop browsers
    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        handleStart(e.clientX, e.clientY)

        const onMouseMove = (ev: MouseEvent) => {
            handleMove(ev.clientX, ev.clientY, ev)
        }

        const onMouseUp = () => {
            handleEnd()
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    // Capture phase: Suppress child click events if user swiped or row is open
    const handleClickCapture = (e: React.MouseEvent) => {
        if (hasMoved.current) {
            e.preventDefault()
            e.stopPropagation()
            return
        }

        if (offset !== 0) {
            e.preventDefault()
            e.stopPropagation()
            closeRow()
        }
    }

    const handleContentClick = (e: React.MouseEvent) => {
        if (hasMoved.current || offset !== 0) {
            e.preventDefault()
            e.stopPropagation()
            return
        }

        onClick?.()
    }

    const handleActionClick = (action: SwipeAction, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        closeRow()
        action.onClick(e)
    }

    // Dynamic edge shadow when sliding to create seamless card layering
    const edgeShadow = offset > 0
        ? '-3px 0 10px rgba(0, 0, 0, 0.08)'
        : offset < 0
        ? '3px 0 10px rgba(0, 0, 0, 0.08)'
        : 'none'

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden rounded-xl select-none ${className}`}
            style={{
                touchAction: 'pan-y',
                backgroundColor: '#FFFFFF',
                ...style,
            }}
        >
            {/* Background Actions Tray (flush with outer card edges) */}
            <div className="absolute inset-0 flex justify-between items-stretch overflow-hidden pointer-events-auto">
                {/* Left Actions (revealed when swiping right) */}
                <div 
                    className="flex h-full items-stretch"
                    style={{
                        opacity: offset > 0 ? 1 : 0,
                        pointerEvents: offset > 0 ? 'auto' : 'none',
                    }}
                >
                    {leftActions.map((action) => (
                        <button
                            key={action.key}
                            type="button"
                            onClick={(e) => handleActionClick(action, e)}
                            className="flex flex-col items-center justify-center px-2 active:opacity-85 transition-opacity cursor-pointer border-0 outline-none"
                            style={{
                                width: `${ACTION_WIDTH}px`,
                                backgroundColor: action.color,
                                color: action.textColor || '#FFFFFF',
                            }}
                        >
                            <span className="shrink-0 mb-1 opacity-95 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[2]">
                                {action.icon}
                            </span>
                            <span className="text-[11.5px] font-medium tracking-tight leading-none">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Right Actions (revealed when swiping left) */}
                <div 
                    className="flex h-full items-stretch ml-auto"
                    style={{
                        opacity: offset < 0 ? 1 : 0,
                        pointerEvents: offset < 0 ? 'auto' : 'none',
                    }}
                >
                    {rightActions.map((action) => (
                        <button
                            key={action.key}
                            type="button"
                            onClick={(e) => handleActionClick(action, e)}
                            className="flex flex-col items-center justify-center px-2 active:opacity-85 transition-opacity cursor-pointer border-0 outline-none"
                            style={{
                                width: `${ACTION_WIDTH}px`,
                                backgroundColor: action.color,
                                color: action.textColor || '#FFFFFF',
                            }}
                        >
                            <span className="shrink-0 mb-1 opacity-95 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[2]">
                                {action.icon}
                            </span>
                            <span className="text-[11.5px] font-medium tracking-tight leading-none">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Foreground Content Card (slides smoothly with Apple spring dynamics) */}
            <div
                ref={foregroundRef}
                onMouseDown={onMouseDown}
                onClickCapture={handleClickCapture}
                onClick={handleContentClick}
                className="relative z-10 w-full bg-white"
                style={{
                    transform: `translate3d(${offset}px, 0, 0)`,
                    transition: isDragging
                        ? 'none'
                        : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
                    willChange: 'transform',
                    touchAction: 'pan-y',
                    boxShadow: edgeShadow,
                }}
            >
                {children}
            </div>
        </div>
    )
}
