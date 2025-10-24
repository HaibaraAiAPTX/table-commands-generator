import { expect, test } from '@rstest/core'
import { TableCommandPlanner, TableState } from '../src'
import { renderHtmlTable } from './utils'

function createTable(row: number, col: number) {
  const core = new TableState(row, col)
  const tx = new TableCommandPlanner(core)

  return { core, tx }
}

test('init', async () => {
  const { core, tx } = createTable(5, 5)
  expect(core).not.toBeNull()
  expect(tx).not.toBeNull()
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/init.html',
  )
})

test('getCommands when no changes made', () => {
  const { tx } = createTable(5, 5)
  const commands = tx.getCommands()
  expect(commands).toEqual([])
})

test('getCommands after insertRow', async () => {
  const { tx } = createTable(5, 5)
  tx.insertRow(2)
  const commands = tx.getCommands()
  expect(commands).toHaveLength(1)
})

test('autoClear false', () => {
  const { core } = createTable(5, 5)
  const tx = new TableCommandPlanner(core, { autoClear: false })
  tx.insertRow(2)
  let commands = tx.getCommands()
  expect(commands).toHaveLength(1)

  tx.insertCol(2)
  commands = tx.getCommands()
  expect(commands).toHaveLength(2)
})

test('insertRow', async () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getRowCount()).toBe(5)
  tx.insertRow(2)
  expect(core.getRowCount()).toBe(6)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow.after1.html',
  )
})

test('insertRow edge cases - zero and negative count', async () => {
  const { core, tx } = createTable(5, 5)
  const originalData = core.getGridData()
  const originalRowCount = core.getRowCount()

  // Insert 0 rows - should not change anything
  tx.insertRow(2, 0)
  expect(core.getGridData()).toEqual(originalData)
  expect(core.getRowCount()).toBe(originalRowCount)

  // Insert negative count - should not change anything
  tx.insertRow(2, -1)
  expect(core.getGridData()).toEqual(originalData)
  expect(core.getRowCount()).toBe(originalRowCount)
})

test('insertRow negative index - single insert', async () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getRowCount()).toBe(5)
  tx.insertRow(-1)
  expect(core.getRowCount()).toBe(5)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow negative index.after1.html',
  )
})

test('insertRow negative index with count > 1', () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getRowCount()).toBe(5)
  tx.insertRow(-2, 2)
  expect(core.getRowCount()).toBe(5)
})

test('insertCol', () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getColCount()).toBe(5)
  tx.insertCol(2)
  expect(core.getColCount()).toBe(6)
})

test('insertCol edge cases - zero and negative count', () => {
  const { core, tx } = createTable(5, 5)
  const originalData = core.getGridData()
  const originalColCount = core.getColCount()

  // Insert 0 cols - should not change anything
  tx.insertCol(2, 0)
  expect(core.getGridData()).toEqual(originalData)
  expect(core.getColCount()).toBe(originalColCount)

  // Insert negative count - should not change anything
  tx.insertCol(2, -1)
  expect(core.getGridData()).toEqual(originalData)
  expect(core.getColCount()).toBe(originalColCount)
})

test('insertCol negative index - single insert', () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getColCount()).toBe(5)
  tx.insertCol(-1)
  expect(core.getColCount()).toBe(5)
})

test('insertCol negative index with count > 1', () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getColCount()).toBe(5)
  tx.insertCol(-2, 2)
  expect(core.getColCount()).toBe(5)
})

test('mergeCells', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/mergeCells.after1.html',
  )

  const oldGrid = core.getGridData()
  tx.merge(3, 2, 0, 0)
  expect(core.getGridData()).toEqual(oldGrid)
})

test('merge multiple already merged cells', async () => {
  const { core, tx } = createTable(6, 6)

  // Create two adjacent merged regions
  tx.merge(1, 1, 2, 2)
  tx.merge(2, 3, 3, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/merge multiple already merged cells.before.html',
  )

  // Merge across both regions to combine them
  tx.merge(1, 1, 3, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/merge multiple already merged cells.after.html',
  )

  // Merging an already merged sub-region should be a no-op
  const oldGrid = core.getGridData()
  tx.merge(1, 2, 1, 3)
  expect(core.getGridData()).toEqual(oldGrid)
})

test('unmergeCells', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/unmergeCells.before.html',
  )
  tx.unmerge(1, 1)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/unmergeCells.after.html',
  )
  const oldGrid = core.getGridData()
  tx.unmerge(0, 0)
  expect(core.getGridData()).toEqual(oldGrid)
})

test('insertRow merged', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 3, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow merged.before.html',
  )

  tx.insertRow(1)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow merged.after1.html',
  )
  tx.insertRow(3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow merged.after2.html',
  )
})

test('insertCol merged', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 3, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertCol merged.before.html',
  )

  tx.insertCol(1)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertCol merged.after1.html',
  )
  tx.insertCol(3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertCol merged.after2.html',
  )
})

test('insertRow across multiple merged cells', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2)
  tx.merge(1, 4, 4, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow across multiple merged cells.before.html',
  )

  tx.insertRow(2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertRow across multiple merged cells.after.html',
  )
})

test('insertCol across multiple merged cells', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 3)
  tx.merge(3, 2, 4, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertCol across multiple merged cells.before.html',
  )

  tx.insertCol(3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/insertCol across multiple merged cells.after.html',
  )
})

