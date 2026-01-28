# TableState.getRowCount

## Declaration

```typescript
public getRowCount(): number
```

## Purpose

Use `getRowCount()` to get the total number of rows in the table. This returns the virtual row boundary, which is the maximum row index that has been accessed plus one.

**When to use:**
- When iterating over all rows in the table
- When validating row indices before access
- When displaying table dimensions in UI
- When exporting table data

**When NOT to use:**
- Do NOT assume this represents the number of non-empty rows (sparse storage)
- Do NOT use this to determine if a row has data (use sparse iteration instead)

## Return Value

Returns `number`: The total row count.

**What this means:**
- Returns `maxRowIndex + 1` where `maxRowIndex` is the highest row index ever accessed
- A new table with no cells returns `0` (or the `initialRows` from constructor)
- The count expands automatically when cells are added beyond current bounds
- Does NOT indicate how many rows have actual data

**Example:**
```typescript
const table = new TableState()
console.log(table.getRowCount()) // 0

table.updateCell(5, 0, { merge: { rowSpan: 1, colSpan: 1 } })
console.log(table.getRowCount()) // 6 (rows 0-5)
```

## Best Practices

1. **Understand virtual vs. actual data**
   - `getRowCount()` returns the virtual boundary, not data count
   - Most rows between 0 and `getRowCount() - 1` may be empty
   - Use sparse iteration to find rows with actual data

2. **Use for bounds checking**
   - Always validate indices: `0 <= row < getRowCount()`
   - Prevents out-of-bounds access
   - The library may not validate indices

3. **Combine with getColCount() for dimensions**
   - Use both to get full table size
   - Useful for rendering, export, and validation

4. **Don't use for iteration efficiency**
   - Dense iteration from 0 to `getRowCount()` is inefficient for sparse tables
   - Use sparse iteration patterns instead

## Common Pitfalls

1. **Assuming dense data**
   ```typescript
   // BAD: Assumes all rows have data
   for (let row = 0; row < table.getRowCount(); row++) {
     // Process row (most are empty!)
   }

   // GOOD: Use sparse iteration
   const data = (table as any)._data
   for (const [row, rowMap] of data) {
     // Only processes rows with data
   }
   ```

2. **Not using for bounds validation**
   ```typescript
   // BAD: Doesn't validate indices
   table.getCell(1000, 0) // May be out of bounds

   // GOOD: Validate first
   const row = 1000
   if (row < table.getRowCount()) {
     table.getCell(row, 0)
   }
   ```

3. **Confusing with data count**
   ```typescript
   // BAD: Assumes this equals number of rows with data
   console.log('Data rows:', table.getRowCount())

   // GOOD: Count actual data rows
   const data = (table as any)._data
   console.log('Data rows:', data.size)
   ```

## Complete Example

```typescript
import { TableState } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)
console.log('Initial row count:', table.getRowCount()) // 10

// Scenario 1: Row count expands with cell updates
table.updateCell(0, 0, { merge: { rowSpan: 1, colSpan: 1 } })
console.log('After cell at (0,0):', table.getRowCount()) // 10

table.updateCell(20, 0, { merge: { rowSpan: 1, colSpan: 1 } })
console.log('After cell at (20,0):', table.getRowCount()) // 21 (expanded!)

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
safeGetCell(table, 100, 5) // Warning: out of bounds

// Scenario 3: Dense vs sparse iteration
function iterateDense(table: TableState) {
  console.log('Dense iteration (inefficient for sparse tables):')
  let nonEmptyCount = 0
  for (let row = 0; row < table.getRowCount(); row++) {
    for (let col = 0; col < table.getColCount(); col++) {
      const cell = table.getCell(row, col)
      if (cell && !table.cellIsEmpty(cell)) {
        nonEmptyCount++
      }
    }
  }
  console.log(`  Checked ${table.getRowCount() * table.getColCount()} cells`)
  console.log(`  Found ${nonEmptyCount} non-empty cells`)
}

function iterateSparse(table: TableState) {
  console.log('Sparse iteration (efficient):')
  let cellCount = 0
  const data = (table as any)._data
  for (const [row, rowMap] of data) {
    for (const [col, cell] of rowMap) {
      if (!table.cellIsEmpty(cell)) {
        cellCount++
      }
    }
  }
  console.log(`  Checked ${cellCount} cells (only non-empty)`)
}

// Usage
iterateDense(table)
iterateSparse(table)

// Scenario 4: Finding rows with data
function getRowsWithData(table: TableState): number[] {
  const data = (table as any)._data
  return Array.from(data.keys()).sort((a, b) => a - b)
}

// Usage
const rowsWithData = getRowsWithData(table)
console.log('Rows with data:', rowsWithData)

// Scenario 5: Table dimensions helper
function getTableDimensions(table: TableState): { rows: number; cols: number; cells: number } {
  const data = (table as any)._data
  let cellCount = 0

  for (const [, rowMap] of data) {
    cellCount += rowMap.size
  }

  return {
    rows: table.getRowCount(),
    cols: table.getColCount(),
    cells: cellCount,
  }
}

// Usage
const dims = getTableDimensions(table)
console.log(`Table: ${dims.rows}x${dims.cols} with ${dims.cells} cells`)

// Scenario 6: Checking if table is empty
function isTableEmpty(table: TableState): boolean {
  // Virtual dimensions may be non-zero, but check actual data
  const data = (table as any)._data
  return data.size === 0
}

// Usage
const emptyTable = new TableState(100, 100)
console.log('Empty table has rows:', emptyTable.getRowCount()) // 100
console.log('But is actually empty:', isTableEmpty(emptyTable)) // true

// Scenario 7: Finding next available row
function findNextAvailableRow(table: TableState, startRow: number = 0): number {
  const data = (table as any)._data
  const rowsWithData = new Set(data.keys())

  for (let row = startRow; row < table.getRowCount(); row++) {
    if (!rowsWithData.has(row)) {
      return row
    }
  }

  // All rows have data, return next available
  return table.getRowCount()
}

// Usage
const nextRow = findNextAvailableRow(table, 0)
console.log('Next available row:', nextRow)
```

## Related APIs

- `TableState.getColCount()` - Get column count
- `TableState.constructor` - Set initial row count
- `TableState.getCell()` - Access cell data
