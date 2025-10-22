/** 单元格数据 */
export interface Cell {
  /** 合并信息：如果单元格是合并区域的左上角 (主单元格) */
  merge?: {
    rowSpan: number // 跨越的行数 (>= 1)
    colSpan: number // 跨越的列数 (>= 1)
  }

  /** 占位符：如果单元格被其他合并单元格覆盖，则此属性为 true */
  isMergedPlaceholder?: boolean
}

/** 工作表数据 */
export type WorksheetData = Map<number, Map<number, Cell>>
