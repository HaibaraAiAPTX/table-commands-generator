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
          // 仅将“主单元格（左上）”暴露给遍历者
          // 稀疏模型下，被覆盖单元格只带 isMergedPlaceholder，无 merge
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

    // 预扫描：收集所有跨越插入位置的主合并单元格（老坐标系）
    const affected: Array<MergeCellInfo & { newRowSpan: number }> = []
    this.forEachMainMergedCell((info) => {
      const end = info.row + info.rowSpan - 1
      if (info.row < r && end >= r) {
        affected.push({ ...info, newRowSpan: info.rowSpan + count })
      }
    })

    // 1) 抽象命令：结构变更
    this.push({ type: 'INSERT_ROW', index: r, count })

    // 2) 属性更新命令：扩展 rowSpan + 新插入行上的占位符
    for (const a of affected) {
      // 设置主单元格新的 rowSpan
      this.push({
        type: 'SET_CELL_ATTR',
        row: a.row,
        col: a.col,
        attr: 'rowSpan',
        value: a.newRowSpan,
      })

      // 在新插入的行内，对该合并区域的列范围打上占位符
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

    // 3) 将本次新增命令应用到核心状态，保持事务内后续操作可见性
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

    // 预扫描：收集所有跨越插入位置的主合并单元格（老坐标系）
    const affected: Array<MergeCellInfo & { newColSpan: number }> = []
    this.forEachMainMergedCell((info) => {
      const end = info.col + info.colSpan - 1
      if (info.col < c && end >= c) {
        affected.push({ ...info, newColSpan: info.colSpan + count })
      }
    })

    // 1) 抽象命令：结构变更
    this.push({ type: 'INSERT_COL', index: c, count })

    // 2) 属性更新命令：扩展 colSpan + 新插入列上的占位符
    for (const a of affected) {
      // 设置主单元格新的 colSpan
      this.push({
        type: 'SET_CELL_ATTR',
        row: a.row,
        col: a.col,
        attr: 'colSpan',
        value: a.newColSpan,
      })

      // 在新插入的列内，对该合并区域的行范围打上占位符
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

    // 3) 将本次新增命令应用到核心状态
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

    // 预扫描合并影响（老坐标系）
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
          newMainRow: number // 删除后坐标系
          col: number
          newRowSpan: number
          colSpan: number
        }

    const adjustments: RowAdjust[] = []

    this.forEachMainMergedCell((info) => {
      const start = info.row
      const end = info.row + info.rowSpan - 1

      // 无交集
      if (end < r || start > deleteEnd) return

      const overlapStart = Math.max(start, r)
      const overlapEnd = Math.min(end, deleteEnd)
      const overlapCount = overlapEnd - overlapStart + 1
      const newRowSpan = info.rowSpan - overlapCount
      if (newRowSpan <= 0) {
        // 全部删光，无需发命令（区域消失）
        return
      }

      if (start >= r && start <= deleteEnd) {
        // 主单元格在删除区内，删除后新的主单元格行号为 r（新坐标系）
        adjustments.push({
          kind: 'moveMainDown',
          newMainRow: r,
          col: info.col,
          newRowSpan,
          colSpan: info.colSpan,
        })
      } else {
        // 主单元格在删除区上方，仅收缩 rowSpan（主单元格行号不变）
        adjustments.push({
          kind: 'shrinkAbove',
          row: info.row,
          col: info.col,
          newRowSpan,
          colSpan: info.colSpan,
        })
      }
    })

    // 1) 抽象命令：结构变更
    this.push({ type: 'DELETE_ROW', index: r, count })

    // 3) 属性更新命令（新坐标系）
    for (const adj of adjustments) {
      if (adj.kind === 'shrinkAbove') {
        this.push({
          type: 'SET_CELL_ATTR',
          row: adj.row,
          col: adj.col,
          attr: 'rowSpan',
          value: adj.newRowSpan,
        })
        // 占位符自然随行删除而移除，无需额外处理
      } else {
        // 新的主单元格 + 重建占位符（稳妥做法，适配层可幂等处理）
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

    // 4) 应用到核心状态
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

    // 预扫描合并影响（老坐标系）
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
          newMainCol: number // 删除后坐标系
          rowSpan: number
          newColSpan: number
        }

    const adjustments: ColAdjust[] = []

    this.forEachMainMergedCell((info) => {
      const start = info.col
      const end = info.col + info.colSpan - 1

      // 无交集
      if (end < c || start > deleteEnd) return

      const overlapStart = Math.max(start, c)
      const overlapEnd = Math.min(end, deleteEnd)
      const overlapCount = overlapEnd - overlapStart + 1
      const newColSpan = info.colSpan - overlapCount
      if (newColSpan <= 0) {
        // 全部删光，无需发命令（区域消失）
        return
      }

      if (start >= c && start <= deleteEnd) {
        // 主单元格在删除区内，删除后新的主单元格列号为 c（新坐标系）
        adjustments.push({
          kind: 'moveMainRight',
          row: info.row,
          newMainCol: c,
          rowSpan: info.rowSpan,
          newColSpan,
        })
      } else {
        // 主单元格在删除区左侧，仅收缩 colSpan（主单元格列号不变）
        adjustments.push({
          kind: 'shrinkLeft',
          row: info.row,
          col: info.col,
          rowSpan: info.rowSpan,
          newColSpan,
        })
      }
    })

    // 1) 抽象命令：结构变更
    this.push({ type: 'DELETE_COL', index: c, count })

    // 3) 属性更新命令（新坐标系）
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
        // 新的主单元格 + 重建占位符
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

    // 4) 应用到核心状态
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
    // 1) 直接展开为属性命令（主单元格 + 占位符），不单独发 MERGE_CELL
    // 这样外层和核心都只基于属性命令落地，保证命令可重放性
    // 计算合并尺寸（优先保留已有 merge 的尺寸，否则使用范围）
    const main = this.core.getCell(startRow, startCol)
    const rowSpan = main?.merge?.rowSpan ?? endRow - startRow + 1
    const colSpan = main?.merge?.colSpan ?? endCol - startCol + 1
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

    // 4) 应用到核心状态
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
    // 读取区域（老坐标系）
    const main = this.core.getCell(row, col)
    const rowSpan = main?.merge?.rowSpan ?? 1
    const colSpan = main?.merge?.colSpan ?? 1
    if (!main?.merge || (rowSpan === 1 && colSpan === 1)) return

    this.callAutoClear()

    const startIdx = this.generatedCommands.length

    // 3) 属性命令：清除主单元格 merge 与占位符标记
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

    // 4) 应用到核心状态
    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }
}
