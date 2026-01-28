# TableState.getGridData

## Declaration

```typescript
public getGridData(): RenderingData
```

## Purpose

Use `getGridData()` to get the complete table data in a format suitable for rendering or export. This returns the table dimensions and all cell data in a single object.

**When to use:**
- When passing table data to a rendering layer (UI components)
- When exporting table data to external formats (JSON, CSV, etc.)
- When creating a snapshot of the table state
- When serializing table data for storage or transmission

**When NOT to use:**
- Do NOT use for individual cell lookups (use `getCell()` instead)
- Do NOT call this repeatedly in a loop (cache the result if needed)

## Return Value

Returns `RenderingData` containing:

- `rows: number` - Total row count (virtual boundary)
- `cols: number` - Total column count (virtual boundary)
- `cells: WorksheetData` - Sparse cell data (Map of Maps)

**Structure:**
```typescript
{
  rows: number,        // Same as getRowCount()
  cols: number,        // Same as getColCount()
  cells: Map<number, Map<number, Cell>>  // Sparse cell storage
}
```

**Key characteristics:**
- `rows` and `cols` represent the virtual table dimensions
- `cells` contains only non-empty cells (sparse storage)
- Most positions in the virtual grid have no corresponding cell data

## Best Practices

1. **Use for rendering and export**
   - Ideal for passing to UI components
   - Contains all information needed for rendering
   - Dimensions help set up the grid structure

2. **Understand sparse vs. dense**
   - `cells` map only contains non-empty cells
   - Use `rows` and `cols` to determine virtual grid size
   - When iterating sparse data, don't assume dense coverage

3. **Cache when used repeatedly**
   - The method creates a new object each time
   - If calling multiple times, cache the result
   - Be aware that mutations to the returned data affect internal state

4. **Combine with RenderingData interface**
   - Use the `RenderingData` type for function signatures
   - Provides clear documentation of expected structure

## Common Pitfalls

1. **Assuming dense data**
   ```typescript
   // BAD: Assumes all cells exist
   const grid = table.getGridData()
   for (let row = 0; row < grid.rows; row++) {
     for (let col = 0; col < grid.cols; col++) {
       const cell = grid.cells.get(row)?.get(col) // Mostly undefined!
     }
   }

   // GOOD: Iterate sparse data
   const grid = table.getGridData()
   for (const [row, rowMap] of grid.cells) {
     for (const [col, cell] of rowMap) {
       // Only non-empty cells
     }
   }
   ```

2. **Not using dimensions for grid setup**
   ```typescript
   // BAD: Only uses cells, ignores dimensions
   const grid = table.getGridData()
   renderCells(grid.cells) // Grid size unknown

   // GOOD: Use dimensions for setup
   const grid = table.getGridData()
   setupGrid(grid.rows, grid.cols)
   renderCells(grid.cells)
   ```

3. **Calling repeatedly without caching**
   ```typescript
   // BAD: Creates new object each time
   for (let i = 0; i < 100; i++) {
     const grid = table.getGridData()
     process(grid)
   }

   // GOOD: Cache the result
   const grid = table.getGridData()
   for (let i = 0; i < 100; i++) {
     process(grid)
   }
   ```

## Complete Example

