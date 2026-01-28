import { describe, it, expect } from 'vitest'
import type { RenderingData } from '@aptx/table-commands-generator'
import { findMergedCellMain, expandSelectionToMergedCells } from '../hooks/useCanvasInteraction'

describe('selection expansion with merged cells', () => {
  it('should expand selection when passing through a merged cell', () => {
    // Create a 5x5 grid with a merged cell spanning rows 1-5, cols 2-4
    const grid: RenderingData = {
      rows: 5,
      cols: 5,
      cells: new Map([
        [1, new Map([
          [2, { merge: { rowSpan: 5, colSpan: 3 } }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [2, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [3, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [4, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [5, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
      ]),
    }

    // Selection from row 5, col 1 to row 5, col 5 (passes through the merged cell)
    const result = expandSelectionToMergedCells(grid, 5, 1, 5, 5)

    // Should expand to cover the entire merged cell (rows 1-5, cols 2-4)
    expect(result.startRow).toBe(1)
    expect(result.startCol).toBe(1)
    expect(result.endRow).toBe(5)
    expect(result.endCol).toBe(5)
  })

  it('should handle selection starting before a merged cell', () => {
    const grid: RenderingData = {
      rows: 5,
      cols: 5,
      cells: new Map([
        [1, new Map([
          [2, { merge: { rowSpan: 5, colSpan: 3 } }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [2, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [3, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [4, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [5, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
      ]),
    }

    // Selection from row 0, col 0 to row 3, col 3
    const result = expandSelectionToMergedCells(grid, 0, 0, 3, 3)

    // Should expand to cover the merged cell
    expect(result.startRow).toBe(0)
    expect(result.startCol).toBe(0)
    expect(result.endRow).toBe(5)
    expect(result.endCol).toBe(4)
  })

  it('should not expand when no merged cells are involved', () => {
    const grid: RenderingData = {
      rows: 5,
      cols: 5,
      cells: new Map(),
    }

    const result = expandSelectionToMergedCells(grid, 1, 1, 3, 3)

    expect(result.startRow).toBe(1)
    expect(result.startCol).toBe(1)
    expect(result.endRow).toBe(3)
    expect(result.endCol).toBe(3)
  })

  it('should find merged cell main from placeholder', () => {
    const grid: RenderingData = {
      rows: 5,
      cols: 5,
      cells: new Map([
        [1, new Map([
          [2, { merge: { rowSpan: 5, colSpan: 3 } }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [2, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [3, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [4, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
        [5, new Map([
          [2, { isMergedPlaceholder: true }],
          [3, { isMergedPlaceholder: true }],
          [4, { isMergedPlaceholder: true }],
        ])],
      ]),
    }

    // Find from a placeholder cell within the merged area
    const result = findMergedCellMain(grid, 3, 3)

    expect(result).not.toBeNull()
    expect(result?.row).toBe(1)
    expect(result?.col).toBe(2)
    expect(result?.rowSpan).toBe(5)
    expect(result?.colSpan).toBe(3)
  })

  it('should return null when cell is not in a merged area', () => {
    const grid: RenderingData = {
      rows: 5,
      cols: 5,
      cells: new Map(),
    }

    const result = findMergedCellMain(grid, 2, 2)

    expect(result).toBeNull()
  })
})
