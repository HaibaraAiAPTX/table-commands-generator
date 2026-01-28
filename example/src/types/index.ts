export interface Selection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  active: boolean
}

export type CellContents = Map<number, Map<number, string>>

export interface EditingCell {
  row: number
  col: number
}

export interface CanvasConfig {
  cellWidth: number
  cellHeight: number
  gridColor: string
  selectionColor: string
  textColor: string
  font: string
}
