'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

interface SwipeableContainerProps {
  children: ReactNode
  className?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  disabled?: boolean
}

export function SwipeableContainer({
  children,
  className,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  disabled = false
}: SwipeableContainerProps) {
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: disabled ? undefined : onSwipeLeft,
    onSwipeRight: disabled ? undefined : onSwipeRight,
    onSwipeUp: disabled ? undefined : onSwipeUp,
    onSwipeDown: disabled ? undefined : onSwipeDown,
    threshold
  })

  return (
    <div
      className={cn("touch-pan-y", className)}
      {...(disabled ? {} : swipeHandlers)}
    >
      {children}
    </div>
  )
}