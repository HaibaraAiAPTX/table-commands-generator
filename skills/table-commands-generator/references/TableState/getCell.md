# TableState.getCell

## Declaration

```typescript
public getCell(row: number, col: number): Cell | undefined
```

## Purpose

Use `getCell()` to retrieve cell data at a specific position. Returns `undefined` if the cell has no data or doesn't exist in the sparse storage.

**When to use:**
- When you need to check if a cell has merge properties
- When reading cell data for rendering or export
- When validating cell state before operations

**When NOT to use:**
- Do NOT use for iteration—use sparse iteration patterns instead
- Do NOT assume a non-undefined return means the cell has meaningful data (check `cellIsEmpty()`)

## Parameters

### `row: number` (required)

Zero-based row index of the cell to retrieve.

**Valid values:**
- `>= 0` - Non-negative integer
- Can exceed current row count (will return `undefined`)

**Common mistakes:**
- Passing negative values (will cause undefined behavior)
- Not validating bounds before access

### `col: number` (required)

Zero-based column index of the cell to retrieve.

**Valid values:**
- `>= 0` - Non-negative integer
- Can exceed current column count (will return `undefined`)

**Common mistakes:**
- Passing negative values (will cause undefined behavior)
- Not validating bounds before access

## Return Value

Returns `Cell | undefined`:

- `Cell` - The cell data if it exists in storage
- `undefined` - If:
  - The cell has never been set
  - The cell was set to empty (all properties cleared)
  - The row/column indices are out of range

**Important:** Even when a `Cell` object is returned, it may be "empty" (no properties). Use `cellIsEmpty()` to check if the cell has meaningful data.

## Best Practices

1. **Always handle undefined returns**
   - The sparse storage means most cells return `undefined`
   - Use optional chaining (`?.`) for safe property access
   - Provide default values when appropriate

2. **Combine with cellIsEmpty() for meaningful checks**
   - A non-undefined cell may still be empty (no properties)
   - Use `cellIsEmpty()` to determine if the cell has actual data

3. **Validate indices before access**
   - Check `row < getRowCount()` and `col < getColCount()` for bounds
   - The library may not validate indices, leading to undefined behavior

4. **Use for individual cell lookups**
   - Efficient for single cell access (O(1) average)
   - For iteration, use sparse iteration patterns over the underlying data

## Common Pitfalls

1. **Not handling undefined**
   ```typescript
   // BAD: Assumes cell exists
   const cell = table.getCell(5, 5)
   console.log(cell.merge?.rowSpan) // May throw if cell is undefined

   // GOOD: Handle undefined
   const cell = table.getCell(5, 5)
   if (cell) {
     console.log(cell.merge?.rowSpan)
   }
   ```

2. **Not distinguishing between undefined and empty**
   ```typescript
   // BAD: Doesn't check if cell is actually empty
   const cell = table.getCell(5, 5)
   if (cell) {
     // Cell might be {} with no properties!
   }

   // GOOD: Use cellIsEmpty()
   const cell = table.getCell(5, 5)
   if (cell && !table.cellIsEmpty(cell)) {
     // Cell has meaningful data
   }
   ```

3. **Using for dense iteration**
   ```typescript
   // BAD: Inefficient for sparse tables
   for (let row = 0; row < table.getRowCount(); row++) {
     for (let col = 0; col < table.getColCount(); col++) {
       const cell = table.getCell(row, col) // Most are undefined
     }
   }

   // GOOD: Use sparse iteration (access internal data directly)
   const data = (table as any)._data
   for (const [row, rowMap] of data) {
     for (const [col, cell] of rowMap) {
       // Only iterates non-empty cells
     }
   }
   ```

## Complete Example

