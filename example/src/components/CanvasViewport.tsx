import { useState, useCallback, useRef, createContext, useContext, useMemo } from 'react'
import { Button } from './ui/button'

interface CanvasViewportProps {
  children: React.ReactNode
  gridWidth: number
  gridHeight: number
  minWidth?: number
  minHeight?: number
}

const ZoomContext = createContext(100)

export function useZoom() {
  return useContext(ZoomContext)
}

export function CanvasViewport({
  children,
  gridWidth,
  gridHeight,
  minWidth = 600,
  minHeight = 400,
}: CanvasViewportProps) {
  const [zoom, setZoom] = useState(100)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Dynamic container height: comfortable style with minimum 400px
  const containerHeight = useMemo(() => {
    const tableHeightWithPadding = gridHeight + 48 // Add padding for controls
    return Math.max(tableHeightWithPadding, minHeight)
  }, [gridHeight, minHeight])

  const zoomLevels = [50, 75, 100, 125, 150, 200]
  const zoomIn = useCallback(() => {
    setZoom((z) => {
      const next = zoomLevels.find((level) => level > z)
      return next ?? z
    })
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const reversed = [...zoomLevels].reverse()
      const next = reversed.find((level) => level < z)
      return next ?? z
    })
  }, [])

  const resetZoom = useCallback(() => setZoom(100), [])
  const fitToView = useCallback(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const availableWidth = container.clientWidth - 48 // padding
    const availableHeight = container.clientHeight - 48

    const scaleX = (availableWidth / gridWidth) * 100
    const scaleY = (availableHeight / gridHeight) * 100
    const fitZoom = Math.floor(Math.min(scaleX, scaleY, 100))

    // Snap to nearest zoom level
    const closest = zoomLevels.reduce((prev, curr) =>
      Math.abs(curr - fitZoom) < Math.abs(prev - fitZoom) ? curr : prev
    )
    setZoom(closest)
  }, [gridWidth, gridHeight])

  const scale = zoom / 100

  return (
    <ZoomContext.Provider value={zoom}>
      <div ref={containerRef} className="relative group">
        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={zoomOut}
            disabled={zoom <= zoomLevels[0]}
            title="Zoom out"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </Button>

          <div className="px-2">
            <span className="text-xs font-medium text-slate-700 min-w-[3rem] text-center inline-block">
              {zoom}%
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={zoomIn}
            disabled={zoom >= zoomLevels[zoomLevels.length - 1]}
            title="Zoom in"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>

          <div className="w-px h-4 bg-slate-200 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={resetZoom}
            disabled={zoom === 100}
            title="Reset zoom"
          >
            Reset
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={fitToView}
            title="Fit to view"
          >
            Fit
          </Button>
        </div>

        {/* Dimensions Badge */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs font-medium text-slate-600">
            {gridWidth} × {gridHeight}px
          </span>
        </div>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="relative overflow-auto rounded-lg bg-white border border-slate-200 shadow-soft custom-scrollbar transition-all duration-200 ease-out"
          style={{
            width: '100%',
            height: containerHeight,
            minWidth,
          }}
        >
          <div
            className="inline-block origin-top-left transition-transform duration-200 ease-out relative"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </ZoomContext.Provider>
  )
}
