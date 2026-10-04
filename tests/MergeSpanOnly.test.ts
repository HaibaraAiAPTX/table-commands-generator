import { expect, test } from '@rstest/core'
import { TableState } from '../src'
import type { Cell, WorksheetData } from '../src'
import { createTable, placeholderSetCount } from './helpers'

/** 去掉占位符标记，便于对 merge 与 mergeSpanOnly 的镜像状态做等价比较 */
function stripPlaceholders(data: WorksheetData): WorksheetData {
  const out: WorksheetData = new Map()
  data.forEach((rowData, rowIndex) => {
    const newRowData = new Map<number, Cell>()
    rowData.forEach((cell, colIndex) => {
      const rest: Cell = { ...cell }
      delete rest.isMergedPlaceholder
      // 去掉占位标记后为空 => 视为无状态（mergeSpanOnly 不会创建占位单元格）
      if (Object.keys(rest).length > 0) {
        newRowData.set(colIndex, rest)
      }
    })
    if (newRowData.size > 0) {
      out.set(rowIndex, newRowData)
    }
  })
  return out
}

function expectMirrorEquivalentExceptPlaceholders(
  a: TableState,
  b: TableState,
) {
  const gridA = a.getGridData()
  const gridB = b.getGridData()
  expect(gridA.rows).toBe(gridB.rows)
  expect(gridA.cols).toBe(gridB.cols)
  expect(stripPlaceholders(gridA.cells)).toEqual(stripPlaceholders(gridB.cells))
}

test('mergeSpanOnly emits zero isMergedPlaceholder SET commands', () => {
  const { core, tx } = createTable(5, 5)
  const cmds = tx.mergeSpanOnly(1, 1, 2, 3)
  if (!cmds) throw new Error('mergeSpanOnly should return commands')
  expect(placeholderSetCount(cmds)).toBe(0)
  expect(cmds).toContainEqual({
    type: 'SET_CELL_ATTR',
    row: 1,
    col: 1,
    attr: 'rowSpan',
    value: 2,
  })
  expect(cmds).toContainEqual({
    type: 'SET_CELL_ATTR',
    row: 1,
    col: 1,
    attr: 'colSpan',
    value: 3,
  })
  // 镜像已推进：主单元格合并，非主单元格不留占位标记
  expect(core.getCell(1, 1)).toEqual({ merge: { rowSpan: 2, colSpan: 3 } })
  expect(core.getCell(1, 2)).toBeUndefined()
  expect(core.getCell(2, 1)).toBeUndefined()
  expect(core.getCell(2, 3)).toBeUndefined()
})

test('mergeSpanOnly mirror matches merge() except placeholder flags', () => {
  const a = createTable(5, 5)
  const b = createTable(5, 5)
  a.tx.merge(1, 1, 2, 3)
  b.tx.mergeSpanOnly(1, 1, 2, 3)
  expectMirrorEquivalentExceptPlaceholders(a.core, b.core)
  expect(b.core.getCell(1, 1)).toEqual({ merge: { rowSpan: 2, colSpan: 3 } })
})

test('mergeSpanOnly keeps the pre-clear segment for pre-existing merges', () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2)
  const cmds = tx.mergeSpanOnly(1, 1, 3, 3)
  if (!cmds) throw new Error('mergeSpanOnly should return commands')
  // 保留预清理段：旧合并主单元格 span 清除 + 足迹占位标记清除
  expect(cmds).toContainEqual({
    type: 'CLEAR_CELL_ATTR',
    row: 1,
    col: 1,
    attr: 'rowSpan',
  })
  expect(cmds).toContainEqual({
    type: 'CLEAR_CELL_ATTR',
    row: 1,
    col: 1,
    attr: 'colSpan',
  })
  expect(cmds).toContainEqual({
    type: 'CLEAR_CELL_ATTR',
    row: 1,
    col: 2,
    attr: 'isMergedPlaceholder',
  })
  expect(cmds).toContainEqual({
    type: 'CLEAR_CELL_ATTR',
    row: 2,
    col: 1,
    attr: 'isMergedPlaceholder',
  })
  expect(cmds).toContainEqual({
    type: 'CLEAR_CELL_ATTR',
    row: 2,
    col: 2,
    attr: 'isMergedPlaceholder',
  })
  expect(placeholderSetCount(cmds)).toBe(0)
  // 最终镜像：新合并生效，无占位标记残留
  expect(core.getCell(1, 1)).toEqual({ merge: { rowSpan: 3, colSpan: 3 } })
  expect(core.getCell(1, 2)).toBeUndefined()
  expect(core.getCell(3, 3)).toBeUndefined()
})

test('degenerate 1x1 rectangle behaves like merge() modulo placeholders', () => {
  const a = createTable(5, 5)
  const b = createTable(5, 5)
  const cmdsA = a.tx.merge(2, 2, 2, 2)
  const cmdsB = b.tx.mergeSpanOnly(2, 2, 2, 2)
  expectMirrorEquivalentExceptPlaceholders(a.core, b.core)
  // 该矩形下 merge() 本就没有占位 SET，两条命令序列一致
  expect(cmdsB).toEqual(cmdsA)
  expect(b.core.getCell(2, 2)).toBeUndefined()
})

test('out-of-bounds rectangle emits identical commands modulo placeholders', () => {
  const a = createTable(5, 5)
  const b = createTable(5, 5)
  const cmdsA = a.tx.merge(4, 4, 9, 9)
  const cmdsB = b.tx.mergeSpanOnly(4, 4, 9, 9)
  if (!cmdsA || !cmdsB) throw new Error('both should return commands')
  // 命令序列一致：merge() 版本去掉占位 SET 后应与 mergeSpanOnly 完全相同
  const nonPlaceholderA = cmdsA.filter(
    (c) => !(c.type === 'SET_CELL_ATTR' && c.attr === 'isMergedPlaceholder'),
  )
  expect(cmdsB).toEqual(nonPlaceholderA)
  // 主单元格合并状态一致（merge() 的占位段会把边界撑大，属占位段自身副作用）
  expect(b.core.getCell(4, 4)).toEqual(a.core.getCell(4, 4))
})

test('inverted rectangle behaves like merge() modulo placeholders', () => {
  const a = createTable(5, 5)
  const b = createTable(5, 5)
  const cmdsA = a.tx.merge(3, 2, 0, 0)
  const cmdsB = b.tx.mergeSpanOnly(3, 2, 0, 0)
  expectMirrorEquivalentExceptPlaceholders(a.core, b.core)
  expect(cmdsB).toEqual(cmdsA)
  expect(b.core.getCell(3, 2)).toBeUndefined()
})
