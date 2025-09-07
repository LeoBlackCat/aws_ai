'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ImageLightbox } from './ImageLightbox'
import { ZoomIn } from 'lucide-react'

interface AdaptiveImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
  enableLightbox?: boolean
  caption?: string
  sizes?: string
}

export function AdaptiveImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  enableLightbox = true,
  caption,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
}: AdaptiveImageProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageClick = () => {
    if (enableLightbox) {
      setIsLightboxOpen(true)
    }
  }

  const handleImageError = () => {
    setImageError(true)
  }

  if (imageError) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25",
        "min-h-[200px] text-muted-foreground",
        className
      )}>
        <div className="text-center p-4">
          <div className="text-sm font-medium">Image not available</div>
          <div className="text-xs mt-1">{alt}</div>
        </div>
      </div>
    )
  }

  return (
    <figure className={cn("relative group", className)}>
      <div className="relative overflow-hidden rounded-lg bg-muted">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes}
          className={cn(
            "w-full h-auto object-cover transition-transform duration-300",
            enableLightbox && "cursor-pointer group-hover:scale-105"
          )}
          onClick={handleImageClick}
          onError={handleImageError}
        />
        
        {/* Zoom overlay */}
        {enableLightbox && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 rounded-full p-2">
              <ZoomIn className="h-5 w-5 text-gray-700" />
            </div>
          </div>
        )}
      </div>
      
      {/* Caption */}
      {caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {caption}
        </figcaption>
      )}

      {/* Lightbox */}
      {enableLightbox && (
        <ImageLightbox
          src={src}
          alt={alt}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </figure>
  )
}