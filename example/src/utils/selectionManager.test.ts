import { normalizeSelection, selectionToRect } from './selectionManager'
import type { Selection } from '../types'

it('normalizes selection so start <= end', () => {
  const s: Selection = {
    startRow: 5,
    startCol: 3,
    endRow: 2,
    endCol: 1,
    active: false,
  }
  expect(normalizeSelection(s)).toEqual({
    startRow: 2,
    startCol: 1,
    endRow: 5,
    endCol: 3,
    active: false,
  })
})

it('computes inclusive rectangle size', () => {
  const s: Selection = {
    startRow: 0,
    startCol: 0,
    endRow: 1,
    endCol: 2,
    active: false,
  }
  expect(selectionToRect(s)).toEqual({ rows: 2, cols: 3 })
})
