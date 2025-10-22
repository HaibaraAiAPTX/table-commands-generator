import { Cell, WorksheetData } from './DataStructure'

export class TableState {
  /** 表格数据（稀疏数据） */
  public data: WorksheetData = new Map()

  /** 虚拟行数边界 */
  public maxRow: number = 0

  /** 虚拟列数边界 */
  public maxCol: number = 0

  constructor(initialRows: number = 0, initialCols: number = 0) {
    this.maxRow = Math.max(0, initialRows - 1)
    this.maxCol = Math.max(0, initialCols - 1)
  }

  /** ----------------- 基础 CRUD 操作 ----------------- */

  /**
   * 获取指定单元格的数据
   * @param row
   * @param col
   * @returns
   */
  public getCell(row: number, col: number): Cell | undefined {
    return this.data.get(row)?.get(col)
  }

  /**
   * 获取当前表格的行数（基于最大索引）
   * @returns
   */
  public getColCount(): number {
    return this.maxCol + 1
  }

  /**
   * 获取当前表格的列数（基于最大索引）
   * @returns
   */
  public getRowCount(): number {
    return this.maxRow + 1
  }

  /**
   * 更新指定单元格的数据（部分更新）
   * @param row
   * @param col
   * @param partialData
   */
  public updateCell(
    row: number,
    col: number,
    partialData: Partial<Cell>,
  ): void {
    if (!this.data.has(row)) {
      this.data.set(row, new Map())
    }

    const rowData = this.data.get(row)!
    const existingCell: Cell = rowData.get(col) || {}

    const newCell: Cell = { ...existingCell, ...partialData } as Cell

    if (this.cellIsEmpty(newCell)) {
      // 如果整行都空了，删除整行以保持稀疏性
      rowData.delete(col)
      if (rowData.size === 0) {
        this.data.delete(row)
      }
    } else {
      rowData.set(col, newCell)
    }

    // 维护边界
    if (this.data.size > 0) {
      this.maxRow = Math.max(this.maxRow, row)
      this.maxCol = Math.max(this.maxCol, col)
    }
  }

  /**
   * 判断单元格是否为空
   * @param cell
   * @returns
   */
  public cellIsEmpty(cell: Cell): boolean {
    return !cell.merge && !cell.isMergedPlaceholder
  }

  /**
   * 获取渲染数据
   */
  public getGridData(): RenderingData {
    return {
      rows: this.maxRow + 1,
      cols: this.maxCol + 1,
      cells: this.data,
    }
  }
}

/** 渲染数据 */
export interface RenderingData {
  /** 行数 */
  rows: number

  /** 列数 */
  cols: number

  /** 单元格数据 */
  cells: WorksheetData
}
