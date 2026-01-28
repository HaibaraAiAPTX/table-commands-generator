import type { Selection } from '../types'

export function normalizeSelection(s: Selection): Selection {
  const startRow = Math.min(s.startRow, s.endRow)
  const endRow = Math.max(s.startRow, s.endRow)
  const startCol = Math.min(s.startCol, s.endCol)
  const endCol = Math.max(s.startCol, s.endCol)
  return { ...s, startRow, startCol, endRow, endCol }
}

export function selectionToRect(s: Selection): { rows: number; cols: number } {
  const n = normalizeSelection(s)
  return { rows: n.endRow - n.startRow + 1, cols: n.endCol - n.startCol + 1 }
}
