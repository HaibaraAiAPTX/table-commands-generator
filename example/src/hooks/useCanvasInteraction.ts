import { useCallback, useRef } from 'react'
import type { RenderingData } from '@aptx/table-commands-generator'
import type { EditingCell, Selection } from '../types'
import { pointToCell } from '../utils/coords'
import { findMergedCellMain } from '../utils/mergedCells'

/**
 * Expand selection to include all merged cells that intersect with the selection range.
 * This implements the "spillover" effect where selecting through a merged cell
 * automatically expands the selection to cover the entire merged area.
 */
export function expandSelectionToMergedCells(
  grid: RenderingData,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): { startRow: number; startCol: number; endRow: number; endCol: number } {
  let newStartRow = startRow
  let newStartCol = startCol
  let newEndRow = endRow
  let newEndCol = endCol

  const minRow = Math.min(startRow, endRow)
  const maxRow = Math.max(startRow, endRow)
  const minCol = Math.min(startCol, endCol)
  const maxCol = Math.max(startCol, endCol)

  // Check all cells in the selection range
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const mergedMain = findMergedCellMain(grid, r, c)
      if (mergedMain) {
        // Expand selection to include the entire merged cell
        const mergedEndRow = mergedMain.row + mergedMain.rowSpan - 1
        const mergedEndCol = mergedMain.col + mergedMain.colSpan - 1

        newStartRow = Math.min(newStartRow, mergedMain.row)
        newStartCol = Math.min(newStartCol, mergedMain.col)
        newEndRow = Math.max(newEndRow, mergedEndRow)
        newEndCol = Math.max(newEndCol, mergedEndCol)
      }
    }
  }

  return { startRow: newStartRow, startCol: newStartCol, endRow: newEndRow, endCol: newEndCol }
}

export function useCanvasInteraction(args: {
  cellWidth: number
  cellHeight: number
  grid: RenderingData | null
  onSelectionChange: (sel: Selection) => void
  onDoubleClick: (cell: EditingCell) => void
  scale: number
}): {
  onMouseDown: (ev: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseMove: (ev: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseUp: () => void
  onDoubleClick: (ev: React.MouseEvent<HTMLCanvasElement>) => void
} {
  const draggingRef = useRef(false)
  const startRef = useRef<{ row: number; col: number } | null>(null)

  const getPoint = useCallback((ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    // Adjust coordinates for zoom scale
    const x = (ev.clientX - rect.left) / args.scale
    const y = (ev.clientY - rect.top) / args.scale
    return { x, y }
  }, [args.scale])

  const onMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLCanvasElement>) => {
      draggingRef.current = true
      const cell = pointToCell(getPoint(ev), args)

      let startRow = cell.row
      let startCol = cell.col
      let endRow = cell.row
      let endCol = cell.col

      // Check if the clicked cell is part of a merged area
      if (args.grid) {
        const mergedMain = findMergedCellMain(args.grid, cell.row, cell.col)
        if (mergedMain) {
          // Use the main cell position as selection start
          startRow = mergedMain.row
          startCol = mergedMain.col
          endRow = mergedMain.row + mergedMain.rowSpan - 1
          endCol = mergedMain.col + mergedMain.colSpan - 1
          // Save the main cell position for dragging
          startRef.current = { row: startRow, col: startCol }
        } else {
          startRef.current = cell
        }

        // Apply expansion to handle merged cells within the selection
        const expanded = expandSelectionToMergedCells(
          args.grid,
          startRow,
          startCol,
          endRow,
          endCol
        )
        startRow = expanded.startRow
        startCol = expanded.startCol
        endRow = expanded.endRow
        endCol = expanded.endCol
      } else {
        startRef.current = cell
      }

      args.onSelectionChange({
        startRow,
        startCol,
        endRow,
        endCol,
        active: true,
      })
    },
    [args, getPoint],
  )

  const onMouseMove = useCallback(
    (ev: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current || !startRef.current) return
      const endCell = pointToCell(getPoint(ev), args)
      const start = startRef.current

      let endRow = endCell.row
      let endCol = endCell.col

      // Handle merged cell at end position
      if (args.grid) {
        const mergedEnd = findMergedCellMain(args.grid, endCell.row, endCell.col)
        if (mergedEnd) {
          // Extend to the far corner of the merged area
          endRow = mergedEnd.row + mergedEnd.rowSpan - 1
          endCol = mergedEnd.col + mergedEnd.colSpan - 1
        }
      }

      // Expand selection to include all merged cells that intersect with the selection
      if (args.grid) {
        const expanded = expandSelectionToMergedCells(
          args.grid,
          start.row,
          start.col,
          endRow,
          endCol
        )
        args.onSelectionChange({
          startRow: expanded.startRow,
          startCol: expanded.startCol,
          endRow: expanded.endRow,
          endCol: expanded.endCol,
          active: true,
        })
      } else {
        args.onSelectionChange({
          startRow: start.row,
          startCol: start.col,
          endRow,
          endCol,
          active: true,
        })
      }
    },
    [args, getPoint],
  )

  const onMouseUp = useCallback(() => {
    draggingRef.current = false
    startRef.current = null
  }, [])

  const onDoubleClick = useCallback(
    (ev: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = pointToCell(getPoint(ev), args)
      args.onDoubleClick({ row: cell.row, col: cell.col })
    },
    [args, getPoint],
  )

  return { onMouseDown, onMouseMove, onMouseUp, onDoubleClick }
}
