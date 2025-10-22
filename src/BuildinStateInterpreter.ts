import { CommandInterpreter } from './CommandInterpreter'
import { Cell, WorksheetData } from './DataStructure'
import { TableState } from './TableState'

/**
 * BuildinStateInterpreter: 把命令直接解释为对 TableState 的原子调用
 */
export class BuildinStateInterpreter extends CommandInterpreter {
  private state: TableState

  constructor(state: TableState) {
    super()
    this.state = state
  }

  protected handleInsertRow(r: number, count: number): void {
    const newGrid: WorksheetData = new Map()

    this.state.data.forEach((rowData, rowIndex) => {
      if (rowIndex < r) {
        newGrid.set(rowIndex, rowData) // 之前的行不变
      } else {
        newGrid.set(rowIndex + count, rowData) // 之后的行，索引增加
      }
    })

    this.state.data = newGrid
    this.state.maxRow += count
  }

  protected handleInsertCol(c: number, count: number): void {
    const newGrid: WorksheetData = new Map()

    this.state.data.forEach((rowData, rowIndex) => {
      const newRowData: Map<number, Cell> = new Map()

      rowData.forEach((cell, colIndex) => {
        if (colIndex < c) {
          newRowData.set(colIndex, cell) // 之前的列不变
        } else {
          newRowData.set(colIndex + count, cell) // 之后的列，索引增加
        }
      })

      newGrid.set(rowIndex, newRowData)
    })

    this.state.data = newGrid
    this.state.maxCol += count
  }

  protected handleDeleteRow(r: number, count: number): void {
    if (count <= 0) return

    // 边界检查
    if (r > this.state.maxRow) return

    const newGrid: WorksheetData = new Map()
    const deleteEndRow = r + count

    // 第二步：重新映射行，跳过被删除的行
    this.state.data.forEach((rowData, rowIndex) => {
      if (rowIndex < r) {
        // 删除区域之前的行，直接复制
        newGrid.set(rowIndex, rowData)
      } else if (rowIndex >= deleteEndRow) {
        // 删除区域之后的行，移动到新的行号
        newGrid.set(rowIndex - count, rowData)
      }
      // 被删除的行 (r <= rowIndex < deleteEndRow) 被忽略
    })

    this.state.data = newGrid
    this.state.maxRow = Math.max(0, this.state.maxRow - count)
  }

  protected handleDeleteCol(c: number, count: number): void {
    if (count <= 0) return

    // 边界检查
    if (c > this.state.maxCol) return

    const newGrid: WorksheetData = new Map()
    const deleteEndCol = c + count

    this.state.data.forEach((rowData, rowIndex) => {
      const newRowData: Map<number, Cell> = new Map()

      rowData.forEach((cell, colIndex) => {
        if (colIndex < c) {
          // 删除区域之前的列，直接复制
          newRowData.set(colIndex, cell)
        } else if (colIndex >= deleteEndCol) {
          // 删除区域之后的列，移动到新的列号
          newRowData.set(colIndex - count, cell)
        }
        // 被删除的列 (c <= colIndex < deleteEndCol) 被忽略
      })

      if (newRowData.size > 0) {
        newGrid.set(rowIndex, newRowData)
      }
    })

    this.state.data = newGrid
    this.state.maxCol = Math.max(0, this.state.maxCol - count)
  }

  protected handleSetCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
    value: number | boolean | undefined,
  ): void {
    const cell = this.state.getCell(row, col)
    if (attr === 'isMergedPlaceholder') {
      this.state.updateCell(row, col, { isMergedPlaceholder: Boolean(value) })
      return
    }
    // 行/列跨距：基于现有 merge 更新
    const prev = cell?.merge
    const rowSpan = attr === 'rowSpan' ? Number(value) : (prev?.rowSpan ?? 1)
    const colSpan = attr === 'colSpan' ? Number(value) : (prev?.colSpan ?? 1)
    if (rowSpan > 1 || colSpan > 1) {
      this.state.updateCell(row, col, {
        merge: { rowSpan, colSpan },
        isMergedPlaceholder: undefined,
      })
    } else {
      // 退化为非合并
      this.state.updateCell(row, col, { merge: undefined })
    }
  }

  protected handleClearCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
  ): void {
    if (attr === 'isMergedPlaceholder') {
      this.state.updateCell(row, col, { isMergedPlaceholder: undefined })
      return
    }
    // 简化：清任一跨距都视为取消合并（与事务层的用法相匹配：unmerge 会清 rowSpan/colSpan）
    this.state.updateCell(row, col, { merge: undefined })
  }
}
