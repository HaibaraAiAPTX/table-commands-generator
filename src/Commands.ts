// 1. 结构变更命令
export type StructuralCommand =
  | { type: 'INSERT_ROW'; index: number; count: number }
  | { type: 'DELETE_ROW'; index: number; count: number }
  | { type: 'INSERT_COL'; index: number; count: number }
  | { type: 'DELETE_COL'; index: number; count: number }

// 2. 单元格属性变更命令
export type CellCommand =
  | {
      type: 'SET_CELL_ATTR'
      row: number
      col: number
      attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder'
      value: number | boolean | undefined
    }
  | {
      type: 'CLEAR_CELL_ATTR'
      row: number
      col: number
      attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder'
    }

export type TableCommand = StructuralCommand | CellCommand
