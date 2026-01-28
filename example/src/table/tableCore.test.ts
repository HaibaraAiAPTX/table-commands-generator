import { createTableCore } from './tableCore'

it('applies merge via planner + interpreter and returns commands', () => {
  const core = createTableCore({ rows: 3, cols: 3 })

  const cmds = core.merge(0, 0, 1, 1)
  expect(cmds.length).toBeGreaterThan(0)

  const grid = core.getGrid()
  // merged main cell exists at 0,0
  const cell00 = grid.cells.get(0)?.get(0)
  expect(cell00?.merge).toEqual({ rowSpan: 2, colSpan: 2 })
})
