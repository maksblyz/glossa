'use client'

import Link from 'next/link'
import {useState, useRef, useEffect} from 'react'
import Image from 'next/image'
import { Trash2 } from 'lucide-react'
import { Button } from './ui/button'

type Props = {
  file: {
    id: string
    name: string
    key: string
    uploadStatus: string
    x?: number | null
    y?: number | null
  }
  onMove?: (id: string, x: number, y: number) => void
  onDelete?: (id: string) => void
}

export default function FileIcon({file, onMove, onDelete}: Props) {
  const [pos, setPos] = useState({x: file.x ?? Math.random() * 200, y: file.y ?? Math.random() * 200})
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0})
  const [dragStartPos, setDragStartPos] = useState({x: 0, y: 0})
  const [hasDragged, setHasDragged] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    // Record the starting position but don't start dragging yet
    setDragStartPos({x: e.clientX, y: e.clientY})
    setHasDragged(false)
    const rect = elementRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    // Only start dragging if we've moved more than 5 pixels from the start
    if (!isDragging) {
      const deltaX = Math.abs(e.clientX - dragStartPos.x)
      const deltaY = Math.abs(e.clientY - dragStartPos.y)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 5) {
        setIsDragging(true)
        setHasDragged(true)
      } else {
        return
      }
    }
    
    // Get parent container bounds
    const parentElement = elementRef.current?.parentElement
    if (!parentElement) return
    
    const parentRect = parentElement.getBoundingClientRect()
    
    // Calculate new position relative to parent
    const newX = e.clientX - parentRect.left - dragOffset.x
    const newY = e.clientY - parentRect.top - dragOffset.y
    
    // Constrain to parent bounds, but use a minimum height if parent height is too small
    const effectiveParentHeight = Math.max(parentRect.height, 400) // Minimum 400px height
    const maxX = parentRect.width - 80 // 80px is the width of the file icon (w-20 = 80px)
    const maxY = effectiveParentHeight - 96 // 96px is the height of the file icon + text (h-24 = 96px)
    
    const constrainedX = Math.max(0, Math.min(newX, maxX))
    const constrainedY = Math.max(0, Math.min(newY, maxY))
    
    setPos({x: constrainedX, y: constrainedY})
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      onMove?.(file.id, pos.x, pos.y)
    }
    // Reset drag start position
    setDragStartPos({x: 0, y: 0})
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(file.id)
  }

  useEffect(() => {
    if (dragStartPos.x !== 0 || dragStartPos.y !== 0) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, pos.x, pos.y, dragStartPos])

  return (
    <div
      ref={elementRef}
      className="absolute select-none"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/pdf/${encodeURIComponent(file.key)}`}
        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
        onClick={(e) => {
          if (hasDragged) {
            e.preventDefault()
            return
          }
        }}
      >
        <div className="flex flex-col items-center relative">
          <div className="relative hover:shadow-md transition-shadow">
            <Image
              src="/file_icon.png"
              alt="File icon"
              width={90}
              height={100}
              className="w-auto h-auto"
            />
            {/* Status indicator */}
            <div className="absolute top-1 right-1">
              <div className={`w-3 h-3 rounded-full ${
                file.uploadStatus === 'SUCCESS' ? 'bg-green-500' :
                file.uploadStatus === 'PROCESSING' ? 'bg-yellow-500' :
                file.uploadStatus === 'FAILED' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
            </div>
          </div>
          <span className="block w-20 truncate text-xs font-medium text-gray-700 mt-1">
            {file.name}
          </span>
          
          {/* Delete button - appear on hover */}
          {isHovered && (
            <div className="mt-1">
              <button
                className="text-black hover:text-gray-700 transition-colors"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
} 