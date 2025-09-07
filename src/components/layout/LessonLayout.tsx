'use client'

import React, { ReactNode } from 'react'
import { MobileLayout } from './MobileLayout'
import { ResponsiveContainer } from './ResponsiveContainer'
import { TableOfContents } from '@/components/navigation/TableOfContents'
import { CrossReference } from '@/components/navigation/CrossReference'
import { ContentViewer } from '@/components/content/ContentViewer'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LessonLayoutProps {
  children?: ReactNode
  title: string
  content?: string
  className?: string
  showToc?: boolean
  crossReferences?: Array<{
    id: string
    title: string
    href: string
    type: 'internal' | 'external'
    description?: string
    module?: string
  }>
  onPreviousLesson?: () => void
  onNextLesson?: () => void
  previousLessonTitle?: string
  nextLessonTitle?: string
  enableSwipeNavigation?: boolean
}

export function LessonLayout({
  children,
  title,
  content,
  className,
  showToc = true,
  crossReferences = [],
  onPreviousLesson,
  onNextLesson,
  previousLessonTitle,
  nextLessonTitle,
  enableSwipeNavigation = true
}: LessonLayoutProps) {
  return (
    <MobileLayout currentTab="learn" className={className}>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <ResponsiveContainer size="xl" padding="md">
            {/* Header */}
            <header className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                {title}
              </h1>
              
              {/* Navigation buttons for larger screens */}
              <div className="hidden sm:flex items-center justify-between">
                <div>
                  {onPreviousLesson && previousLessonTitle && (
                    <Button
                      variant="outline"
                      onClick={onPreviousLesson}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden md:inline">Previous:</span>
                      <span className="truncate max-w-32 md:max-w-none">
                        {previousLessonTitle}
                      </span>
                    </Button>
                  )}
                </div>
                <div>
                  {onNextLesson && nextLessonTitle && (
                    <Button
                      variant="outline"
                      onClick={onNextLesson}
                      className="flex items-center gap-2"
                    >
                      <span className="truncate max-w-32 md:max-w-none">
                        {nextLessonTitle}
                      </span>
                      <span className="hidden md:inline">:Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </header>

            {/* Content with swipe navigation */}
            <ContentViewer
              content={content}
              onSwipeLeft={enableSwipeNavigation ? onNextLesson : undefined}
              onSwipeRight={enableSwipeNavigation ? onPreviousLesson : undefined}
              enableSwipe={enableSwipeNavigation}
              className="mb-8"
            >
              {children}
            </ContentViewer>

            {/* Cross References */}
            {crossReferences.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <CrossReference
                  references={crossReferences}
                  title="Related Topics"
                />
              </div>
            )}

            {/* Bottom Navigation for mobile */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t sm:hidden">
              <div className="flex-1">
                {onPreviousLesson && previousLessonTitle && (
                  <Button
                    variant="outline"
                    onClick={onPreviousLesson}
                    className="w-full flex items-center justify-start gap-2"
                  >
                    <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs text-muted-foreground">Previous</div>
                      <div className="truncate text-sm">
                        {previousLessonTitle}
                      </div>
                    </div>
                  </Button>
                )}
              </div>
              
              <div className="w-4" /> {/* Spacer */}
              
              <div className="flex-1">
                {onNextLesson && nextLessonTitle && (
                  <Button
                    variant="outline"
                    onClick={onNextLesson}
                    className="w-full flex items-center justify-end gap-2"
                  >
                    <div className="text-right min-w-0">
                      <div className="text-xs text-muted-foreground">Next</div>
                      <div className="truncate text-sm">
                        {nextLessonTitle}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  </Button>
                )}
              </div>
            </div>
          </ResponsiveContainer>
        </div>

        {/* Sidebar with TOC */}
        {showToc && (
          <aside className="w-full lg:w-80 lg:flex-shrink-0">
            <div className="lg:sticky lg:top-6 p-4 lg:p-0">
              <TableOfContents
                sticky={false}
                collapsible={true}
                maxLevel={3}
              />
            </div>
          </aside>
        )}
      </div>
    </MobileLayout>
  )
}