import { describe, it, expect } from 'vitest'
import { createTableCore } from '../table/tableCore'
import { getEditingRect } from './editingRect'
import type { CanvasConfig } from '../types'

const config: CanvasConfig = {
  cellWidth: 120,
  cellHeight: 44,
  gridColor: '#e2e8f0',
  selectionColor: 'rgba(99, 102, 241, 0.15)',
  textColor: '#334155',
  font: '14px Inter, system-ui, sans-serif',
}

describe('getEditingRect', () => {
  it('returns a 1x1 rect for a normal cell', () => {
    const core = createTableCore({ rows: 3, cols: 3 })
    const grid = core.getGrid()

    const rect = getEditingRect(grid, { row: 2, col: 1 }, config)

    expect(rect).toEqual({
      x: 1 * 120,
      y: 2 * 44,
      width: 120,
      height: 44,
      rowSpan: 1,
      colSpan: 1,
    })
  })

  it('expands to merged area when editing merged cell', () => {
    const core = createTableCore({ rows: 3, cols: 3 })
    core.merge(0, 0, 1, 1)
    const grid = core.getGrid()

    const rect = getEditingRect(grid, { row: 0, col: 0 }, config)

    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 2 * 120,
      height: 2 * 44,
      rowSpan: 2,
      colSpan: 2,
    })
  })

  it('uses merged main cell when editing a placeholder cell', () => {
    const core = createTableCore({ rows: 3, cols: 3 })
    core.merge(0, 0, 1, 1)
    const grid = core.getGrid()

    const rect = getEditingRect(grid, { row: 1, col: 1 }, config)

    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: 2 * 120,
      height: 2 * 44,
      rowSpan: 2,
      colSpan: 2,
    })
  })
})