```typescript
import { TableState } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)

// Scenario 1: Safe cell access with default
function getCellMergeInfo(table: TableState, row: number, col: number): string {
  const cell = table.getCell(row, col)

  if (!cell) {
    return 'Cell does not exist'
  }

  if (table.cellIsEmpty(cell)) {
    return 'Cell is empty (no properties)'
  }

  if (cell.merge) {
    return `Merged: ${cell.merge.rowSpan}x${cell.merge.colSpan}`
  }

  if (cell.isMergedPlaceholder) {
    return 'Placeholder cell'
  }

  return 'Normal cell (no merge)'
}

// Usage
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 3 } })
console.log(getCellMergeInfo(table, 0, 0)) // "Merged: 2x3"
console.log(getCellMergeInfo(table, 0, 1)) // "Cell does not exist"
console.log(getCellMergeInfo(table, 5, 5)) // "Cell does not exist"

// Scenario 2: Checking merge status
function isCellMerged(table: TableState, row: number, col: number): boolean {
  const cell = table.getCell(row, col)
  return cell?.merge !== undefined
}

function isCellPlaceholder(table: TableState, row: number, col: number): boolean {
  const cell = table.getCell(row, col)
  return cell?.isMergedPlaceholder === true
}

// Create a 2x2 merged region
table.updateCell(2, 2, { merge: { rowSpan: 2, colSpan: 2 } })
table.updateCell(2, 3, { isMergedPlaceholder: true })
table.updateCell(3, 2, { isMergedPlaceholder: true })
table.updateCell(3, 3, { isMergedPlaceholder: true })

console.log('Is (2,2) merged?', isCellMerged(table, 2, 2)) // true
console.log('Is (2,3) placeholder?', isCellPlaceholder(table, 2, 3)) // true

// Scenario 3: Finding the main cell of a merged region
function getMainCellOfRegion(table: TableState, row: number, col: number): { row: number; col: number } | null {
  // Check if this cell is the main cell
  const cell = table.getCell(row, col)
  if (cell?.merge) {
    return { row, col }
  }

  // If it's a placeholder, search backwards for main cell
  if (cell?.isMergedPlaceholder) {
    // Search in expanding radius for main cell
    for (let r = row; r >= 0; r--) {
      for (let c = col; c >= 0; c--) {
        const testCell = table.getCell(r, c)
        if (testCell?.merge) {
          const { rowSpan, colSpan } = testCell.merge
          // Check if (row, col) is within this merged region
          if (row >= r && row < r + rowSpan && col >= c && col < c + colSpan) {
            return { row: r, col: c }
          }
        }
      }
    }
  }

  return null
}

// Usage
const mainCell = getMainCellOfRegion(table, 2, 3)
console.log('Main cell of placeholder (2,3):', mainCell) // { row: 2, col: 2 }

// Scenario 4: Batch cell access with validation
function getCellsSafely(table: TableState, positions: Array<[number, number]>): Array<Cell | null> {
  return positions.map(([row, col]) => {
    // Validate bounds
    if (row < 0 || row >= table.getRowCount() || col < 0 || col >= table.getColCount()) {
      console.warn(`Cell (${row}, ${col}) is out of bounds`)
      return null
    }

    return table.getCell(row, col) ?? null
  })
}

// Usage
const cells = getCellsSafely(table, [
  [0, 0],
  [2, 2],
  [100, 100], // Out of bounds
])
console.log('Retrieved', cells.filter(c => c !== null).length, 'valid cells')

// Scenario 5: Optimizing with optional chaining
function getCellSpan(table: TableState, row: number, col: number): { rowSpan: number; colSpan: number } {
  const cell = table.getCell(row, col)

  // Use optional chaining and nullish coalescing for safe access
  return {
    rowSpan: cell?.merge?.rowSpan ?? 1,
    colSpan: cell?.merge?.colSpan ?? 1,
  }
}

// Usage
const span = getCellSpan(table, 0, 0)
console.log('Cell (0,0) spans:', span.rowSpan, 'rows and', span.colSpan, 'cols')

const emptySpan = getCellSpan(table, 5, 5)
console.log('Cell (5,5) spans:', emptySpan.rowSpan, 'rows and', emptySpan.colSpan, 'cols') // 1x1 (default)
```

## Related APIs

- `TableState.updateCell()` - Set or modify cell data
- `TableState.cellIsEmpty()` - Check if a cell has meaningful data
- `TableState.getRowCount()` - Get row count for bounds checking
- `TableState.getColCount()` - Get column count for bounds checking
