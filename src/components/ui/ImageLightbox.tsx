'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react'
import { Button } from './button'

interface ImageLightboxProps {
  src: string
  alt: string
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function ImageLightbox({ 
  src, 
  alt, 
  isOpen, 
  onClose,
  className 
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Reset state when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setScale(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          e.preventDefault()
          setScale(prev => Math.min(prev * 1.2, 5))
          break
        case '-':
          e.preventDefault()
          setScale(prev => Math.max(prev / 1.2, 0.1))
          break
        case '0':
          e.preventDefault()
          setScale(1)
          setPosition({ x: 0, y: 0 })
          setRotation(0)
          break
        case 'r':
          e.preventDefault()
          setRotation(prev => (prev + 90) % 360)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.2, 5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev / 1.2, 0.1))
  }, [])

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])



  const handleDownload = useCallback(() => {
    const link = document.createElement('a')
    link.href = src
    link.download = alt || 'image'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [src, alt])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [scale, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, scale, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  if (!isOpen) return null

  const lightboxContent = (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/90 flex items-center justify-center",
      className
    )}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
      />
      
      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 0.1}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 5}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleRotate}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleDownload}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={onClose}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Image */}
      <div className="relative max-w-full max-h-full overflow-hidden">
        <img
          src={src}
          alt={alt}
          className={cn(
            "max-w-none transition-transform duration-200 select-none",
            scale > 1 ? "cursor-grab" : "cursor-zoom-in",
            isDragging && "cursor-grabbing"
          )}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${position.y / scale}px)`,
            maxWidth: scale === 1 ? '90vw' : 'none',
            maxHeight: scale === 1 ? '90vh' : 'none'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            e.stopPropagation()
            if (scale === 1) {
              handleZoomIn()
            }
          }}
          draggable={false}
        />
      </div>

      {/* Info */}
      <div className="absolute bottom-4 left-4 right-4 text-center">
        <p className="text-white/80 text-sm bg-black/50 rounded px-3 py-1 inline-block">
          {alt}
        </p>
        <p className="text-white/60 text-xs mt-1">
          Use +/- to zoom, R to rotate, 0 to reset, ESC to close
        </p>
      </div>
    </div>
  )

  return createPortal(lightboxContent, document.body)
}