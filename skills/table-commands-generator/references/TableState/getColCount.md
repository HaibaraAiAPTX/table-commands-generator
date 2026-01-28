# TableState.getColCount

## Declaration

```typescript
public getColCount(): number
```

## Purpose

Use `getColCount()` to get the total number of columns in the table. This returns the virtual column boundary, which is the maximum column index that has been accessed plus one.

**When to use:**
- When iterating over all columns in the table
- When validating column indices before access
- When displaying table dimensions in UI
- When exporting table data

**When NOT to use:**
- Do NOT assume this represents the number of non-empty columns (sparse storage)
- Do NOT use this to determine if a column has data (use sparse iteration instead)

## Return Value

Returns `number`: The total column count.

**What this means:**
- Returns `maxColIndex + 1` where `maxColIndex` is the highest column index ever accessed
- A new table with no cells returns `0` (or the `initialCols` from constructor)
- The count expands automatically when cells are added beyond current bounds
- Does NOT indicate how many columns have actual data

**Example:**
```typescript
const table = new TableState()
console.log(table.getColCount()) // 0

table.updateCell(0, 5, { merge: { rowSpan: 1, colSpan: 1 } })
console.log(table.getColCount()) // 6 (columns 0-5)
```

## Best Practices

1. **Understand virtual vs. actual data**
   - `getColCount()` returns the virtual boundary, not data count
   - Most columns between 0 and `getColCount() - 1` may be empty
   - Use sparse iteration to find columns with actual data

2. **Use for bounds checking**
   - Always validate indices: `0 <= col < getColCount()`
   - Prevents out-of-bounds access
   - The library may not validate indices

3. **Combine with getRowCount() for dimensions**
   - Use both to get full table size
   - Useful for rendering, export, and validation

4. **Don't use for iteration efficiency**
   - Dense iteration from 0 to `getColCount()` is inefficient for sparse tables
   - Use sparse iteration patterns instead

## Common Pitfalls

1. **Assuming dense data**
   ```typescript
   // BAD: Assumes all columns have data
   for (let col = 0; col < table.getColCount(); col++) {
     // Process column (most are empty!)
   }

   // GOOD: Use sparse iteration
   const data = (table as any)._data
   for (const [row, rowMap] of data) {
     for (const [col, cell] of rowMap) {
       // Only processes columns with data
     }
   }
   ```

2. **Not using for bounds validation**
   ```typescript
   // BAD: Doesn't validate indices
   table.getCell(0, 1000) // May be out of bounds

   // GOOD: Validate first
   const col = 1000
   if (col < table.getColCount()) {
     table.getCell(0, col)
   }
   ```

3. **Confusing with data count**
   ```typescript
   // BAD: Assumes this equals number of columns with data
   console.log('Data columns:', table.getColCount())

   // GOOD: Count actual data columns per row
   const data = (table as any)._data
   for (const [row, rowMap] of data) {
     console.log(`Row ${row} has ${rowMap.size} columns with data`)
   }
   ```

## Complete Example

```typescript
import { TableState } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)
console.log('Initial column count:', table.getColCount()) // 10

// Scenario 1: Column count expands with cell updates
table.updateCell(0, 0, { merge: { rowSpan: 1, colSpan: 1 } })
console.log('After cell at (0,0):', table.getColCount()) // 10

table.updateCell(0, 20, { merge: { rowSpan: 1, colSpan: 1 } })
console.log('After cell at (0,20):', table.getColCount()) // 21 (expanded!)

// Scenario 2: Bounds validation
function safeGetCell(table: TableState, row: number, col: number) {
  if (row < 0 || row >= table.getRowCount() || col < 0 || col >= table.getColCount()) {
    console.warn(`Cell (${row}, ${col}) is out of bounds`)
    return null
  }
  return table.getCell(row, col)
}

// Usage
safeGetCell(table, 5, 5) // OK
safeGetCell(table, 5, 100) // Warning: out of bounds

// Scenario 3: Getting column data per row
function getColumnCountsPerRow(table: TableState): Map<number, number> {
  const data = (table as any)._data
  const counts = new Map<number, number>()

  for (const [row, rowMap] of data) {
    counts.set(row, rowMap.size)
  }

  return counts
}

// Usage
table.updateCell(0, 0, { merge: { rowSpan: 1, colSpan: 1 } })
table.updateCell(0, 1, { merge: { rowSpan: 1, colSpan: 1 } })
table.updateCell(0, 2, { merge: { rowSpan: 1, colSpan: 1 } })
table.updateCell(1, 0, { merge: { rowSpan: 1, colSpan: 1 } })

const columnCounts = getColumnCountsPerRow(table)
console.log('Column counts per row:', columnCounts)
// Map { 0 => 3, 1 => 1 }

// Scenario 4: Finding max columns in any row
function getMaxColumnsInRow(table: TableState): number {
  const data = (table as any)._data
  let maxCols = 0

  for (const [, rowMap] of data) {
    maxCols = Math.max(maxCols, rowMap.size)
  }

  return maxCols
}

// Usage
const maxCols = getMaxColumnsInRow(table)
console.log('Max columns in any row:', maxCols)

// Scenario 5: Table dimensions helper
function getTableDimensions(table: TableState): { rows: number; cols: number; cells: number; sparsity: number } {
  const data = (table as any)._data
  let cellCount = 0

  for (const [, rowMap] of data) {
    cellCount += rowMap.size
  }

  const totalCells = table.getRowCount() * table.getColCount()
  const sparsity = totalCells > 0 ? (1 - cellCount / totalCells) * 100 : 100

  return {
    rows: table.getRowCount(),
    cols: table.getColCount(),
    cells: cellCount,
    sparsity: Math.round(sparsity),
  }
}

// Usage
const dims = getTableDimensions(table)
console.log(`Table: ${dims.rows}x${dims.cols}`)
console.log(`Data cells: ${dims.cells}`)
console.log(`Sparsity: ${dims.sparsity}%`)

// Scenario 6: Finding columns with data in a specific row
function getColumnsWithDataInRow(table: TableState, row: number): number[] {
  const data = (table as any)._data
  const rowMap = data.get(row)

  if (!rowMap) {
    return []
  }

  return Array.from(rowMap.keys()).sort((a, b) => a - b)
}

// Usage
const colsInRow0 = getColumnsWithDataInRow(table, 0)
console.log('Columns with data in row 0:', colsInRow0) // [0, 1, 2]

// Scenario 7: Finding next available column in a row
function findNextAvailableColumn(table: TableState, row: number, startCol: number = 0): number {
  const data = (table as any)._data
  const rowMap = data.get(row)

  if (!rowMap) {
    return startCol
  }

  const colsWithData = new Set(rowMap.keys())

  for (let col = startCol; col < table.getColCount(); col++) {
    if (!colsWithData.has(col)) {
      return col
    }
  }

  // All columns have data, return next available
  return table.getColCount()
}

// Usage
const nextCol = findNextAvailableColumn(table, 0, 0)
console.log('Next available column in row 0:', nextCol)

// Scenario 8: Checking if position is valid
function isValidPosition(table: TableState, row: number, col: number): boolean {
  return (
    row >= 0 &&
    row < table.getRowCount() &&
    col >= 0 &&
    col < table.getColCount()
  )
}

// Usage
console.log('Is (5, 5) valid?', isValidPosition(table, 5, 5)) // true
console.log('Is (5, 100) valid?', isValidPosition(table, 5, 100)) // false
```

## Related APIs

- `TableState.getRowCount()` - Get row count
- `TableState.constructor` - Set initial column count
- `TableState.getCell()` - Access cell data
