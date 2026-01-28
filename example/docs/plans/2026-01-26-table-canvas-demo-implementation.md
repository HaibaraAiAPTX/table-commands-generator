# Table-Core Canvas Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Vite + React + TypeScript app that renders a table via HTML Canvas and exercises `@aptx/table-commands-generator` (select/range select, merge/unmerge, insert/delete rows/cols) while logging generated commands.

**Architecture:** Keep the table “structure/merge” state inside `TableState` and apply operations via `TableCommandPlanner` + `BuildinStateInterpreter`. Keep UI state (selection, editing, cell text map, command history) in a single `useTableState` hook. Canvas is a pure renderer over `TableState.getGridData()` plus UI overlays for selection + cell editor.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + Testing Library, HTML Canvas, `@aptx/table-commands-generator`.

---

## Prerequisites / Worktree

- Create a dedicated worktree for this plan (per `brainstorming` skill guidance).
- Ensure Node.js LTS is installed.

---

### Task 1: Scaffold Vite React+TS app

**Files:**
- Create: `package.json` (via Vite scaffolding)
- Create: `vite.config.ts` (via Vite scaffolding)
- Create: `src/main.tsx` (via Vite scaffolding)
- Create: `src/App.tsx` (via Vite scaffolding)

**Step 1: Write the failing test**

Create `src/__tests__/smoke.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from '../App'

it('renders the app shell', () => {
  render(<App />)
  expect(screen.getByText(/Table-Core Canvas Demo/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because Vitest/Testing Library are not configured.

**Step 3: Write minimal implementation**

Run:

```bash
npm create vite@latest . -- --template react-ts
npm i
npm i -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

