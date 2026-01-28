# RenderingData (Interface)

## Declaration

```typescript
export interface RenderingData {
  /** Number of rows in the table (virtual boundary) */
  rows: number

  /** Number of columns in the table (virtual boundary) */
  cols: number

  /** Sparse cell data: row index → column index → cell data */
  cells: WorksheetData
}
```

## Purpose

Use `RenderingData` as the return type for `TableState.getGridData()`. This interface provides complete table information in a format suitable for rendering, export, or serialization.

**When to use:**
- When defining function signatures that accept table render data
- When implementing custom table renderers or exporters
- When type-checking grid data from `getGridData()`
- When documenting API contracts for table rendering

**When NOT to use:**
- Do NOT create instances manually (use `getGridData()` instead)
- Do NOT modify the `cells` map directly (may corrupt internal state)

## Properties

### `rows: number` (required)

The total number of rows in the table.

**Meaning:**
- Represents the virtual row boundary (max row index + 1)
- Same value as `TableState.getRowCount()`
- Does NOT indicate how many rows have actual data

**Usage:**
```typescript
// Set up grid container
gridContainer.style.gridTemplateRows = `repeat(${data.rows}, 1fr)`

// Validate row index
if (row >= data.rows) {
  throw new Error('Row out of bounds')
}
```

### `cols: number` (required)

The total number of columns in the table.

**Meaning:**
- Represents the virtual column boundary (max column index + 1)
- Same value as `TableState.getColCount()`
- Does NOT indicate how many columns have actual data

**Usage:**
```typescript
// Set up grid container
gridContainer.style.gridTemplateColumns = `repeat(${data.cols}, 1fr)`

// Validate column index
if (col >= data.cols) {
  throw new Error('Column out of bounds')
}
```

### `cells: WorksheetData` (required)

Sparse cell data storage.

**Structure:**
- Outer `Map`: row index → row data
- Inner `Map`: column index → `Cell` object
- Only contains non-empty cells

**Usage:**
```typescript
// Get cell at (row, col)
const cell = data.cells.get(row)?.get(col)

// Iterate all non-empty cells
for (const [row, rowMap] of data.cells) {
  for (const [col, cell] of rowMap) {
    console.log(`Cell (${row}, ${col}):`, cell)
  }
}
```

## Best Practices

1. **Use for type safety**
   - Add to function signatures for clear API contracts
   - Enables IDE autocomplete and type checking

2. **Understand sparse storage**
   - `cells` map only contains non-empty cells
   - Most `(row, col)` positions have no entry
   - Always check for `undefined` when accessing

3. **Use dimensions for setup**
   - `rows` and `cols` define the virtual grid
   - Use them for layout and validation
   - Don't rely on `cells` size for grid dimensions

4. **Don't modify directly**
   - The `cells` map references internal state
   - Direct modification may corrupt table state
   - Use `TableState` methods for modifications

## Common Pitfalls

1. **Creating instances manually**
   ```typescript
   // BAD: Manual creation (not connected to TableState)
   const data: RenderingData = {
     rows: 10,
     cols: 10,
     cells: new Map(),
   }

   // GOOD: Get from TableState
   const data = table.getGridData()
   ```

2. **Modifying cells directly**
   ```typescript
   // BAD: Directly modifies internal state
   const grid = table.getGridData()
   grid.cells.set(0, new Map())

   // GOOD: Use TableState methods
   table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
   ```

3. **Assuming dense cells**
   ```typescript
   // BAD: Assumes cells.size equals total cells
   const totalCells = data.rows * data.cols
   const cellCount = data.cells.size // Not the same!

   // GOOD: Understand sparse storage
   console.log(`Grid: ${data.rows}x${data.cols}`)
   console.log(`Non-empty cells: ${countNonEmptyCells(data.cells)}`)
   ```

## Complete Example

