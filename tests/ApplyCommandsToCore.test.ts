import { expect, test } from '@rstest/core'
import { TableCommand, TableCommandPlanner, TableState } from '../src'

function createTable(row: number, col: number) {
  const core = new TableState(row, col)
  const tx = new TableCommandPlanner(core)

  return { core, tx }
}

/** 手工构建一个 2x2 合并批次（主单元格 (1,1)），模拟外部（绕过 planner）生成的命令 */
function handBuiltMerge2x2(): TableCommand[] {
  return [
    { type: 'SET_CELL_ATTR', row: 1, col: 1, attr: 'rowSpan', value: 2 },
    { type: 'SET_CELL_ATTR', row: 1, col: 1, attr: 'colSpan', value: 2 },
    {
      type: 'SET_CELL_ATTR',
      row: 1,
      col: 2,
      attr: 'isMergedPlaceholder',
      value: true,
    },
    {
      type: 'SET_CELL_ATTR',
      row: 2,
      col: 1,
      attr: 'isMergedPlaceholder',
      value: true,
    },
    {
      type: 'SET_CELL_ATTR',
      row: 2,
      col: 2,
      attr: 'isMergedPlaceholder',
      value: true,
    },
  ]
}

test('applyCommandsToCore keeps decisions fresh: forEachMainMergedCell reflects the fed batch', () => {
  const { core, tx } = createTable(5, 5)

  tx.applyCommandsToCore(handBuiltMerge2x2())

  const merges: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
  }> = []
  tx.forEachMainMergedCell((info) => merges.push(info))
  expect(merges).toEqual([{ row: 1, col: 1, rowSpan: 2, colSpan: 2 }])
  expect(core.getCell(1, 1)).toEqual({ merge: { rowSpan: 2, colSpan: 2 } })
  expect(core.getCell(1, 2)).toEqual({ isMergedPlaceholder: true })
})

test('applyCommandsToCore does not append to the generated-command buffer', () => {
  const { tx } = createTable(5, 5)

  tx.applyCommandsToCore(handBuiltMerge2x2())

  expect(tx.getCommands()).toEqual([])
  expect(tx.getNewCommandsAndReset()).toEqual([])
  expect(tx.getCommands()).toEqual([])
})

test('unmerge after applyCommandsToCore generates adjustment commands for the fed merge', () => {
  const { core, tx } = createTable(5, 5)

  tx.applyCommandsToCore(handBuiltMerge2x2())

  const cmds = tx.unmerge(1, 1)
  expect(cmds).toEqual([
    { type: 'CLEAR_CELL_ATTR', row: 1, col: 1, attr: 'rowSpan' },
    { type: 'CLEAR_CELL_ATTR', row: 1, col: 1, attr: 'colSpan' },
    { type: 'CLEAR_CELL_ATTR', row: 1, col: 2, attr: 'isMergedPlaceholder' },
    { type: 'CLEAR_CELL_ATTR', row: 2, col: 1, attr: 'isMergedPlaceholder' },
    { type: 'CLEAR_CELL_ATTR', row: 2, col: 2, attr: 'isMergedPlaceholder' },
  ])
  expect(core.getCell(1, 1)).toBeUndefined()
  // 缓冲区只包含 unmerge 生成的命令，不含外部喂入的批次
  expect(tx.getCommands()).toEqual(cmds)
})

test('insertRow after applyCommandsToCore expands the fed merge', () => {
  const { core, tx } = createTable(5, 5)

  tx.applyCommandsToCore(handBuiltMerge2x2())

  const cmds = tx.insertRow(2)
  expect(cmds?.[0]).toEqual({ type: 'INSERT_ROW', index: 2, count: 1 })
  expect(cmds).toContainEqual({
    type: 'SET_CELL_ATTR',
    row: 1,
    col: 1,
    attr: 'rowSpan',
    value: 3,
  })
  expect(core.getCell(1, 1)?.merge).toEqual({ rowSpan: 3, colSpan: 2 })
  expect(core.getCell(2, 1)?.isMergedPlaceholder).toBe(true)
  expect(core.getCell(2, 2)?.isMergedPlaceholder).toBe(true)
})

test('deleteRow after applyCommandsToCore shrinks the fed merge', () => {
  const { core, tx } = createTable(5, 5)

  tx.applyCommandsToCore(handBuiltMerge2x2())

  const cmds = tx.deleteRow(2)
  // merge 覆盖行 1..2，删除行 2 → 剩余 rowSpan 为 1（保留 1x2 横向合并）
  expect(cmds).toContainEqual({
    type: 'SET_CELL_ATTR',
    row: 1,
    col: 1,
    attr: 'rowSpan',
    value: 1,
  })
  const merges: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
  }> = []
  tx.forEachMainMergedCell((info) => merges.push(info))
  expect(merges).toEqual([{ row: 1, col: 1, rowSpan: 1, colSpan: 2 }])
  expect(core.getCell(1, 1)).toEqual({ merge: { rowSpan: 1, colSpan: 2 } })
})

test('applyCommandsToCore with an empty batch is a no-op', () => {
  const { core, tx } = createTable(5, 5)
  const before = core.getGridData()

  tx.applyCommandsToCore([])

  expect(core.getGridData()).toEqual(before)
  expect(tx.getCommands()).toEqual([])
})

test('applyCommandsToCore with externally fed INSERT_ROW shifts the mirror', () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2) // 主单元格 (1,1)
  // 消费方取走 planner 生成的批次后再在外部追加结构命令
  tx.getNewCommandsAndReset()

  tx.applyCommandsToCore([{ type: 'INSERT_ROW', index: 0, count: 1 }])

  expect(core.getRowCount()).toBe(6)
  const merges: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
  }> = []
  tx.forEachMainMergedCell((info) => merges.push(info))
  expect(merges).toEqual([{ row: 2, col: 1, rowSpan: 2, colSpan: 2 }])
  expect(tx.getCommands()).toEqual([])

  // 后续决策基于平移后的镜像：在平移后的 merge 上插入行生成正确的调整命令
  const cmds = tx.insertRow(3)
  expect(cmds?.[0]).toEqual({ type: 'INSERT_ROW', index: 3, count: 1 })
  expect(cmds).toContainEqual({
    type: 'SET_CELL_ATTR',
    row: 2,
    col: 1,
    attr: 'rowSpan',
    value: 3,
  })
})

test('applyCommandsToCore with externally fed DELETE_ROW shifts the mirror', () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2)
  tx.getNewCommandsAndReset()

  tx.applyCommandsToCore([{ type: 'DELETE_ROW', index: 0, count: 1 }])

  expect(core.getRowCount()).toBe(4)
  const merges: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
  }> = []
  tx.forEachMainMergedCell((info) => merges.push(info))
  expect(merges).toEqual([{ row: 0, col: 1, rowSpan: 2, colSpan: 2 }])
  expect(tx.getCommands()).toEqual([])

  // 后续决策基于平移后的镜像：unmerge 命中的是平移后的主单元格
  const cmds = tx.unmerge(0, 1)
  expect(cmds).toHaveLength(5)
  expect(cmds).toContainEqual({
    type: 'CLEAR_CELL_ATTR',
    row: 0,
    col: 1,
    attr: 'rowSpan',
  })
  expect(core.getCell(0, 1)).toBeUndefined()
})
