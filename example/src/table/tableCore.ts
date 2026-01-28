import {
  BuildinStateInterpreter,
  TableCommandPlanner,
  TableState,
  type RenderingData,
  type TableCommand,
} from '@aptx/table-commands-generator'

export interface TableCore {
  getGrid(): RenderingData
  getCommands(): TableCommand[]
  getNewCommandsAndReset(): TableCommand[]
  insertRow(index: number, count?: number): TableCommand[]
  insertCol(index: number, count?: number): TableCommand[]
  deleteRow(index: number, count?: number): TableCommand[]
  deleteCol(index: number, count?: number): TableCommand[]
  merge(sr: number, sc: number, er: number, ec: number): TableCommand[]
  unmerge(r: number, c: number): TableCommand[]
}

export function createTableCore(args: { rows: number; cols: number }): TableCore {
  const state = new TableState(args.rows, args.cols)
  const planner = new TableCommandPlanner(state, { autoClear: false })
  const interpreter = new BuildinStateInterpreter(state)

  function applyAndCollect(op: () => TableCommand[] | undefined): TableCommand[] {
    op()
    const cmds = planner.getNewCommandsAndReset()
    interpreter.applyCommands(cmds)
    return cmds
  }

  return {
    getGrid: () => state.getGridData(),
    getCommands: () => planner.getCommands(),
    getNewCommandsAndReset: () => planner.getNewCommandsAndReset(),
    insertRow: (index, count = 1) => applyAndCollect(() => planner.insertRow(index, count)),
    insertCol: (index, count = 1) => applyAndCollect(() => planner.insertCol(index, count)),
    deleteRow: (index, count = 1) => applyAndCollect(() => planner.deleteRow(index, count)),
    deleteCol: (index, count = 1) => applyAndCollect(() => planner.deleteCol(index, count)),
    merge: (sr, sc, er, ec) => applyAndCollect(() => planner.merge(sr, sc, er, ec)),
    unmerge: (r, c) => applyAndCollect(() => planner.unmerge(r, c)),
  }
}
