'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ExternalLink, ArrowRight, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface CrossReferenceItem {
  id: string
  title: string
  href: string
  type: 'internal' | 'external'
  description?: string
  module?: string
}

interface CrossReferenceProps {
  references: CrossReferenceItem[]
  className?: string
  title?: string
  showIcons?: boolean
  compact?: boolean
}

export function CrossReference({
  references,
  className,
  title = "Related Topics",
  showIcons = true,
  compact = false
}: CrossReferenceProps) {
  if (references.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {showIcons && <BookOpen className="h-4 w-4" />}
          {title}
        </h3>
      )}
      
      <div className={cn(
        "space-y-2",
        !compact && "grid gap-2 sm:grid-cols-2"
      )}>
        {references.map((ref) => (
          <CrossReferenceLink
            key={ref.id}
            reference={ref}
            showIcons={showIcons}
            compact={compact}
          />
        ))}
      </div>
    </div>
  )
}

interface CrossReferenceLinkProps {
  reference: CrossReferenceItem
  showIcons: boolean
  compact: boolean
}

function CrossReferenceLink({ 
  reference, 
  showIcons, 
  compact 
}: CrossReferenceLinkProps) {
  const isExternal = reference.type === 'external'
  const LinkComponent = isExternal ? 'a' : Link
  const linkProps = isExternal 
    ? { 
        href: reference.href, 
        target: '_blank', 
        rel: 'noopener noreferrer' 
      }
    : { href: reference.href }

  if (compact) {
    return (
      <LinkComponent
        {...linkProps}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors",
          "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
        )}
      >
        <span>{reference.title}</span>
        {showIcons && (
          isExternal ? (
            <ExternalLink className="h-3 w-3" />
          ) : (
            <ArrowRight className="h-3 w-3" />
          )
        )}
      </LinkComponent>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <LinkComponent
          {...linkProps}
          className="block group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                {reference.title}
              </h4>
              {reference.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {reference.description}
                </p>
              )}
              {reference.module && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full">
                  {reference.module}
                </span>
              )}
            </div>
            {showIcons && (
              <div className="flex-shrink-0 mt-0.5">
                {isExternal ? (
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            )}
          </div>
        </LinkComponent>
      </CardContent>
    </Card>
  )
}