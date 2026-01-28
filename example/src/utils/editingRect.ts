import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig, EditingCell } from '../types'
import { findMergedCellMain } from './mergedCells'

export function getEditingRect(
  grid: RenderingData,
  editingCell: EditingCell,
  config: CanvasConfig
): {
  x: number
  y: number
  width: number
  height: number
  rowSpan: number
  colSpan: number
} {
  const merged = findMergedCellMain(grid, editingCell.row, editingCell.col)
  const row = merged?.row ?? editingCell.row
  const col = merged?.col ?? editingCell.col
  const rowSpan = merged?.rowSpan ?? 1
  const colSpan = merged?.colSpan ?? 1

  return {
    x: col * config.cellWidth,
    y: row * config.cellHeight,
    width: colSpan * config.cellWidth,
    height: rowSpan * config.cellHeight,
    rowSpan,
    colSpan,
  }
}
