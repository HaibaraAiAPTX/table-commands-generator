import { BuildinStateInterpreter } from './BuildinStateInterpreter'
import { TableCommand } from './Commands'
import { TableState } from './TableState'

type MergeCellInfo = {
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

/**
 * 事务层：将核心模型的操作抽象为一系列可移植的命令
 */
export class TableCommandPlanner {
  private core: TableState

  private generatedCommands: TableCommand[] = []

  private interpreter: BuildinStateInterpreter

  /** 是否在每次操作前自动清空命令列表，避免命令累积带来的干扰；默认开启 */
  private autoClear: boolean

  constructor(coreInstance: TableState, options?: { autoClear?: boolean }) {
    this.core = coreInstance
    this.autoClear = options?.autoClear ?? true
    this.interpreter = new BuildinStateInterpreter(coreInstance)
  }

  private callAutoClear(): void {
    if (this.autoClear) {
      this.generatedCommands = []
    }
  }

  /**
   * 获取已生成的命令列表
   * @returns
   */
  public getCommands(): TableCommand[] {
    return this.generatedCommands
  }

  /**
   * 获取已生成的命令列表，并重置命令缓存
   * @returns
   */
  public getNewCommandsAndReset(): TableCommand[] {
    const cmds = this.generatedCommands
    this.generatedCommands = []
    return cmds
  }

  /** --------------- 基础工具 --------------- */

  private push(cmd: TableCommand) {
    this.generatedCommands.push(cmd)
  }

  /** 简单遍历：基于边界全表扫描（稀疏存储下依然安全，只是 O(R*C)） */
  private forEachMainMergedCell(visitor: (info: MergeCellInfo) => void) {
    const rows = this.core.getRowCount()
    const cols = this.core.getColCount()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = this.core.getCell(r, c)
        if (cell?.merge) {
          visitor({
            row: r,
            col: c,
            rowSpan: cell.merge.rowSpan,
            colSpan: cell.merge.colSpan,
          })
        }
      }
    }
  }

  /** --------------- 行列插入 --------------- */

  /**
   * 插入行
   * @param r
   * @param count
   * @returns
   */
  public insertRow(r: number, count = 1): TableCommand[] | undefined {
    if (count <= 0 || r < 0) return
    this.callAutoClear()
    const startIdx = this.generatedCommands.length

    const affected: Array<MergeCellInfo & { newRowSpan: number }> = []
    this.forEachMainMergedCell((info) => {
      const end = info.row + info.rowSpan - 1
      if (info.row < r && end >= r) {
        affected.push({ ...info, newRowSpan: info.rowSpan + count })
      }
    })

    this.push({ type: 'INSERT_ROW', index: r, count })

    for (const a of affected) {
      this.push({
        type: 'SET_CELL_ATTR',
        row: a.row,
        col: a.col,
        attr: 'rowSpan',
        value: a.newRowSpan,
      })

      for (let insertedRow = r; insertedRow < r + count; insertedRow++) {
        for (let cc = a.col; cc < a.col + a.colSpan; cc++) {
          this.push({
            type: 'SET_CELL_ATTR',
            row: insertedRow,
            col: cc,
            attr: 'isMergedPlaceholder',
            value: true,
          })
        }
      }
    }

    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }

  /**
   * 插入列
   * @param c
   * @param count
   * @returns
   */
  public insertCol(c: number, count = 1): TableCommand[] | undefined {
    if (count <= 0 || c < 0) return
    this.callAutoClear()
    const startIdx = this.generatedCommands.length

    const affected: Array<MergeCellInfo & { newColSpan: number }> = []
    this.forEachMainMergedCell((info) => {
      const end = info.col + info.colSpan - 1
      if (info.col < c && end >= c) {
        affected.push({ ...info, newColSpan: info.colSpan + count })
      }
    })

    this.push({ type: 'INSERT_COL', index: c, count })

    for (const a of affected) {
      this.push({
        type: 'SET_CELL_ATTR',
        row: a.row,
        col: a.col,
        attr: 'colSpan',
        value: a.newColSpan,
      })

      for (let rr = a.row; rr < a.row + a.rowSpan; rr++) {
        for (let insertedCol = c; insertedCol < c + count; insertedCol++) {
          this.push({
            type: 'SET_CELL_ATTR',
            row: rr,
            col: insertedCol,
            attr: 'isMergedPlaceholder',
            value: true,
          })
        }
      }
    }

    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }

  /** --------------- 行列删除 --------------- */

  /**
   * 删除行
   * @param r
   * @param count
   * @returns
   */
  public deleteRow(r: number, count = 1): TableCommand[] | undefined {
    if (count <= 0) return
    this.callAutoClear()
    const startIdx = this.generatedCommands.length
    const deleteEnd = r + count - 1

    type RowAdjust =
      | {
          kind: 'shrinkAbove'
          row: number
          col: number
          newRowSpan: number
          colSpan: number
        }
      | {
          kind: 'moveMainDown'
          newMainRow: number
          col: number
          newRowSpan: number
          colSpan: number
        }

    const adjustments: RowAdjust[] = []

    this.forEachMainMergedCell((info) => {
      const start = info.row
      const end = info.row + info.rowSpan - 1

      if (end < r || start > deleteEnd) return

      const overlapStart = Math.max(start, r)
      const overlapEnd = Math.min(end, deleteEnd)
      const overlapCount = overlapEnd - overlapStart + 1
      const newRowSpan = info.rowSpan - overlapCount
      if (newRowSpan <= 0) {
        return
      }

      if (start >= r && start <= deleteEnd) {
        adjustments.push({
          kind: 'moveMainDown',
          newMainRow: r,
          col: info.col,
          newRowSpan,
          colSpan: info.colSpan,
        })
      } else {
        adjustments.push({
          kind: 'shrinkAbove',
          row: info.row,
          col: info.col,
          newRowSpan,
          colSpan: info.colSpan,
        })
      }
    })

    this.push({ type: 'DELETE_ROW', index: r, count })

    for (const adj of adjustments) {
      if (adj.kind === 'shrinkAbove') {
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.row,
          col: adj.col,
          attr: 'rowSpan',
          value: adj.newRowSpan,
        })
      } else {
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.newMainRow,
          col: adj.col,
          attr: 'rowSpan',
          value: adj.newRowSpan,
        })
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.newMainRow,
          col: adj.col,
          attr: 'colSpan',
          value: adj.colSpan,
        })
        for (
          let rr = adj.newMainRow;
          rr < adj.newMainRow + adj.newRowSpan;
          rr++
        ) {
          for (let cc = adj.col; cc < adj.col + adj.colSpan; cc++) {
            if (rr === adj.newMainRow && cc === adj.col) continue
            this.push({
              type: 'SET_CELL_ATTR',
              row: rr,
              col: cc,
              attr: 'isMergedPlaceholder',
              value: true,
            })
          }
        }
      }
    }

    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }

  /**
   * 删除列
   * @param c
   * @param count
   * @returns
   */
  public deleteCol(c: number, count = 1): TableCommand[] | undefined {
    if (count <= 0) return
    this.callAutoClear()
    const startIdx = this.generatedCommands.length
    const deleteEnd = c + count - 1

    type ColAdjust =
      | {
          kind: 'shrinkLeft'
          row: number
          col: number
          rowSpan: number
          newColSpan: number
        }
      | {
          kind: 'moveMainRight'
          row: number
          newMainCol: number
          rowSpan: number
          newColSpan: number
        }

    const adjustments: ColAdjust[] = []

    this.forEachMainMergedCell((info) => {
      const start = info.col
      const end = info.col + info.colSpan - 1

      if (end < c || start > deleteEnd) return

      const overlapStart = Math.max(start, c)
      const overlapEnd = Math.min(end, deleteEnd)
      const overlapCount = overlapEnd - overlapStart + 1
      const newColSpan = info.colSpan - overlapCount
      if (newColSpan <= 0) {
        return
      }

      if (start >= c && start <= deleteEnd) {
        adjustments.push({
          kind: 'moveMainRight',
          row: info.row,
          newMainCol: c,
          rowSpan: info.rowSpan,
          newColSpan,
        })
      } else {
        adjustments.push({
          kind: 'shrinkLeft',
          row: info.row,
          col: info.col,
          rowSpan: info.rowSpan,
          newColSpan,
        })
      }
    })

    this.push({ type: 'DELETE_COL', index: c, count })

    for (const adj of adjustments) {
      if (adj.kind === 'shrinkLeft') {
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.row,
          col: adj.col,
          attr: 'colSpan',
          value: adj.newColSpan,
        })
      } else {
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.row,
          col: adj.newMainCol,
          attr: 'rowSpan',
          value: adj.rowSpan,
        })
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.row,
          col: adj.newMainCol,
          attr: 'colSpan',
          value: adj.newColSpan,
        })
        for (let rr = adj.row; rr < adj.row + adj.rowSpan; rr++) {
          for (
            let cc = adj.newMainCol;
            cc < adj.newMainCol + adj.newColSpan;
            cc++
          ) {
            if (rr === adj.row && cc === adj.newMainCol) continue
            this.push({
              type: 'SET_CELL_ATTR',
              row: rr,
              col: cc,
              attr: 'isMergedPlaceholder',
              value: true,
            })
          }
        }
      }
    }

    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }

  /** --------------- 合并/拆分 --------------- */

  /**
   * 合并单元格
   * @param startRow
   * @param startCol
   * @param endRow
   * @param endCol
   */
  public merge(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): TableCommand[] | undefined {
    this.callAutoClear()
    const startIdx = this.generatedCommands.length

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = this.core.getCell(r, c)
        if (cell?.merge) {
          const rowSpan = cell.merge.rowSpan
          const colSpan = cell.merge.colSpan
          this.push({
            type: 'CLEAR_CELL_ATTR',
            row: r,
            col: c,
            attr: 'rowSpan',
          })
          this.push({
            type: 'CLEAR_CELL_ATTR',
            row: r,
            col: c,
            attr: 'colSpan',
          })
          for (let rr = r; rr < r + rowSpan; rr++) {
            for (let cc = c; cc < c + colSpan; cc++) {
              if (rr === r && cc === c) continue
              this.push({
                type: 'CLEAR_CELL_ATTR',
                row: rr,
                col: cc,
                attr: 'isMergedPlaceholder',
              })
            }
          }
        }
      }
    }

    const rowSpan = endRow - startRow + 1
    const colSpan = endCol - startCol + 1
    this.push({
      type: 'SET_CELL_ATTR',
      row: startRow,
      col: startCol,
      attr: 'rowSpan',
      value: rowSpan,
    })
    this.push({
      type: 'SET_CELL_ATTR',
      row: startRow,
      col: startCol,
      attr: 'colSpan',
      value: colSpan,
    })

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r === startRow && c === startCol) continue
        this.push({
          type: 'SET_CELL_ATTR',
          row: r,
          col: c,
          attr: 'isMergedPlaceholder',
          value: true,
        })
      }
    }

    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }

  /**
   * 拆分单元格
   * @param row
   * @param col
   * @returns
   */
  public unmerge(row: number, col: number): TableCommand[] | undefined {
    const main = this.core.getCell(row, col)
    const rowSpan = main?.merge?.rowSpan ?? 1
    const colSpan = main?.merge?.colSpan ?? 1
    if (!main?.merge || (rowSpan === 1 && colSpan === 1)) return

    this.callAutoClear()

    const startIdx = this.generatedCommands.length

    this.push({ type: 'CLEAR_CELL_ATTR', row, col, attr: 'rowSpan' })
    this.push({ type: 'CLEAR_CELL_ATTR', row, col, attr: 'colSpan' })

    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (r === row && c === col) continue
        this.push({
          type: 'CLEAR_CELL_ATTR',
          row: r,
          col: c,
          attr: 'isMergedPlaceholder',
        })
      }
    }

    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }
}
