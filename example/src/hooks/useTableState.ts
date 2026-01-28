import { useCallback, useMemo, useRef, useState } from 'react'
import type { TableCommand, RenderingData } from '@aptx/table-commands-generator'
import type { CellContents, EditingCell, Selection } from '../types'
import { createTableCore, type TableCore } from '../table/tableCore'

export interface TableStateApi {
  grid: RenderingData | null
  selection: Selection
  editingCell: EditingCell | null
  cellContents: CellContents
  commandHistory: TableCommand[][]
  createTable(args: { rows: number; cols: number }): void
  setSelection(sel: Selection): void
  startEditing(cell: EditingCell): void
  stopEditing(): void
  setCellText(row: number, col: number, text: string): void
  ops: {
    insertRow(): void
    insertCol(): void
    deleteRow(): void
    deleteCol(): void
    merge(): void
    unmerge(): void
  }
}

const EMPTY_SELECTION: Selection = {
  startRow: 0,
  startCol: 0,
  endRow: 0,
  endCol: 0,
  active: false,
}

export function useTableState(): TableStateApi {
  const coreRef = useRef<TableCore | null>(null)
  const [grid, setGrid] = useState<RenderingData | null>(null)
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [cellContents, setCellContents] = useState<CellContents>(() => new Map())
  const [commandHistory, setCommandHistory] = useState<TableCommand[][]>([])

  const createTable = useCallback((args: { rows: number; cols: number }) => {
    coreRef.current = createTableCore(args)
    setGrid(coreRef.current.getGrid())
    setSelection(EMPTY_SELECTION)
    setEditingCell(null)
    setCellContents(new Map())
    setCommandHistory([])
  }, [])

  const setCellText = useCallback((row: number, col: number, text: string) => {
    setCellContents((prev) => {
      const next = new Map(prev)
      const rowMap = new Map(next.get(row) ?? [])
      rowMap.set(col, text)
      next.set(row, rowMap)
      return next
    })
  }, [])

  const run = useCallback((fn: (core: TableCore) => TableCommand[]) => {
    const core = coreRef.current
    if (!core) return
    const cmds = fn(core)
    setCommandHistory((h) => [...h, cmds])
    setGrid(core.getGrid())
  }, [])

  const ops = useMemo(() => {
    return {
      insertRow: () => run((core) => core.insertRow(selection.startRow, 1)),
      insertCol: () => run((core) => core.insertCol(selection.startCol, 1)),
      deleteRow: () => run((core) => core.deleteRow(selection.startRow, selection.endRow - selection.startRow + 1)),
      deleteCol: () => run((core) => core.deleteCol(selection.startCol, selection.endCol - selection.startCol + 1)),
      merge: () => run((core) => core.merge(selection.startRow, selection.startCol, selection.endRow, selection.endCol)),
      unmerge: () => run((core) => core.unmerge(selection.startRow, selection.startCol)),
    }
  }, [run, selection])

  return {
    grid,
    selection,
    editingCell,
    cellContents,
    commandHistory,
    createTable,
    setSelection,
    startEditing: setEditingCell,
    stopEditing: () => setEditingCell(null),
    setCellText,
    ops,
  }
}
