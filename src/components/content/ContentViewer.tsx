'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SwipeableContainer } from '@/components/ui/SwipeableContainer'

interface ContentViewerProps {
  children?: ReactNode
  className?: string
  content?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  enableSwipe?: boolean
}

export function ContentViewer({
  children,
  className,
  content,
  onSwipeLeft,
  onSwipeRight,
  enableSwipe = true
}: ContentViewerProps) {
  // Process content to replace images with AdaptiveImage components
  const processContent = (htmlContent: string) => {
    // This is a simplified version - in a real implementation,
    // you'd use a proper HTML parser like cheerio or similar
    return htmlContent.replace(
      /<img([^>]+)>/g,
      (match, attributes) => {
        const srcMatch = attributes.match(/src="([^"]+)"/)
        const altMatch = attributes.match(/alt="([^"]+)"/)
        
        if (srcMatch) {
          const src = srcMatch[1]
          const alt = altMatch ? altMatch[1] : ''
          
          return `<adaptive-image src="${src}" alt="${alt}"></adaptive-image>`
        }
        
        return match
      }
    )
  }

  return (
    <SwipeableContainer
      className={cn("h-full", className)}
      onSwipeLeft={enableSwipe ? onSwipeLeft : undefined}
      onSwipeRight={enableSwipe ? onSwipeRight : undefined}
      disabled={!enableSwipe}
    >
      <div className="prose prose-slate dark:prose-invert max-w-none">
        {children}
        {content && (
          <div 
            dangerouslySetInnerHTML={{ 
              __html: processContent(content) 
            }} 
          />
        )}
      </div>
    </SwipeableContainer>
  )
}