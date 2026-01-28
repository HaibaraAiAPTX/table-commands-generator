import type { RenderingData } from '@aptx/table-commands-generator'

/**
 * Find the main cell of a merged area.
 * If the cell is a placeholder, search backwards to find the cell with merge info.
 * Returns the main cell position and its merge info, or null if not part of a merged area.
 */
export function findMergedCellMain(
  grid: RenderingData,
  row: number,
  col: number
): { row: number; col: number; rowSpan: number; colSpan: number } | null {
  const cell = grid.cells.get(row)?.get(col)

  // If this is the main cell with merge info
  if (cell?.merge) {
    return { row, col, rowSpan: cell.merge.rowSpan, colSpan: cell.merge.colSpan }
  }

  // If this is a placeholder, search backwards for the main cell
  if (cell?.isMergedPlaceholder) {
    // Search backwards to find the cell that merges this area
    for (let r = row; r >= 0; r--) {
      for (let c = col; c >= 0; c--) {
        const candidate = grid.cells.get(r)?.get(c)
        if (candidate?.merge) {
          // Check if this merge area contains the clicked cell
          if (
            row >= r &&
            row < r + candidate.merge.rowSpan &&
            col >= c &&
            col < c + candidate.merge.colSpan
          ) {
            return {
              row: r,
              col: c,
              rowSpan: candidate.merge.rowSpan,
              colSpan: candidate.merge.colSpan,
            }
          }
        }
      }
    }
  }

  return null
}
