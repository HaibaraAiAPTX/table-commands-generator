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

  /** --------------- 外部命令通道 --------------- */

  /**
   * 将外部构建的命令批次应用到内部镜像状态（core），使后续的规划决策
   * （forEachMainMergedCell / unmerge / insertRow / deleteRow 等）基于
   * 已包含外部命令的最新状态进行，避免外部绕过 planner 生成的批次
   * 造成镜像与实际状态不同步。
   *
   * 命令通过与内部自动推进（每次生成批次后调用 interpreter.applyCommands）
   * 相同的解释器应用，语义完全一致。
   *
   * 注意：
   * - 仅推进镜像状态，不会把 `cmds` 追加到生成命令缓冲区
   *   （getCommands / getNewCommandsAndReset 的输出不受影响）
   * - 空批次为无操作
   *
   * @param cmds 外部构建的命令批次
   */
  public applyCommandsToCore(cmds: TableCommand[]): void {
    this.interpreter.applyCommands(cmds)
  }

  /** --------------- 基础工具 --------------- */

  private push(cmd: TableCommand) {
    this.generatedCommands.push(cmd)
  }

  /**
   * 单个合并清除段：清除主单元格 span + 足迹占位标记
   */
  private pushClearMerge(
    row: number,
    col: number,
    rowSpan: number,
    colSpan: number,
  ): void {
    this.push({
      type: 'CLEAR_CELL_ATTR',
      row,
      col,
      attr: 'rowSpan',
    })
    this.push({
      type: 'CLEAR_CELL_ATTR',
      row,
      col,
      attr: 'colSpan',
    })
    for (let rr = row; rr < row + rowSpan; rr++) {
      for (let cc = col; cc < col + colSpan; cc++) {
        if (rr === row && cc === col) continue
        this.push({
          type: 'CLEAR_CELL_ATTR',
          row: rr,
          col: cc,
          attr: 'isMergedPlaceholder',
        })
      }
    }
  }

  /**
   * 预清理段：清除目标矩形内所有已有合并
   * （主单元格 span 清除 + 足迹占位标记清除）
   */
  private pushPreclearForRectangle(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): void {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = this.core.getCell(r, c)
        if (cell?.merge) {
          this.pushClearMerge(r, c, cell.merge.rowSpan, cell.merge.colSpan)
        }
      }
    }
  }

  /**
   * 主单元格 span 设置段
   */
  private pushSpanSet(
    row: number,
    col: number,
    rowSpan: number,
    colSpan: number,
  ): void {
    this.push({
      type: 'SET_CELL_ATTR',
      row,
      col,
      attr: 'rowSpan',
      value: rowSpan,
    })
    this.push({
      type: 'SET_CELL_ATTR',
      row,
      col,
      attr: 'colSpan',
      value: colSpan,
    })
  }

  /**
   * 收尾段：截取自 startIdx 起新生成的命令，推进内部镜像并返回；
   * 无命令时返回 undefined
   */
  private flushNewCommands(startIdx: number): TableCommand[] | undefined {
    const newly = this.generatedCommands.slice(startIdx)
    if (newly.length) {
      this.interpreter.applyCommands(newly)
      return newly
    }
  }

  /**
   * 合并段：预清理 + 主单元格 span 设置 +（可选）占位标记段
   */
  private pushMergeSegments(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    includePlaceholderMarks: boolean,
  ): void {
    this.pushPreclearForRectangle(startRow, startCol, endRow, endCol)

    const rowSpan = endRow - startRow + 1
    const colSpan = endCol - startCol + 1
    this.pushSpanSet(startRow, startCol, rowSpan, colSpan)

    if (!includePlaceholderMarks) return

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
  }

  /** 简单遍历：基于边界全表扫描（稀疏存储下依然安全，只是 O(R*C)） */
  public forEachMainMergedCell(visitor: (info: MergeCellInfo) => void) {
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

    return this.flushNewCommands(startIdx)
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

    return this.flushNewCommands(startIdx)
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

    return this.flushNewCommands(startIdx)
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

    return this.flushNewCommands(startIdx)
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

    this.pushMergeSegments(startRow, startCol, endRow, endCol, true)

    return this.flushNewCommands(startIdx)
  }

  /**
   * 仅跨距合并：与 merge() 语义一致，但省略 isMergedPlaceholder 占位标记段
   * （无语义偏差，仅不产生占位标记 SET 命令）。
   * 同样会自动推进内部镜像，并返回新生成的命令（无命令时返回 undefined）。
   * @param startRow
   * @param startCol
   * @param endRow
   * @param endCol
   */
  public mergeSpanOnly(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
  ): TableCommand[] | undefined {
    this.callAutoClear()
    const startIdx = this.generatedCommands.length

    this.pushMergeSegments(startRow, startCol, endRow, endCol, false)

    return this.flushNewCommands(startIdx)
  }

  /**
   * 全表跨距重排：以单个批次将整表合并状态重排为 map 所描述的状态。
   *
   * - map 中每个条目都被设置（主单元格 rowSpan/colSpan；1x1 条目等价于
   *   取消该处合并）
   * - 所有未与 map 条目完全一致的已有合并被清除（含足迹占位标记清理）
   * - 不产生任何 isMergedPlaceholder SET 命令
   *
   * 校验先行：存在重叠条目、跨距 < 1 或越界单元格时，在任何命令生成前抛出，
   * 内部镜像保持不变。成功时自动推进内部镜像并返回新生成的命令
   * （无命令时返回 undefined）。
   *
   * @param map 主单元格跨距映射
   */
  public applySpanMap(map: MergeCellInfo[]): TableCommand[] | undefined {
    const rowCount = this.core.getRowCount()
    const colCount = this.core.getColCount()
    for (const entry of map) {
      if (entry.rowSpan < 1 || entry.colSpan < 1) {
        throw new Error(
          `applySpanMap: spans must be >= 1 (got rowSpan=${entry.rowSpan}, colSpan=${entry.colSpan})`,
        )
      }
      if (entry.row < 0 || entry.col < 0) {
        throw new Error(
          `applySpanMap: cell indices must be >= 0 (got row=${entry.row}, col=${entry.col})`,
        )
      }
      if (
        entry.row + entry.rowSpan > rowCount ||
        entry.col + entry.colSpan > colCount
      ) {
        throw new Error(
          `applySpanMap: entry (${entry.row}, ${entry.col}) exceeds table bounds (${rowCount}x${colCount})`,
        )
      }
    }
    for (let i = 0; i < map.length; i++) {
      for (let j = i + 1; j < map.length; j++) {
        const a = map[i]
        const b = map[j]
        if (!a || !b) continue
        if (
          a.row < b.row + b.rowSpan &&
          b.row < a.row + a.rowSpan &&
          a.col < b.col + b.colSpan &&
          b.col < a.col + a.colSpan
        ) {
          throw new Error(
            `applySpanMap: entries (${a.row}, ${a.col}) and (${b.row}, ${b.col}) overlap`,
          )
        }
      }
    }

    this.callAutoClear()
    const startIdx = this.generatedCommands.length

    // 快照现有合并：与 map 条目完全一致的跳过，其余清除（含足迹占位标记）
    const mapSpans = new Map(map.map((m) => [`${m.row}:${m.col}`, m] as const))
    const existing: MergeCellInfo[] = []
    this.forEachMainMergedCell((info) => existing.push(info))
    for (const old of existing) {
      const target = mapSpans.get(`${old.row}:${old.col}`)
      if (
        target &&
        target.rowSpan === old.rowSpan &&
        target.colSpan === old.colSpan
      ) {
        continue
      }
      this.pushClearMerge(old.row, old.col, old.rowSpan, old.colSpan)
    }

    for (const entry of map) {
      this.pushSpanSet(entry.row, entry.col, entry.rowSpan, entry.colSpan)
    }

    return this.flushNewCommands(startIdx)
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

    return this.flushNewCommands(startIdx)
  }
}
