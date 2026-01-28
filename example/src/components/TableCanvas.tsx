import { useEffect, useMemo, useRef, forwardRef } from 'react'
import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig, EditingCell, Selection } from '../types'
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'
import { renderTable } from '../utils/canvasRenderer'
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
  onSelectionChange: (sel: Selection) => void
  onCellDoubleClick: (cell: EditingCell) => void
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
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
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!props.grid) {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)
      return
    }
    renderTable({
      ctx,
      width: canvasSize.width,
      height: canvasSize.height,
      grid: props.grid,
      config,
      selection: selectionForRender,
      cellText: props.cellText,
    })
  }, [config, props.grid, canvasSize, props.cellText, selectionForRender])

  const handlers = useCanvasInteraction({
    cellWidth: config.cellWidth,
    cellHeight: config.cellHeight,
    grid: props.grid,
    onSelectionChange: props.onSelectionChange,
    onDoubleClick: props.onCellDoubleClick,
    scale,
  })

  return (
    <canvas
      ref={canvasRef}
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
  )
}