test('getCell', async () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getCell(0, 0)).toBeUndefined()
  tx.merge(0, 0, 1, 1)
  expect(core.getCell(0, 0)).toEqual({
    merge: { rowSpan: 2, colSpan: 2 },
  })
  expect(core.getCell(0, 1)).toEqual({ isMergedPlaceholder: true })
  expect(core.getCell(1, 0)).toEqual({ isMergedPlaceholder: true })
  expect(core.getCell(1, 1)).toEqual({ isMergedPlaceholder: true })
})

test('deleteRow basic', async () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getRowCount()).toBe(5)
  tx.deleteRow(2)
  expect(core.getRowCount()).toBe(4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow basic.after1.html',
  )

  tx.deleteRow(0, 2)
  expect(core.getRowCount()).toBe(2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow basic.after2.html',
  )
})

test('deleteRow merged - merge above delete region', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(0, 1, 1, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged above.before.html',
  )

  tx.deleteRow(3, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged above.after.html',
  )
})

test('deleteRow merged - merge below delete region', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(3, 1, 4, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged below.before.html',
  )

  tx.deleteRow(0, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged below.after.html',
  )
})

test('deleteRow merged - merge spans across delete region', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(1, 1, 4, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged spans.before.html',
  )

  tx.deleteRow(2, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged spans.after.html',
  )
})

test('deleteRow merged - main cell in delete region', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(1, 1, 4, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged main in delete.before.html',
  )

  tx.deleteRow(1, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged main in delete.after.html',
  )
})

test('deleteRow merged - completely delete merge region', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(1, 1, 3, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged complete delete.before.html',
  )

  tx.deleteRow(1, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow merged complete delete.after.html',
  )
})

test('deleteRow across multiple merged cells', async () => {
  const { core, tx } = createTable(8, 5)
  tx.merge(0, 1, 2, 2)
  tx.merge(1, 3, 4, 4)
  tx.merge(5, 1, 7, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow multiple merged.before.html',
  )

  tx.deleteRow(2, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow multiple merged.after.html',
  )
})

test('deleteRow edge cases', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2)
  const originalData = core.getGridData()

  // Delete 0 rows - should not change anything
  tx.deleteRow(2, 0)
  expect(core.getGridData()).toEqual(originalData)

  // Delete negative count - should not change anything
  tx.deleteRow(2, -1)
  expect(core.getGridData()).toEqual(originalData)

  // Delete beyond table bounds
  tx.deleteRow(10, 2)
  expect(core.getRowCount()).toBe(5)
})

test('deleteRow partial overlap at start', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(0, 1, 3, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow partial start.before.html',
  )

  tx.deleteRow(0, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow partial start.after.html',
  )
})

test('deleteRow partial overlap at end', async () => {
  const { core, tx } = createTable(6, 5)
  tx.merge(1, 1, 4, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow partial end.before.html',
  )

  tx.deleteRow(3, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteRow partial end.after.html',
  )
})

test('deleteCol basic', async () => {
  const { core, tx } = createTable(5, 5)
  expect(core.getColCount()).toBe(5)
  tx.deleteCol(2)
  expect(core.getColCount()).toBe(4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol basic.after1.html',
  )

  tx.deleteCol(0, 2)
  expect(core.getColCount()).toBe(2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol basic.after2.html',
  )
})

test('deleteCol merged - merge left of delete region', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 0, 3, 1)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged left.before.html',
  )

  tx.deleteCol(3, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged left.after.html',
  )
})

test('deleteCol merged - merge right of delete region', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 3, 3, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged right.before.html',
  )

  tx.deleteCol(0, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged right.after.html',
  )
})

test('deleteCol merged - merge spans across delete region', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 1, 3, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged spans.before.html',
  )

  tx.deleteCol(2, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged spans.after.html',
  )
})

test('deleteCol merged - main cell in delete region', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 1, 3, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged main in delete.before.html',
  )

  tx.deleteCol(1, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged main in delete.after.html',
  )
})

test('deleteCol merged - completely delete merge region', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 1, 3, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged complete delete.before.html',
  )

  tx.deleteCol(1, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol merged complete delete.after.html',
  )
})

test('deleteCol across multiple merged cells', async () => {
  const { core, tx } = createTable(5, 8)
  tx.merge(1, 0, 2, 2)
  tx.merge(3, 1, 4, 4)
  tx.merge(1, 5, 3, 7)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol multiple merged.before.html',
  )

  tx.deleteCol(2, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol multiple merged.after.html',
  )
})

test('deleteCol edge cases', async () => {
  const { core, tx } = createTable(5, 5)
  tx.merge(1, 1, 2, 2)
  const originalData = core.getGridData()

  // Delete 0 cols - should not change anything
  tx.deleteCol(2, 0)
  expect(core.getGridData()).toEqual(originalData)

  // Delete negative count - should not change anything
  tx.deleteCol(2, -1)
  expect(core.getGridData()).toEqual(originalData)

  // Delete beyond table bounds
  tx.deleteCol(10, 2)
  expect(core.getColCount()).toBe(5)
})

test('deleteCol partial overlap at start', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 0, 3, 3)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol partial start.before.html',
  )

  tx.deleteCol(0, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol partial start.after.html',
  )
})

test('deleteCol partial overlap at end', async () => {
  const { core, tx } = createTable(5, 6)
  tx.merge(1, 1, 3, 4)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol partial end.before.html',
  )

  tx.deleteCol(3, 2)
  await expect(renderHtmlTable(core.getGridData())).toMatchFileSnapshot(
    './__snapshots__/TableCoreTransaction/deleteCol partial end.after.html',
  )
})
