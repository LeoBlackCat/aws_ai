'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  BookOpen, 
  Brain, 
  Play,
  BarChart3
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    href: '/'
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: BookOpen,
    href: '/learn'
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: Play,
    href: '/practice'
  },
  {
    id: 'flashcards',
    label: 'Cards',
    icon: Brain,
    href: '/flashcards'
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: BarChart3,
    href: '/progress'
  }
]

interface BottomNavigationProps {
  currentTab?: string
}

export function BottomNavigation({ currentTab }: BottomNavigationProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id || pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-2 text-xs font-medium transition-colors touch-target",
                "hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5 mb-1 transition-transform",
                  isActive && "scale-110"
                )} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "truncate leading-none",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}