```typescript
import { TableState, RenderingData } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
table.updateCell(0, 1, { isMergedPlaceholder: true })
table.updateCell(1, 0, { isMergedPlaceholder: true })
table.updateCell(1, 1, { isMergedPlaceholder: true })

// Scenario 1: Basic usage
const grid = table.getGridData()
console.log('Grid dimensions:', grid.rows, 'x', grid.cols)
console.log('Non-empty cells:', grid.cells.size)

// Scenario 2: Rendering helper
function renderTable(grid: RenderingData): void {
  console.log(`Rendering ${grid.rows}x${grid.cols} table`)

  // Render sparse cells
  for (const [row, rowMap] of grid.cells) {
    for (const [col, cell] of rowMap) {
      if (cell.merge) {
        console.log(`  Merged cell at (${row}, ${col}): ${cell.merge.rowSpan}x${cell.merge.colSpan}`)
      } else if (cell.isMergedPlaceholder) {
        console.log(`  Placeholder at (${row}, ${col})`)
      }
    }
  }
}

// Usage
renderTable(table.getGridData())

// Scenario 3: Export to JSON
function exportTableToJSON(table: TableState): string {
  const grid = table.getGridData()

  const exportData: {
    rows: number
    cols: number
    cells: Array<{ row: number; col: number; merge?: { rowSpan: number; colSpan: number }; placeholder?: boolean }>
  } = {
    rows: grid.rows,
    cols: grid.cols,
    cells: [],
  }

  // Convert sparse map to array for JSON
  for (const [row, rowMap] of grid.cells) {
    for (const [col, cell] of rowMap) {
      if (cell.merge) {
        exportData.cells.push({
          row,
          col,
          merge: cell.merge,
        })
      } else if (cell.isMergedPlaceholder) {
        exportData.cells.push({
          row,
          col,
          placeholder: true,
        })
      }
    }
  }

  return JSON.stringify(exportData, null, 2)
}

// Usage
const json = exportTableToJSON(table)
console.log('Exported JSON:', json)

// Scenario 4: Import from JSON
function importTableFromJSON(json: string): TableState {
  const importData = JSON.parse(json)
  const table = new TableState(importData.rows, importData.cols)

  importData.cells.forEach((cellData: any) => {
    if (cellData.merge) {
      table.updateCell(cellData.row, cellData.col, {
        merge: cellData.merge,
      })
    } else if (cellData.placeholder) {
      table.updateCell(cellData.row, cellData.col, {
        isMergedPlaceholder: true,
      })
    }
  })

  return table
}

// Usage
const importedTable = importTableFromJSON(json)
console.log('Imported table size:', importedTable.getRowCount(), 'x', importedTable.getColCount())

// Scenario 5: Creating a table snapshot
interface TableSnapshot {
  timestamp: number
  data: RenderingData
}

const snapshots: TableSnapshot[] = []

function takeSnapshot(table: TableState): void {
  snapshots.push({
    timestamp: Date.now(),
    data: table.getGridData(),
  })
}

function restoreSnapshot(snapshot: TableSnapshot): TableState {
  const grid = snapshot.data
  const table = new TableState(grid.rows, grid.cols)

  // Copy all cells
  for (const [row, rowMap] of grid.cells) {
    for (const [col, cell] of rowMap) {
      table.updateCell(row, col, { ...cell })
    }
  }

  return table
}

// Usage
takeSnapshot(table)
console.log(`Took ${snapshots.length} snapshot(s)`)

if (snapshots.length > 0) {
  const restored = restoreSnapshot(snapshots[0])
  console.log('Restored table matches:', restored.getRowCount() === table.getRowCount())
}

// Scenario 6: Comparing two table states
function compareTables(table1: TableState, table2: TableState): {
  sameDimensions: boolean
  sameCellCount: boolean
  differences: Array<{ row: number; col: number; change: string }>
} {
  const grid1 = table1.getGridData()
  const grid2 = table2.getGridData()

  const differences: Array<{ row: number; col: number; change: string }> = []

  // Check dimensions
  if (grid1.rows !== grid2.rows || grid1.cols !== grid2.cols) {
    differences.push({
      row: -1,
      col: -1,
      change: `Dimensions differ: ${grid1.rows}x${grid1.cols} vs ${grid2.rows}x${grid2.cols}`,
    })
  }

  // Check cell count
  const cellCount1 = countNonEmptyCells(grid1.cells)
  const cellCount2 = countNonEmptyCells(grid2.cells)

  if (cellCount1 !== cellCount2) {
    differences.push({
      row: -1,
      col: -1,
      change: `Cell count differs: ${cellCount1} vs ${cellCount2}`,
    })
  }

  return {
    sameDimensions: grid1.rows === grid2.rows && grid1.cols === grid2.cols,
    sameCellCount: cellCount1 === cellCount2,
    differences,
  }
}

function countNonEmptyCells(cells: Map<number, Map<number, Cell>>): number {
  let count = 0
  for (const [, rowMap] of cells) {
    for (const [, cell] of rowMap) {
      if (cell.merge || cell.isMergedPlaceholder) {
        count++
      }
    }
  }
  return count
}

// Usage
const table2 = new TableState(10, 10)
const comparison = compareTables(table, table2)
console.log('Tables same dimensions:', comparison.sameDimensions)
console.log('Tables same cell count:', comparison.sameCellCount)

// Scenario 7: Dense grid conversion (for non-sparse consumers)
function convertToDenseGrid(grid: RenderingData): (Cell | null)[][] {
  const result: (Cell | null)[][] = []

  for (let row = 0; row < grid.rows; row++) {
    result[row] = []
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells.get(row)?.get(col)
      result[row][col] = cell ?? null
    }
  }

  return result
}

// Usage
const grid = table.getGridData()
const denseGrid = convertToDenseGrid(grid)
console.log(`Dense grid: ${denseGrid.length}x${denseGrid[0]?.length ?? 0}`)
```

## Related APIs

- `RenderingData` - Interface for the return value
- `TableState.getRowCount()` - Get row count
- `TableState.getColCount()` - Get column count
- `TableState.getCell()` - Get individual cell data
