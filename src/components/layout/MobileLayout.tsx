'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BottomNavigation } from './BottomNavigation'

interface MobileLayoutProps {
  children: ReactNode
  className?: string
  showBottomNav?: boolean
  currentTab?: string
}

export function MobileLayout({ 
  children, 
  className, 
  showBottomNav = true,
  currentTab 
}: MobileLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col",
      className
    )}>
      {/* Main content area with bottom padding for navigation */}
      <main className={cn(
        "flex-1 overflow-hidden",
        showBottomNav && "pb-16" // Space for bottom navigation
      )}>
        {children}
      </main>
      
      {/* Bottom Navigation */}
      {showBottomNav && (
        <BottomNavigation currentTab={currentTab} />
      )}
    </div>
  )
}