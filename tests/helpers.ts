import { TableCommand, TableCommandPlanner, TableState } from '../src'

/**
 * 测试用便捷工厂：创建指定规模的表格与事务规划器
 */
export function createTable(row: number, col: number) {
  const core = new TableState(row, col)
  const tx = new TableCommandPlanner(core)

  return { core, tx }
}

/**
 * 统计命令序列中 isMergedPlaceholder 的 SET 命令数量
 */
export function placeholderSetCount(cmds: TableCommand[]): number {
  return cmds.filter(
    (c) =>
      c.type === 'SET_CELL_ATTR' &&
      c.attr === 'isMergedPlaceholder' &&
      c.value === true,
  ).length
}
