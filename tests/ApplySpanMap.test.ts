import { expect, test } from '@rstest/core'
import { TableCommandPlanner, TableState } from '../src'
import type { TableCommand } from '../src'

function createTable(row: number, col: number) {
  const core = new TableState(row, col)
  const tx = new TableCommandPlanner(core)

  return { core, tx }
}

/** 独立于存活 Map 的纯快照，用于断言镜像未被改动 */
function snapshotGrid(core: TableState) {
  const out: Record<string, Record<string, unknown>> = {}
  core.getGridData().cells.forEach((rowData, r) => {
    rowData.forEach((cell, c) => {
      out[`${r},${c}`] = { ...cell }
    })
  })
  return out
}

function placeholderSetCount(cmds: TableCommand[]): number {
  return cmds.filter(
    (c) =>
      c.type === 'SET_CELL_ATTR' &&
      c.attr === 'isMergedPlaceholder' &&
      c.value === true,
  ).length
}

test('applySpanMap re-lays all spans in one batch without placeholder SETs', () => {
  const { core, tx } = createTable(6, 6)
  tx.merge(1, 1, 2, 2)
  tx.merge(4, 4, 5, 5)
  const cmds = tx.applySpanMap([{ row: 1, col: 1, rowSpan: 3, colSpan: 3 }])
  if (!cmds) throw new Error('applySpanMap should return commands')
  expect(placeholderSetCount(cmds)).toBe(0)
  // 最终状态与 map 完全一致
  expect(core.getCell(1, 1)).toEqual({ merge: { rowSpan: 3, colSpan: 3 } })
  // 不在 map 中的旧合并被清除
  expect(core.getCell(4, 4)).toBeUndefined()
  expect(core.getCell(5, 5)).toBeUndefined()
  // 除 map 主单元格外无占位标记/残留
  expect(core.getCell(1, 2)).toBeUndefined()
  expect(core.getCell(2, 2)).toBeUndefined()
  // 决策新鲜：forEachMainMergedCell 恰好报告 map 条目
  const seen: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
  }> = []
  tx.forEachMainMergedCell((info) => seen.push(info))
  expect(seen).toEqual([{ row: 1, col: 1, rowSpan: 3, colSpan: 3 }])
})

test('1x1 map entry clears an existing merge at that cell', () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2)
  const cmds = tx.applySpanMap([{ row: 1, col: 1, rowSpan: 1, colSpan: 1 }])
  if (!cmds) throw new Error('applySpanMap should return commands')
  expect(placeholderSetCount(cmds)).toBe(0)
  expect(core.getCell(1, 1)).toBeUndefined()
  // 旧合并足迹的占位标记随清除段一并清理
  expect(core.getCell(1, 2)).toBeUndefined()
  expect(core.getCell(2, 1)).toBeUndefined()
  expect(core.getCell(2, 2)).toBeUndefined()
})

test('empty map clears all merges and returns commands; pristine table returns undefined', () => {
  const a = createTable(5, 5)
  a.tx.merge(1, 1, 2, 2)
  const cmds = a.tx.applySpanMap([])
  if (!cmds) throw new Error('applySpanMap should return commands')
  expect(placeholderSetCount(cmds)).toBe(0)
  expect(a.core.getGridData().cells.size).toBe(0)

  const b = createTable(5, 5)
  expect(b.tx.applySpanMap([])).toBeUndefined()
})

test('overlapping entries throw and leave the mirror untouched', () => {
  const { core, tx } = createTable(6, 6)
  tx.merge(1, 1, 2, 2)
  const before = snapshotGrid(core)
  const beforeCommands = tx.getCommands().length
  expect(() =>
    tx.applySpanMap([
      { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      { row: 1, col: 1, rowSpan: 2, colSpan: 2 },
    ]),
  ).toThrow()
  expect(snapshotGrid(core)).toEqual(before)
  expect(tx.getCommands()).toHaveLength(beforeCommands)
})

test('spans < 1 throw and leave the mirror untouched', () => {
  const { core, tx } = createTable(5, 5)
  const before = snapshotGrid(core)
  expect(() =>
    tx.applySpanMap([{ row: 1, col: 1, rowSpan: 0, colSpan: 2 }]),
  ).toThrow()
  expect(() =>
    tx.applySpanMap([{ row: 1, col: 1, rowSpan: 2, colSpan: -1 }]),
  ).toThrow()
  expect(snapshotGrid(core)).toEqual(before)
})

test('out-of-bounds cells throw and leave the mirror untouched', () => {
  const { core, tx } = createTable(5, 5)
  const before = snapshotGrid(core)
  expect(() =>
    tx.applySpanMap([{ row: 4, col: 4, rowSpan: 2, colSpan: 1 }]),
  ).toThrow()
  expect(() =>
    tx.applySpanMap([{ row: -1, col: 0, rowSpan: 1, colSpan: 1 }]),
  ).toThrow()
  expect(snapshotGrid(core)).toEqual(before)
})
