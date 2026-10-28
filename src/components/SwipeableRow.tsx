'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

export interface SwipeAction {
    key: string
    label: string
    icon: React.ReactNode
    color: string // e.g. '#007AFF', '#E05353', '#F59E0B', '#30A46C'
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

const ACTION_WIDTH = 74 // Width of each action button in pixels

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
    const rowRef = useRef<HTMLDivElement>(null)

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

    const closeRow = useCallback(() => {
        setOffset(0)
        currentOffset.current = 0
    }, [])

    // --- Touch / Mouse Drag handlers ---
    const handleStart = (clientX: number, clientY: number) => {
        if (disabled) return
        startX.current = clientX
        startY.current = clientY
        isHorizontalSwipe.current = null
        hasMoved.current = false
        wasOpenBeforeDrag.current = currentOffset.current !== 0
    }

    const handleMove = (clientX: number, clientY: number, e?: TouchEvent | MouseEvent) => {
        if (disabled) return
        const deltaX = clientX - startX.current
        const deltaY = clientY - startY.current

        // Determine intent on first few pixels
        if (isHorizontalSwipe.current === null) {
            const absX = Math.abs(deltaX)
            const absY = Math.abs(deltaY)
            if (absX > 6 || absY > 6) {
                if (absX > absY) {
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
            e.preventDefault()
        }

        hasMoved.current = true

        // Base offset before this drag gesture
        const base = wasOpenBeforeDrag.current ? currentOffset.current : 0
        let newOffset = base + deltaX

        // Resistance damping when pulling past the action buttons
        if (newOffset > totalLeftWidth) {
            const overflow = newOffset - totalLeftWidth
            newOffset = totalLeftWidth + overflow * 0.2
        } else if (newOffset < -totalRightWidth) {
            const overflow = -newOffset - totalRightWidth
            newOffset = -totalRightWidth - overflow * 0.2
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
    }

    const handleEnd = () => {
        if (disabled) return
        setIsDragging(false)

        if (!isHorizontalSwipe.current) {
            return
        }

        const current = currentOffset.current
        let targetOffset = 0

        if (current > 0 && totalLeftWidth > 0) {
            // Swiped right -> reveal left actions
            if (current > totalLeftWidth * 0.38) {
                targetOffset = totalLeftWidth
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(12)
                }
            } else {
                targetOffset = 0
            }
        } else if (current < 0 && totalRightWidth > 0) {
            // Swiped left -> reveal right actions
            if (-current > totalRightWidth * 0.38) {
                targetOffset = -totalRightWidth
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(12)
                }
            } else {
                targetOffset = 0
            }
        }

        currentOffset.current = targetOffset
        setOffset(targetOffset)
    }

    // Touch event listeners
    const onTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY)
        }
    }

    const onTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            handleMove(e.touches[0].clientX, e.touches[0].clientY, e.nativeEvent)
        }
    }

    const onTouchEnd = () => {
        handleEnd()
    }

    // Mouse drag support for desktop/browser
    const onMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return // Only main left click
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

    const handleContentClick = (e: React.MouseEvent) => {
        // If the row was dragged or swiped, suppress inner link navigation
        if (hasMoved.current) {
            e.preventDefault()
            e.stopPropagation()
            return
        }

        // If row is currently open and clicked, just close it
        if (offset !== 0) {
            e.preventDefault()
            e.stopPropagation()
            closeRow()
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

    return (
        <div
            ref={rowRef}
            className={`relative overflow-hidden rounded-xl select-none ${className}`}
            style={{
                touchAction: 'pan-y', // allows vertical scrolling while letting us handle horizontal swipe
                ...style,
            }}
        >
            {/* Background Actions Container */}
            <div className="absolute inset-0 flex justify-between items-stretch rounded-xl overflow-hidden pointer-events-auto">
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
                            className="flex flex-col items-center justify-center px-3.5 active:brightness-90 transition-all cursor-pointer"
                            style={{
                                width: `${ACTION_WIDTH}px`,
                                backgroundColor: action.color,
                                color: action.textColor || '#FFFFFF',
                            }}
                        >
                            <span className="shrink-0 mb-1">{action.icon}</span>
                            <span className="text-[11px] font-semibold tracking-tight uppercase leading-none">
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
                            className="flex flex-col items-center justify-center px-3.5 active:brightness-90 transition-all cursor-pointer"
                            style={{
                                width: `${ACTION_WIDTH}px`,
                                backgroundColor: action.color,
                                color: action.textColor || '#FFFFFF',
                            }}
                        >
                            <span className="shrink-0 mb-1">{action.icon}</span>
                            <span className="text-[11px] font-semibold tracking-tight uppercase leading-none">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Foreground Content Card (slides horizontally) */}
            <div
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onTouchCancel={onTouchEnd}
                onMouseDown={onMouseDown}
                onClick={handleContentClick}
                className="relative z-10 w-full"
                style={{
                    transform: `translate3d(${offset}px, 0, 0)`,
                    transition: isDragging
                        ? 'none'
                        : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
                    willChange: 'transform',
                }}
            >
                {children}
            </div>
        </div>
    )
}