```typescript
import { TableState, RenderingData } from '@aptx/table-commands-generator'

// Scenario 1: Type-safe function signature
function renderTable(data: RenderingData, container: HTMLElement): void {
  // Clear container
  container.innerHTML = ''

  // Create grid with dimensions
  const grid = document.createElement('div')
  grid.style.display = 'grid'
  grid.style.gridTemplateRows = `repeat(${data.rows}, 1fr)`
  grid.style.gridTemplateColumns = `repeat(${data.cols}, 1fr)`

  // Render cells (sparse iteration)
  for (const [row, rowMap] of data.cells) {
    for (const [col, cell] of rowMap) {
      const cellDiv = document.createElement('div')
      cellDiv.style.gridRow = `${row + 1}`
      cellDiv.style.gridColumn = `${col + 1}`

      if (cell.merge) {
        cellDiv.textContent = `Merged ${cell.merge.rowSpan}x${cell.merge.colSpan}`
        cellDiv.style.backgroundColor = 'lightblue'
      } else if (cell.isMergedPlaceholder) {
        cellDiv.style.backgroundColor = 'lightgray'
        cellDiv.textContent = '(placeholder)'
      }

      grid.appendChild(cellDiv)
    }
  }

  container.appendChild(grid)
}

// Usage
const table = new TableState(5, 5)
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
table.updateCell(0, 1, { isMergedPlaceholder: true })
table.updateCell(1, 0, { isMergedPlaceholder: true })
table.updateCell(1, 1, { isMergedPlaceholder: true })

const container = document.getElementById('table-container')
renderTable(table.getGridData(), container!)

// Scenario 2: Export helper with type
function exportToCSV(data: RenderingData): string {
  const lines: string[] = []

  // Header row
  lines.push(','.join(Array.from({ length: data.cols }, (_, i) => `Col${i}`)))

  // Data rows (sparse - empty cells are empty strings)
  for (let row = 0; row < data.rows; row++) {
    const rowData: string[] = []
    for (let col = 0; col < data.cols; col++) {
      const cell = data.cells.get(row)?.get(col)
      if (cell?.merge) {
        rowData.push(`${cell.merge.rowSpan}x${cell.merge.colSpan}`)
      } else if (cell?.isMergedPlaceholder) {
        rowData.push('(placeholder)')
      } else {
        rowData.push('')
      }
    }
    lines.push(rowData.join(','))
  }

  return lines.join('\n')
}

// Usage
const csv = exportToCSV(table.getGridData())
console.log('CSV export:\n', csv)

// Scenario 3: Validator function
function validateRenderingData(data: RenderingData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check dimensions
  if (data.rows < 0) errors.push('Invalid row count')
  if (data.cols < 0) errors.push('Invalid column count')

  // Check cell bounds
  for (const [row, rowMap] of data.cells) {
    if (row < 0 || row >= data.rows) {
      errors.push(`Cell row ${row} out of bounds`)
    }

    for (const [col, cell] of rowMap) {
      if (col < 0 || col >= data.cols) {
        errors.push(`Cell (${row}, ${col}) column out of bounds`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Usage
const validation = validateRenderingData(table.getGridData())
if (!validation.valid) {
  console.error('Validation errors:', validation.errors)
}

// Scenario 4: Transformer helper
function transformRenderingData(
  data: RenderingData,
  transformer: (row: number, col: number, cell: Cell | undefined) => string
): string[][] {
  const result: string[][] = []

  for (let row = 0; row < data.rows; row++) {
    result[row] = []
    for (let col = 0; col < data.cols; col++) {
      const cell = data.cells.get(row)?.get(col)
      result[row][col] = transformer(row, col, cell)
    }
  }

  return result
}

// Usage
const strings = transformRenderingData(table.getGridData(), (row, col, cell) => {
  if (cell?.merge) return 'M'
  if (cell?.isMergedPlaceholder) return 'P'
  return '.'
})

console.log('Visual representation:')
strings.forEach(row => console.log(row.join(' ')))
// Output:
// M P . . .
// P P . . .
// . . . . .
// . . . . .
// . . . . .

// Scenario 5: Cloning helper
function cloneRenderingData(data: RenderingData): RenderingData {
  const clonedCells: Map<number, Map<number, any>> = new Map()

  for (const [row, rowMap] of data.cells) {
    const clonedRowMap = new Map()
    for (const [col, cell] of rowMap) {
      clonedRowMap.set(col, { ...cell })
    }
    clonedCells.set(row, clonedRowMap)
  }

  return {
    rows: data.rows,
    cols: data.cols,
    cells: clonedCells,
  }
}

// Usage
const cloned = cloneRenderingData(table.getGridData())
console.log('Cloned data has same dimensions:', cloned.rows === table.getRowCount())
```

## Related Types

- `WorksheetData` - The `cells` property type
- `Cell` - Individual cell data type
- `TableState.getGridData()` - Method that returns this interface
