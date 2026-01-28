import React, { useCallback, useRef } from 'react';

interface Options {
    delay?: number;
    moveThreshold?: number; // pixels of movement before canceling
}

export const useLongPress = (
    onLongPress: (e: React.MouseEvent | React.TouchEvent) => void,
    onClick?: (e: React.MouseEvent | React.TouchEvent) => void,
    { delay = 500, moveThreshold = 10 }: Options = {}
) => {
    const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const longPressTriggered = useRef(false);
    const touchCancelled = useRef(false);
    const startPos = useRef<{ x: number; y: number } | null>(null);

    const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        longPressTriggered.current = false;
        touchCancelled.current = false;

        // Track start position for touch events
        if ('touches' in e && e.touches.length > 0) {
            startPos.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        } else if ('clientX' in e) {
            startPos.current = {
                x: e.clientX,
                y: e.clientY
            };
        }

        timeout.current = setTimeout(() => {
            longPressTriggered.current = true;
            onLongPress(e);
        }, delay);
    }, [onLongPress, delay]);

    const clear = useCallback(() => {
        if (timeout.current) {
            clearTimeout(timeout.current);
            timeout.current = undefined;
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!startPos.current || touchCancelled.current) return;

        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - startPos.current.x);
        const deltaY = Math.abs(touch.clientY - startPos.current.y);

        // Only cancel if moved beyond threshold
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
            touchCancelled.current = true;
            clear();
        }
    }, [clear, moveThreshold]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        clear();

        // If long press was triggered or touch was cancelled by movement, don't trigger click
        if (longPressTriggered.current || touchCancelled.current) {
            e.preventDefault(); // Prevent phantom clicks after long press
            return;
        }

        // Do NOT manually trigger click here. Let the browser fire the standard click event.
        // This ensures better compatibility with routers and other libraries.
    }, [clear]);

    const handleMouseUp = useCallback(() => {
        clear();
    }, [clear]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        // For mouse events, handle click normally
        if (longPressTriggered.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        onClick?.(e);
    }, [onClick]);

    return {
        onMouseDown: (e: React.MouseEvent) => start(e),
        onTouchStart: (e: React.TouchEvent) => start(e),
        onMouseUp: handleMouseUp,
        onMouseLeave: clear,
        onTouchEnd: handleTouchEnd,
        onTouchMove: handleTouchMove,
        onClick: handleClick
    };
};
