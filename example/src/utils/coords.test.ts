import { pointToCell } from './coords'

describe('coords', () => {
  it('maps a point to a cell index', () => {
    expect(pointToCell({ x: 0, y: 0 }, { cellWidth: 100, cellHeight: 40 })).toEqual({ row: 0, col: 0 })
    expect(pointToCell({ x: 199, y: 79 }, { cellWidth: 100, cellHeight: 40 })).toEqual({ row: 1, col: 1 })
  })
})
