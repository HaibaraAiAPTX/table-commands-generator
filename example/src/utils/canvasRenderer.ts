import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig } from '../types'

export function renderTable(args: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  grid: RenderingData
  config: CanvasConfig
  cellText: (row: number, col: number) => string
  selection?: { startRow: number; startCol: number; endRow: number; endCol: number }
}): void {
  const { ctx, width, height, grid, config } = args
  ctx.clearRect(0, 0, width, height)
  ctx.font = config.font
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = config.gridColor
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

      ctx.strokeRect(x, y, w, h)
      const text = args.cellText(r, c)
      if (text) ctx.fillText(text, x + 8, y + h / 2)
    }
  }

  if (args.selection) {
    const s = args.selection
    const sr = Math.min(s.startRow, s.endRow)
    const er = Math.max(s.startRow, s.endRow)
    const sc = Math.min(s.startCol, s.endCol)
    const ec = Math.max(s.startCol, s.endCol)
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
