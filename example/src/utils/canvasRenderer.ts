import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig } from '../types'

export function renderGridLayer(args: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  grid: RenderingData
  config: CanvasConfig
  selection?: { startRow: number; startCol: number; endRow: number; endCol: number }
}): void {
  const { ctx, width, height, grid, config, selection } = args
  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = config.gridColor

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells.get(r)?.get(c)
      if (cell?.isMergedPlaceholder) continue

      const rowSpan = cell?.merge?.rowSpan ?? 1
      const colSpan = cell?.merge?.colSpan ?? 1
      const x = c * config.cellWidth
      const y = r * config.cellHeight
      const w = colSpan * config.cellWidth
      const h = rowSpan * config.cellHeight

      ctx.strokeRect(x, y, w, h)
    }
  }

  if (selection) {
    const sr = Math.min(selection.startRow, selection.endRow)
    const er = Math.max(selection.startRow, selection.endRow)
    const sc = Math.min(selection.startCol, selection.endCol)
    const ec = Math.max(selection.startCol, selection.endCol)
    // Clamp selection to grid boundaries
    const clampedSr = Math.max(0, Math.min(sr, grid.rows - 1))
    const clampedEr = Math.max(0, Math.min(er, grid.rows - 1))
    const clampedSc = Math.max(0, Math.min(sc, grid.cols - 1))
    const clampedEc = Math.max(0, Math.min(ec, grid.cols - 1))
    const x = clampedSc * config.cellWidth
    const y = clampedSr * config.cellHeight
    const w = (clampedEc - clampedSc + 1) * config.cellWidth
    const h = (clampedEr - clampedSr + 1) * config.cellHeight
    ctx.save()
    ctx.fillStyle = config.selectionColor
    ctx.fillRect(x, y, w, h)
    ctx.restore()
  }
}

export function renderTextLayer(args: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  grid: RenderingData
  config: CanvasConfig
  cellText: (row: number, col: number) => string
  editingRect?: { x: number; y: number; width: number; height: number }
}): void {
  const { ctx, width, height, grid, config, cellText, editingRect } = args
  ctx.clearRect(0, 0, width, height)
  ctx.font = config.font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = config.textColor

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells.get(r)?.get(c)
      if (cell?.isMergedPlaceholder) continue

      const rowSpan = cell?.merge?.rowSpan ?? 1
      const colSpan = cell?.merge?.colSpan ?? 1
      const x = c * config.cellWidth
      const y = r * config.cellHeight
      const w = colSpan * config.cellWidth
      const h = rowSpan * config.cellHeight

      const isEditingCell =
        !!editingRect &&
        editingRect.x <= x &&
        editingRect.y <= y &&
        editingRect.x + editingRect.width >= x + w &&
        editingRect.y + editingRect.height >= y + h

      const text = cellText(r, c)
      if (text && !isEditingCell) ctx.fillText(text, x + 8, y + h / 2)
    }
  }
}

export function renderTable(args: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  grid: RenderingData
  config: CanvasConfig
  cellText: (row: number, col: number) => string
  selection?: { startRow: number; startCol: number; endRow: number; endCol: number }
  editingRect?: { x: number; y: number; width: number; height: number }
}): void {
  renderGridLayer({
    ctx: args.ctx,
    width: args.width,
    height: args.height,
    grid: args.grid,
    config: args.config,
    selection: args.selection,
  })

  renderTextLayer({
    ctx: args.ctx,
    width: args.width,
    height: args.height,
    grid: args.grid,
    config: args.config,
    cellText: args.cellText,
    editingRect: args.editingRect,
  })
}