Add `vitest` config to `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

Update `src/App.tsx` to include the title:

```tsx
export default function App() {
  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Table-Core Canvas Demo</h1>
    </main>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `renders the app shell`.

**Step 5: Commit**

```bash
git add package.json vite.config.ts src/App.tsx src/main.tsx src/test/setup.ts src/__tests__/smoke.test.tsx
git commit -m "chore: scaffold vite react app with tests"
```

---

### Task 2: Add app folders and shared types

**Files:**
- Create: `src/types/index.ts`
- Create: `src/utils/selectionManager.ts`
- Test: `src/utils/selectionManager.test.ts`

**Step 1: Write the failing test**

Create `src/utils/selectionManager.test.ts`:

```ts
import { normalizeSelection, selectionToRect } from './selectionManager'
import type { Selection } from '../types'

it('normalizes selection so start <= end', () => {
  const s: Selection = {
    startRow: 5,
    startCol: 3,
    endRow: 2,
    endCol: 1,
    active: false,
  }
  expect(normalizeSelection(s)).toEqual({
    startRow: 2,
    startCol: 1,
    endRow: 5,
    endCol: 3,
    active: false,
  })
})

it('computes inclusive rectangle size', () => {
  const s: Selection = {
    startRow: 0,
    startCol: 0,
    endRow: 1,
    endCol: 2,
    active: false,
  }
  expect(selectionToRect(s)).toEqual({ rows: 2, cols: 3 })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `selectionManager` and `Selection` types do not exist.

**Step 3: Write minimal implementation**

Create `src/types/index.ts`:

```ts
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
```

Create `src/utils/selectionManager.ts`:

```ts
import type { Selection } from '../types'

export function normalizeSelection(s: Selection): Selection {
  const startRow = Math.min(s.startRow, s.endRow)
  const endRow = Math.max(s.startRow, s.endRow)
  const startCol = Math.min(s.startCol, s.endCol)
  const endCol = Math.max(s.startCol, s.endCol)
  return { ...s, startRow, startCol, endRow, endCol }
}

export function selectionToRect(s: Selection): { rows: number; cols: number } {
  const n = normalizeSelection(s)
  return { rows: n.endRow - n.startRow + 1, cols: n.endCol - n.startCol + 1 }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS both tests.

**Step 5: Commit**

```bash
git add src/types/index.ts src/utils/selectionManager.ts src/utils/selectionManager.test.ts
git commit -m "test: add selection normalization helpers"
```

---

### Task 3: Add `@aptx/table-commands-generator` and a thin command pipeline

**Files:**
- Create: `src/table/tableCore.ts`
- Test: `src/table/tableCore.test.ts`

**Step 1: Write the failing test**

Create `src/table/tableCore.test.ts`:

```ts
import { createTableCore } from './tableCore'

it('applies merge via planner + interpreter and returns commands', () => {
  const core = createTableCore({ rows: 3, cols: 3 })

  const cmds = core.merge(0, 0, 1, 1)
  expect(cmds.length).toBeGreaterThan(0)

  const grid = core.getGrid()
  // merged main cell exists at 0,0
  const cell00 = grid.cells.get(0)?.get(0)
  expect(cell00?.merge).toEqual({ rowSpan: 2, colSpan: 2 })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `createTableCore` does not exist and the dependency is not installed.

**Step 3: Write minimal implementation**

Install:

```bash
npm i @aptx/table-commands-generator
```

Create `src/table/tableCore.ts`:

```ts
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
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `applies merge...`.

**Step 5: Commit**

```bash
git add package.json package-lock.json src/table/tableCore.ts src/table/tableCore.test.ts
git commit -m "feat: add table-core wrapper around planner/interpreter"
```

---

### Task 4: Add `useTableState` hook (single source of UI state)

**Files:**
- Create: `src/hooks/useTableState.ts`
- Modify: `src/App.tsx`
- Test: `src/hooks/useTableState.test.tsx`

**Step 1: Write the failing test**

Create `src/hooks/useTableState.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react'
import { useTableState } from './useTableState'

it('creates a table with requested size', () => {
  const { result } = renderHook(() => useTableState())
  act(() => result.current.createTable({ rows: 4, cols: 7 }))
  expect(result.current.grid?.rows).toBe(4)
  expect(result.current.grid?.cols).toBe(7)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `renderHook` dependency is missing and hook does not exist.

**Step 3: Write minimal implementation**

Install `renderHook` helper:

```bash
npm i -D @testing-library/react
```

Create `src/hooks/useTableState.ts`:

```ts
import { useCallback, useMemo, useRef, useState } from 'react'
import type { TableCommand, RenderingData } from '@aptx/table-commands-generator'
import type { CellContents, EditingCell, Selection } from '../types'
import { createTableCore, type TableCore } from '../table/tableCore'

export interface TableStateApi {
  grid: RenderingData | null
  selection: Selection
  editingCell: EditingCell | null
  cellContents: CellContents
  commandHistory: TableCommand[][]
  createTable(args: { rows: number; cols: number }): void
  setSelection(sel: Selection): void
  startEditing(cell: EditingCell): void
  stopEditing(): void
  setCellText(row: number, col: number, text: string): void
  ops: {
    insertRow(): void
    insertCol(): void
    deleteRow(): void
    deleteCol(): void
    merge(): void
    unmerge(): void
  }
}

const EMPTY_SELECTION: Selection = {
  startRow: 0,
  startCol: 0,
  endRow: 0,
  endCol: 0,
  active: false,
}

export function useTableState(): TableStateApi {
  const coreRef = useRef<TableCore | null>(null)
  const [grid, setGrid] = useState<RenderingData | null>(null)
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [cellContents, setCellContents] = useState<CellContents>(() => new Map())
  const [commandHistory, setCommandHistory] = useState<TableCommand[][]>([])

  const createTable = useCallback((args: { rows: number; cols: number }) => {
    coreRef.current = createTableCore(args)
    setGrid(coreRef.current.getGrid())
    setSelection(EMPTY_SELECTION)
    setEditingCell(null)
    setCellContents(new Map())
    setCommandHistory([])
  }, [])

  const setCellText = useCallback((row: number, col: number, text: string) => {
    setCellContents((prev) => {
      const next = new Map(prev)
      const rowMap = new Map(next.get(row) ?? [])
      rowMap.set(col, text)
      next.set(row, rowMap)
      return next
    })
  }, [])

  const run = useCallback((fn: (core: TableCore) => TableCommand[]) => {
    const core = coreRef.current
    if (!core) return
    const cmds = fn(core)
    setCommandHistory((h) => [...h, cmds])
    setGrid(core.getGrid())
  }, [])

  const ops = useMemo(() => {
    return {
      insertRow: () => run((core) => core.insertRow(selection.startRow, 1)),
      insertCol: () => run((core) => core.insertCol(selection.startCol, 1)),
      deleteRow: () => run((core) => core.deleteRow(selection.startRow, selection.endRow - selection.startRow + 1)),
      deleteCol: () => run((core) => core.deleteCol(selection.startCol, selection.endCol - selection.startCol + 1)),
      merge: () => run((core) => core.merge(selection.startRow, selection.startCol, selection.endRow, selection.endCol)),
      unmerge: () => run((core) => core.unmerge(selection.startRow, selection.startCol)),
    }
  }, [run, selection])

  return {
    grid,
    selection,
    editingCell,
    cellContents,
    commandHistory,
    createTable,
    setSelection,
    startEditing: setEditingCell,
    stopEditing: () => setEditingCell(null),
    setCellText,
    ops,
  }
}
```

Update `src/App.tsx` to call `useTableState()` and render the title only (still minimal):

```tsx
import { useTableState } from './hooks/useTableState'

export default function App() {
  useTableState()
  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Table-Core Canvas Demo</h1>
    </main>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `creates a table with requested size`.

**Step 5: Commit**

```bash
git add src/hooks/useTableState.ts src/hooks/useTableState.test.tsx src/App.tsx
git commit -m "feat: add useTableState hook with table lifecycle"
```

---

### Task 5: Add `canvasRenderer` utility (pure drawing)

**Files:**
- Create: `src/utils/canvasRenderer.ts`
- Test: `src/utils/canvasRenderer.test.ts`

**Step 1: Write the failing test**

Create `src/utils/canvasRenderer.test.ts`:

```ts
import { renderTable } from './canvasRenderer'
import type { CanvasConfig } from '../types'

function mockCtx() {
  return {
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    set font(v: string) {},
    set fillStyle(v: string) {},
    set strokeStyle(v: string) {},
    set textBaseline(v: CanvasTextBaseline) {},
  } as unknown as CanvasRenderingContext2D
}

it('skips merged placeholders', () => {
  const ctx = mockCtx()
  const config: CanvasConfig = {
    cellWidth: 100,
    cellHeight: 40,
    gridColor: '#e0e0e0',
    selectionColor: 'rgba(59,130,246,0.2)',
    textColor: '#333',
    font: '14px sans-serif',
  }

  const grid = {
    rows: 2,
    cols: 2,
    cells: new Map([
      [0, new Map([[0, { merge: { rowSpan: 2, colSpan: 2 } }]])],
      [0, new Map([[1, { isMergedPlaceholder: true }]])],
    ]),
  }

  renderTable({
    ctx,
    width: 200,
    height: 80,
    grid: grid as any,
    config,
    cellText: () => '',
  })

  // we still draw something for the main merged cell
  expect((ctx.strokeRect as any).mock.calls.length).toBeGreaterThan(0)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `renderTable` does not exist and test uses `vi`.

**Step 3: Write minimal implementation**

Fix test import by adding `import { vi } from 'vitest'` at top.

Create `src/utils/canvasRenderer.ts`:

```ts
import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig } from '../types'

export function renderTable(args: {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  grid: RenderingData
  config: CanvasConfig
  cellText: (row: number, col: number) => string
  selection?: { startRow: number; startCol: number; endRow: number; endCol: number }
}): void {
  const { ctx, width, height, grid, config } = args
  ctx.clearRect(0, 0, width, height)
  ctx.font = config.font
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = config.gridColor
  ctx.fillStyle = config.textColor

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells.get(r)?.get(c)
      if (cell?.isMergedPlaceholder) continue

      const rowSpan = cell?.merge?.rowSpan ?? 1
      const colSpan = cell?.merge?.colSpan ?? 1
      const x = c * config.cellWidth
      const y = r * config.cellHeight
      const w = colSpan * config.cellWidth
      const h = rowSpan * config.cellHeight

      ctx.strokeRect(x, y, w, h)
      const text = args.cellText(r, c)
      if (text) ctx.fillText(text, x + 8, y + h / 2)
    }
  }

  if (args.selection) {
    const s = args.selection
    const sr = Math.min(s.startRow, s.endRow)
    const er = Math.max(s.startRow, s.endRow)
    const sc = Math.min(s.startCol, s.endCol)
    const ec = Math.max(s.startCol, s.endCol)
    const x = sc * config.cellWidth
    const y = sr * config.cellHeight
    const w = (ec - sc + 1) * config.cellWidth
    const h = (er - sr + 1) * config.cellHeight
    ctx.save()
    ctx.fillStyle = config.selectionColor
    ctx.fillRect(x, y, w, h)
    ctx.restore()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `skips merged placeholders`.

**Step 5: Commit**

```bash
git add src/utils/canvasRenderer.ts src/utils/canvasRenderer.test.ts
git commit -m "feat: add canvas table renderer"
```

---

### Task 6: Add `TableCanvas` component (Canvas + redraw)

**Files:**
- Create: `src/components/TableCanvas.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/TableCanvas.test.tsx`

**Step 1: Write the failing test**

Create `src/components/TableCanvas.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import TableCanvas from './TableCanvas'

it('renders a canvas element', () => {
  const { container } = render(
    <TableCanvas
      grid={null}
      selection={null}
      cellText={() => ''}
      width={300}
      height={200}
      onCellDoubleClick={() => {}}
      onSelectionChange={() => {}}
    />,
  )
  expect(container.querySelector('canvas')).toBeTruthy()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `TableCanvas` does not exist.

**Step 3: Write minimal implementation**

Create `src/components/TableCanvas.tsx`:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import type { RenderingData } from '@aptx/table-commands-generator'
import type { CanvasConfig, EditingCell, Selection } from '../types'
import { renderTable } from '../utils/canvasRenderer'

const DEFAULT_CONFIG: CanvasConfig = {
  cellWidth: 100,
  cellHeight: 40,
  gridColor: '#e0e0e0',
  selectionColor: 'rgba(59, 130, 246, 0.2)',
  textColor: '#333',
  font: '14px sans-serif',
}

export default function TableCanvas(props: {
  grid: RenderingData | null
  selection: Selection | null
  cellText: (r: number, c: number) => string
  width: number
  height: number
  config?: CanvasConfig
  onSelectionChange: (sel: Selection) => void
  onCellDoubleClick: (cell: EditingCell) => void
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const config = props.config ?? DEFAULT_CONFIG

  const selectionForRender = useMemo(() => {
    if (!props.selection) return undefined
    return {
      startRow: props.selection.startRow,
      startCol: props.selection.startCol,
      endRow: props.selection.endRow,
      endCol: props.selection.endCol,
    }
  }, [props.selection])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (!props.grid) {
      ctx.clearRect(0, 0, props.width, props.height)
      return
    }
    renderTable({
      ctx,
      width: props.width,
      height: props.height,
      grid: props.grid,
      config,
      selection: selectionForRender,
      cellText: props.cellText,
    })
  }, [config, props.grid, props.height, props.width, props.cellText, selectionForRender])

  return (
    <canvas
      ref={canvasRef}
      width={props.width}
      height={props.height}
      style={{ border: '1px solid #ddd', display: 'block' }}
    />
  )
}
```

Update `src/App.tsx` to create a table and show the canvas (still no interactions yet):

```tsx
import { useEffect } from 'react'
import TableCanvas from './components/TableCanvas'
import { useTableState } from './hooks/useTableState'

export default function App() {
  const s = useTableState()

  useEffect(() => {
    if (!s.grid) s.createTable({ rows: 10, cols: 10 })
  }, [s])

  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Table-Core Canvas Demo</h1>
      <TableCanvas
        grid={s.grid}
        selection={s.grid ? s.selection : null}
        cellText={(r, c) => s.cellContents.get(r)?.get(c) ?? ''}
        width={1000}
        height={500}
        onCellDoubleClick={() => {}}
        onSelectionChange={() => {}}
      />
    </main>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `renders a canvas element`.

**Step 5: Commit**

```bash
git add src/components/TableCanvas.tsx src/components/TableCanvas.test.tsx src/App.tsx
git commit -m "feat: render table grid to canvas"
```

---

### Task 7: Add coordinate mapping + selection interaction hook

**Files:**
- Create: `src/hooks/useCanvasInteraction.ts`
- Create: `src/utils/coords.ts`
- Test: `src/utils/coords.test.ts`
- Modify: `src/components/TableCanvas.tsx`

**Step 1: Write the failing test**

Create `src/utils/coords.test.ts`:

```ts
import { pointToCell } from './coords'

it('maps a point to a cell index', () => {
  expect(pointToCell({ x: 0, y: 0 }, { cellWidth: 100, cellHeight: 40 })).toEqual({ row: 0, col: 0 })
  expect(pointToCell({ x: 199, y: 79 }, { cellWidth: 100, cellHeight: 40 })).toEqual({ row: 1, col: 1 })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `pointToCell` does not exist.

**Step 3: Write minimal implementation**

Create `src/utils/coords.ts`:

```ts
export function pointToCell(
  p: { x: number; y: number },
  args: { cellWidth: number; cellHeight: number },
): { row: number; col: number } {
  return {
    row: Math.floor(p.y / args.cellHeight),
    col: Math.floor(p.x / args.cellWidth),
  }
}
```

Create `src/hooks/useCanvasInteraction.ts`:

```ts
import { useCallback, useRef } from 'react'
import type { EditingCell, Selection } from '../types'
import { pointToCell } from '../utils/coords'

export function useCanvasInteraction(args: {
  cellWidth: number
  cellHeight: number
  onSelectionChange: (sel: Selection) => void
  onDoubleClick: (cell: EditingCell) => void
}): {
  onMouseDown: (ev: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseMove: (ev: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseUp: () => void
  onDoubleClick: (ev: React.MouseEvent<HTMLCanvasElement>) => void
} {
  const draggingRef = useRef(false)
  const startRef = useRef<{ row: number; col: number } | null>(null)

  const getPoint = useCallback((ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect()
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
  }, [])

  const onMouseDown = useCallback(
    (ev: React.MouseEvent<HTMLCanvasElement>) => {
      draggingRef.current = true
      const cell = pointToCell(getPoint(ev), args)
      startRef.current = cell
      args.onSelectionChange({
        startRow: cell.row,
        startCol: cell.col,
        endRow: cell.row,
        endCol: cell.col,
        active: true,
      })
    },
    [args, getPoint],
  )

  const onMouseMove = useCallback(
    (ev: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current || !startRef.current) return
      const end = pointToCell(getPoint(ev), args)
      const start = startRef.current
      args.onSelectionChange({
        startRow: start.row,
        startCol: start.col,
        endRow: end.row,
        endCol: end.col,
        active: true,
      })
    },
    [args, getPoint],
  )

  const onMouseUp = useCallback(() => {
    draggingRef.current = false
    startRef.current = null
  }, [])

  const onDoubleClick = useCallback(
    (ev: React.MouseEvent<HTMLCanvasElement>) => {
      const cell = pointToCell(getPoint(ev), args)
      args.onDoubleClick({ row: cell.row, col: cell.col })
    },
    [args, getPoint],
  )

  return { onMouseDown, onMouseMove, onMouseUp, onDoubleClick }
}
```

Modify `src/components/TableCanvas.tsx` to wire handlers:

```tsx
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'
// ...
  const handlers = useCanvasInteraction({
    cellWidth: config.cellWidth,
    cellHeight: config.cellHeight,
    onSelectionChange: props.onSelectionChange,
    onDoubleClick: props.onCellDoubleClick,
  })

  return (
    <canvas
      ref={canvasRef}
      width={props.width}
      height={props.height}
      onMouseDown={handlers.onMouseDown}
      onMouseMove={handlers.onMouseMove}
      onMouseUp={handlers.onMouseUp}
      onDoubleClick={handlers.onDoubleClick}
      style={{ border: '1px solid #ddd', display: 'block' }}
    />
  )
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `maps a point to a cell index`.

**Step 5: Commit**

```bash
git add src/utils/coords.ts src/utils/coords.test.ts src/hooks/useCanvasInteraction.ts src/components/TableCanvas.tsx
git commit -m "feat: add canvas selection interaction"
```

---

### Task 8: Add controls panel (insert/delete/merge/unmerge)

**Files:**
- Create: `src/components/TableControls.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/TableControls.test.tsx`

**Step 1: Write the failing test**

Create `src/components/TableControls.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import TableControls from './TableControls'

it('calls merge handler', () => {
  const onMerge = vi.fn()
  render(
    <TableControls
      disabled={false}
      onInsertRow={() => {}}
      onInsertCol={() => {}}
      onDeleteRow={() => {}}
      onDeleteCol={() => {}}
      onMerge={onMerge}
      onUnmerge={() => {}}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Merge Cells' }))
  expect(onMerge).toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `TableControls` does not exist and `vi` is not imported.

**Step 3: Write minimal implementation**

Add `import { vi } from 'vitest'` to the test.

Create `src/components/TableControls.tsx`:

```tsx
export default function TableControls(props: {
  disabled: boolean
  onInsertRow: () => void
  onInsertCol: () => void
  onDeleteRow: () => void
  onDeleteCol: () => void
  onMerge: () => void
  onUnmerge: () => void
}): JSX.Element {
  return (
    <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
      <button disabled={props.disabled} onClick={props.onInsertRow}>Insert Row</button>
      <button disabled={props.disabled} onClick={props.onInsertCol}>Insert Col</button>
      <button disabled={props.disabled} onClick={props.onDeleteRow}>Delete Row</button>
      <button disabled={props.disabled} onClick={props.onDeleteCol}>Delete Col</button>
      <button disabled={props.disabled} onClick={props.onMerge}>Merge Cells</button>
      <button disabled={props.disabled} onClick={props.onUnmerge}>Unmerge Cell</button>
    </section>
  )
}
```

Modify `src/App.tsx` to wire controls to `useTableState().ops`:

```tsx
import TableControls from './components/TableControls'
// ...
  const disabled = !s.grid
  return (
    <main style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Table-Core Canvas Demo</h1>
      <TableControls
        disabled={disabled}
        onInsertRow={s.ops.insertRow}
        onInsertCol={s.ops.insertCol}
        onDeleteRow={s.ops.deleteRow}
        onDeleteCol={s.ops.deleteCol}
        onMerge={s.ops.merge}
        onUnmerge={s.ops.unmerge}
      />
      {/* TableCanvas remains */}
    </main>
  )
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `calls merge handler`.

**Step 5: Commit**

```bash
git add src/components/TableControls.tsx src/components/TableControls.test.tsx src/App.tsx
git commit -m "feat: add table operation controls"
```

---

### Task 9: Add command log panel

**Files:**
- Create: `src/components/CommandLog.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/CommandLog.test.tsx`

**Step 1: Write the failing test**

Create `src/components/CommandLog.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import CommandLog from './CommandLog'

it('renders empty state', () => {
  render(<CommandLog history={[]} />)
  expect(screen.getByText(/No commands yet/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `CommandLog` does not exist.

**Step 3: Write minimal implementation**

Create `src/components/CommandLog.tsx`:

```tsx
import type { TableCommand } from '@aptx/table-commands-generator'

export default function CommandLog(props: { history: TableCommand[][] }): JSX.Element {
  if (props.history.length === 0) return <aside><h2>Commands</h2><p>No commands yet.</p></aside>

  return (
    <aside style={{ marginTop: 12 }}>
      <h2>Commands</h2>
      <pre style={{ maxHeight: 240, overflow: 'auto', background: '#fafafa', padding: 12, border: '1px solid #eee' }}>
        {JSON.stringify(props.history, null, 2)}
      </pre>
    </aside>
  )
}
```

Modify `src/App.tsx` to render it:

```tsx
import CommandLog from './components/CommandLog'
// ...
<CommandLog history={s.commandHistory} />
```

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `renders empty state`.

**Step 5: Commit**

```bash
git add src/components/CommandLog.tsx src/components/CommandLog.test.tsx src/App.tsx
git commit -m "feat: show generated command history"
```

---

### Task 10: Add initial config panel (rows/cols) and reset

**Files:**
- Create: `src/components/TableConfig.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/TableConfig.test.tsx`

**Step 1: Write the failing test**

Create `src/components/TableConfig.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import TableConfig from './TableConfig'

it('submits chosen table size', () => {
  const onCreate = vi.fn()
  render(<TableConfig onCreate={onCreate} />)
  fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText('Cols'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create Table' }))
  expect(onCreate).toHaveBeenCalledWith({ rows: 4, cols: 5 })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `TableConfig` does not exist and `vi` is not imported.

**Step 3: Write minimal implementation**

Add `import { vi } from 'vitest'` to the test.

Create `src/components/TableConfig.tsx`:

```tsx
import { useState } from 'react'

export default function TableConfig(props: {
  onCreate: (args: { rows: number; cols: number }) => void
}): JSX.Element {
  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState(10)

  return (
    <section style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 12 }}>
      <label>
        Rows
        <input
          aria-label="Rows"
          type="number"
          min={1}
          value={rows}
          onChange={(e) => setRows(Number(e.target.value))}
          style={{ marginLeft: 8, width: 88 }}
        />
      </label>
      <label>
        Cols
        <input
          aria-label="Cols"
          type="number"
          min={1}
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
          style={{ marginLeft: 8, width: 88 }}
        />
      </label>
      <button onClick={() => props.onCreate({ rows, cols })}>Create Table</button>
    </section>
  )
}
```

Modify `src/App.tsx`:

```tsx
import TableConfig from './components/TableConfig'
// ...
<TableConfig onCreate={s.createTable} />
```

Remove the auto-create effect from Task 6 so the config is the only entrypoint.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `submits chosen table size`.

**Step 5: Commit**

```bash
git add src/components/TableConfig.tsx src/components/TableConfig.test.tsx src/App.tsx
git commit -m "feat: add table size config and reset"
```

---

### Task 11: Wire selection + double-click editing UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/TableCanvas.tsx`
- Create: `src/components/CellEditorOverlay.tsx`
- Test: `src/components/CellEditorOverlay.test.tsx`

**Step 1: Write the failing test**

Create `src/components/CellEditorOverlay.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import CellEditorOverlay from './CellEditorOverlay'

it('commits value on Enter', () => {
  const onCommit = vi.fn()
  render(
    <CellEditorOverlay
      open
      value=""
      x={0}
      y={0}
      width={100}
      height={40}
      onChange={() => {}}
      onCommit={onCommit}
      onCancel={() => {}}
    />,
  )
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
  expect(onCommit).toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `CellEditorOverlay` does not exist and `vi` is not imported.

**Step 3: Write minimal implementation**

Add `import { vi } from 'vitest'` to the test.

Create `src/components/CellEditorOverlay.tsx`:

```tsx
import { useEffect, useRef } from 'react'

export default function CellEditorOverlay(props: {
  open: boolean
  value: string
  x: number
  y: number
  width: number
  height: number
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}): JSX.Element | null {
  const ref = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (props.open) ref.current?.focus()
  }, [props.open])

  if (!props.open) return null
  return (
    <input
      ref={ref}
      role="textbox"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') props.onCommit()
        if (e.key === 'Escape') props.onCancel()
      }}
      style={{
        position: 'absolute',
        left: props.x + 1,
        top: props.y + 1,
        width: props.width - 2,
        height: props.height - 2,
        boxSizing: 'border-box',
        border: '2px solid #3b82f6',
        outline: 'none',
        padding: '6px 8px',
      }}
    />
  )
}
```

Modify `src/App.tsx` to:
- Pass `onSelectionChange={s.setSelection}` to `TableCanvas`.
- Pass `onCellDoubleClick={s.startEditing}`.
- Render `CellEditorOverlay` inside a relatively positioned container wrapping the canvas.
- Track current editor value in component state; on commit call `s.setCellText(row,col,val)` and `s.stopEditing()`.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS `commits value on Enter`.

**Step 5: Commit**

```bash
git add src/components/CellEditorOverlay.tsx src/components/CellEditorOverlay.test.tsx src/App.tsx
git commit -m "feat: add cell editor overlay and wire canvas events"
```

---

### Task 12: Add basic layout polish + verification script

**Files:**
- Modify: `src/App.tsx`
- Create: `src/styles.css`
- Modify: `src/main.tsx`

**Step 1: Write the failing test**

Create `src/__tests__/layout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import App from '../App'

it('shows controls and commands panel headings', () => {
  render(<App />)
  expect(screen.getByText('Commands')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL until `App` renders `CommandLog` in all states.

**Step 3: Write minimal implementation**

Ensure `App` always renders `CommandLog` (even before table creation).

Add `src/styles.css` for basic readable layout:

```css
:root {
  color-scheme: light;
}

body {
  margin: 0;
  font-family: system-ui, sans-serif;
}

main {
  padding: 16px;
}

button {
  padding: 8px 10px;
}

input {
  padding: 6px 8px;
}
```

Import in `src/main.tsx`:

```ts
import './styles.css'
```

Add verification command to run before demo sharing:

Run: `npm run build`

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/styles.css src/main.tsx src/__tests__/layout.test.tsx src/App.tsx
git commit -m "chore: add basic styling and layout regression test"
```

---

## Manual QA Checklist (post-implementation)

- Run: `npm run dev`
- Create a 10x10 table.
- Drag select a rectangle; selection highlight tracks mouse.
- Click buttons:
  - Insert Row/Col at selection start.
  - Delete Row/Col for selection span.
  - Merge selection; merged main cell renders as a larger rect; placeholders are not drawn.
  - Unmerge at selection start.
- Confirm `Commands` panel updates on each operation and JSON matches expected command types:
  - Structural: `INSERT_ROW`, `DELETE_ROW`, `INSERT_COL`, `DELETE_COL`
  - Cell: `SET_CELL_ATTR`, `CLEAR_CELL_ATTR` with attrs `rowSpan`, `colSpan`, `isMergedPlaceholder`
- Double-click a cell to edit; Enter commits, Escape cancels.

---

## Notes / Constraints

- `TableCommandPlanner` is created with `{ autoClear: false }` and we always call `getNewCommandsAndReset()` to collect per-operation command batches.
- `BuildinStateInterpreter.applyCommands()` applies commands to `TableState` synchronously.
- `TableState.getGridData()` yields `{ rows, cols, cells: Map<number, Map<number, Cell>> }` and `Cell` includes `merge?: {rowSpan,colSpan}` + `isMergedPlaceholder?`.
