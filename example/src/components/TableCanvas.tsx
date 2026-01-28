import { useEffect, useMemo, useRef } from 'react'
import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig, EditingCell, Selection } from '../types'
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'
import { renderGridLayer, renderTextLayer } from '../utils/canvasRenderer'
import { useZoom } from './CanvasViewport'

const DEFAULT_CONFIG: CanvasConfig = {
  cellWidth: 120,
  cellHeight: 44,
  gridColor: '#e2e8f0',
  selectionColor: 'rgba(99, 102, 241, 0.15)',
  textColor: '#334155',
  font: '14px Inter, system-ui, sans-serif',
}

export default function TableCanvas(props: {
  grid: RenderingData | null
  selection: Selection | null
  cellText: (r: number, c: number) => string
  config?: CanvasConfig
  editingRect?: { x: number; y: number; width: number; height: number } | null
  onSelectionChange: (sel: Selection) => void
  onCellDoubleClick: (cell: EditingCell) => void
}): JSX.Element {
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const config = props.config ?? DEFAULT_CONFIG
  const zoom = useZoom()
  const scale = zoom / 100

  // Calculate canvas size based on actual grid dimensions
  const canvasSize = useMemo(() => {
    if (!props.grid) {
      return { width: 800, height: 400 }
    }
    const width = props.grid.cols * config.cellWidth
    const height = props.grid.rows * config.cellHeight
    // Use actual table size without minimum constraints
    return { width, height }
  }, [props.grid, config.cellWidth, config.cellHeight])

  const selectionForRender = useMemo(() => {
    if (!props.selection) return undefined
    return {
      startRow: props.selection.startRow,
      startCol: props.selection.startCol,
      endRow: props.selection.endRow,
      endCol: props.selection.endCol,
    }
  }, [props.selection])

  useEffect(() => {
    const canvas = gridCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!props.grid) {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
      return
    }
    renderGridLayer({
      ctx,
      width: canvasSize.width,
      height: canvasSize.height,
      grid: props.grid,
      config,
      selection: selectionForRender,
    })
  }, [config, props.grid, canvasSize, selectionForRender])

  useEffect(() => {
    const canvas = textCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!props.grid) {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
      return
    }
    renderTextLayer({
      ctx,
      width: canvasSize.width,
      height: canvasSize.height,
      grid: props.grid,
      config,
      cellText: props.cellText,
      editingRect: props.editingRect ?? undefined,
    })
  }, [config, props.grid, canvasSize, props.cellText, props.editingRect])

  const handlers = useCanvasInteraction({
    cellWidth: config.cellWidth,
    cellHeight: config.cellHeight,
    grid: props.grid,
    onSelectionChange: props.onSelectionChange,
    onDoubleClick: props.onCellDoubleClick,
    scale,
  })

  return (
    <div
      className="relative"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    >
      <canvas
        ref={gridCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
        onDoubleClick={handlers.onDoubleClick}
        className="block bg-white cursor-crosshair"
        style={{
          display: 'block',
        }}
      />
      <canvas
        ref={textCanvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="absolute left-0 top-0 pointer-events-none"
      />
    </div>
  )
}
