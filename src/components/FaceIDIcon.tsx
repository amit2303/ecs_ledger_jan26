import React from 'react'

interface FaceIDIconProps {
    className?: string
    color?: string
}

export function FaceIDIcon({ className = 'w-6 h-6', color = 'currentColor' }: FaceIDIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {/* 4 Corner brackets */}
            <path d="M7 3H5a2 2 0 0 0-2 2v2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M3 17v2a2 2 0 0 0 2 2h2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />

            {/* Eyes */}
            <path d="M9 9.5v0.5" strokeWidth="2.5" />
            <path d="M15 9.5v0.5" strokeWidth="2.5" />

            {/* Nose */}
            <path d="M12 9v3.5a1 1 0 0 1-1 1h-0.5" />

            {/* Smile */}
            <path d="M8.5 16.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5" />
        </svg>
    )
}
