import { TableCommand } from './Commands'

/**
 * 抽象命令解释器：提供一个统一的 applyCommands 实现，并把具体的命令
 * 分派给子类去完成。子类只需实现原子操作（handleXXX）。
 */
export abstract class CommandInterpreter {
  public applyCommands(cmds: TableCommand[]): void {
    for (const cmd of cmds) {
      switch (cmd.type) {
        case 'INSERT_ROW':
          this.handleInsertRow(cmd.index, cmd.count)
          break
        case 'INSERT_COL':
          this.handleInsertCol(cmd.index, cmd.count)
          break
        case 'DELETE_ROW':
          this.handleDeleteRow(cmd.index, cmd.count)
          break
        case 'DELETE_COL':
          this.handleDeleteCol(cmd.index, cmd.count)
          break
        case 'SET_CELL_ATTR':
          this.handleSetCellAttr(cmd.row, cmd.col, cmd.attr, cmd.value)
          break
        case 'CLEAR_CELL_ATTR':
          this.handleClearCellAttr(cmd.row, cmd.col, cmd.attr)
          break
      }
    }
  }

  protected abstract handleInsertRow(index: number, count: number): void

  protected abstract handleInsertCol(index: number, count: number): void

  protected abstract handleDeleteRow(index: number, count: number): void

  protected abstract handleDeleteCol(index: number, count: number): void

  protected abstract handleSetCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
    value: number | boolean | undefined,
  ): void

  protected abstract handleClearCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
  ): void
}
