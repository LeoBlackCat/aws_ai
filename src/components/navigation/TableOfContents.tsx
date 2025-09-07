'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight, List } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TocItem {
  id: string
  title: string
  level: number
  element?: HTMLElement
}

interface TableOfContentsProps {
  className?: string
  sticky?: boolean
  collapsible?: boolean
  maxLevel?: number
}

export function TableOfContents({
  className,
  sticky = true,
  collapsible = true,
  maxLevel = 3
}: TableOfContentsProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Generate table of contents from page headings
  useEffect(() => {
    const generateToc = () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const items: TocItem[] = []

      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1))
        if (level <= maxLevel) {
          const id = heading.id || heading.textContent?.toLowerCase().replace(/\s+/g, '-') || ''
          
          // Ensure heading has an ID for navigation
          if (!heading.id && id) {
            heading.id = id
          }

          items.push({
            id: id,
            title: heading.textContent || '',
            level: level,
            element: heading as HTMLElement
          })
        }
      })

      setTocItems(items)
      setIsVisible(items.length > 0)
    }

    // Generate TOC after a short delay to ensure content is rendered
    const timer = setTimeout(generateToc, 100)
    
    // Regenerate on content changes
    const observer = new MutationObserver(generateToc)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id']
    })

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [maxLevel])

  // Set up intersection observer for active section tracking
  useEffect(() => {
    if (tocItems.length === 0) return

    const observerOptions = {
      rootMargin: '-20% 0px -35% 0px',
      threshold: 0
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id)
        }
      })
    }, observerOptions)

    tocItems.forEach((item) => {
      if (item.element) {
        observerRef.current?.observe(item.element)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [tocItems])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 80 // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  if (!isVisible || tocItems.length === 0) {
    return null
  }

  return (
    <nav className={cn(
      "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg",
      sticky && "sticky top-20 z-40",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4" />
          <span className="font-medium text-sm">Contents</span>
        </div>
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className={cn(
              "h-3 w-3 transition-transform",
              isCollapsed ? "rotate-0" : "rotate-90"
            )} />
          </Button>
        )}
      </div>

      {/* TOC Items */}
      {!isCollapsed && (
        <div className="p-2 max-h-96 overflow-y-auto">
          <ul className="space-y-1">
            {tocItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => scrollToHeading(item.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded transition-colors hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    activeId === item.id && "bg-accent text-accent-foreground font-medium",
                    item.level === 1 && "font-medium",
                    item.level === 2 && "ml-3",
                    item.level === 3 && "ml-6 text-muted-foreground",
                    item.level > 3 && "ml-9 text-muted-foreground text-xs"
                  )}
                >
                  <span className="line-clamp-2">
                    {item.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}