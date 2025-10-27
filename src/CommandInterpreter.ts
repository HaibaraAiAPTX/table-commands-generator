import { TableCommand } from './Commands'

/**
 * 抽象命令解释器：提供一个统一的 applyCommands 实现，并把具体的命令
 * 分派给子类去完成。子类只需实现原子操作（handleXXX）。
 */
export abstract class CommandInterpreter {
  /**
   * 批量执行命令
   * @param cmds
   */
  public applyCommands(cmds: TableCommand[]) {
    for (const cmd of cmds) {
      this.applyCommand(cmd)
    }
  }

  /**
   * 异步批量执行命令
   * @param cmds
   * @returns
   */
  public async applyCommandsAsync(cmds: TableCommand[]): Promise<void> {
    for (const cmd of cmds) {
      await this.applyCommand(cmd)
    }
  }

  public applyCommand(cmd: TableCommand) {
    switch (cmd.type) {
      case 'INSERT_ROW':
        return this.handleInsertRow(cmd.index, cmd.count)

      case 'INSERT_COL':
        return this.handleInsertCol(cmd.index, cmd.count)

      case 'DELETE_ROW':
        return this.handleDeleteRow(cmd.index, cmd.count)

      case 'DELETE_COL':
        return this.handleDeleteCol(cmd.index, cmd.count)

      case 'SET_CELL_ATTR':
        return this.handleSetCellAttr(cmd.row, cmd.col, cmd.attr, cmd.value)

      case 'CLEAR_CELL_ATTR':
        return this.handleClearCellAttr(cmd.row, cmd.col, cmd.attr)
    }
  }

  protected abstract handleInsertRow(
    index: number,
    count: number,
  ): void | Promise<void>

  protected abstract handleInsertCol(
    index: number,
    count: number,
  ): void | Promise<void>

  protected abstract handleDeleteRow(
    index: number,
    count: number,
  ): void | Promise<void>

  protected abstract handleDeleteCol(
    index: number,
    count: number,
  ): void | Promise<void>

  protected abstract handleSetCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
    value: number | boolean | undefined,
  ): void | Promise<void>

  protected abstract handleClearCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
  ): void | Promise<void>
}
