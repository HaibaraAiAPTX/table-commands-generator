# TableState.cellIsEmpty

## Declaration

```typescript
public cellIsEmpty(cell: Cell): boolean
```

## Purpose

Use `cellIsEmpty()` to check if a cell has no meaningful data. A cell is considered empty if it has no properties (no merge info and is not a placeholder).

**When to use:**
- When distinguishing between "no cell" (undefined) and "empty cell" (Cell with no properties)
- When cleaning up empty cells to maintain sparse storage
- When validating cell state before operations
- When determining if a cell should be deleted from storage

**When NOT to use:**
- Do NOT use to check if a cell exists (use `getCell()` returning `undefined` instead)
- Do NOT use to check if a cell is a placeholder (check `isMergedPlaceholder` directly)

## Parameters

### `cell: Cell` (required)

The cell object to check.

**Valid values:**
- Any `Cell` object (with or without properties)
- Empty object `{}`
- Objects with `merge` property
- Objects with `isMergedPlaceholder` property

**Behavior:**
- Returns `true` if the cell has no properties
- Returns `false` if the cell has any properties

**Common mistakes:**
- Passing `undefined` or `null` (will cause runtime error)
- Not checking if cell exists first

## Return Value

Returns `boolean`:

- `true` - Cell is empty (has no properties)
  - Cell is `{}` (empty object)
  - Cell has no `merge` and no `isMergedPlaceholder`

- `false` - Cell has data
  - Cell has `merge` property
  - Cell has `isMergedPlaceholder: true`

## Best Practices

1. **Always check if cell exists first**
   - `getCell()` may return `undefined`
   - Passing `undefined` to `cellIsEmpty()` will cause error

2. **Use for cleanup operations**
   - After clearing properties, check if cell is empty
   - Empty cells can be deleted to maintain sparsity

3. **Distinguish from undefined**
   - `undefined` = cell doesn't exist in storage
   - Empty cell = cell exists but has no data
   - Non-empty cell = cell has merge or placeholder data

4. **Combine with getCell() for safety**
   - Use optional chaining or explicit null check
   - Provides safe cell state inspection

## Common Pitfalls

1. **Not checking for undefined first**
   ```typescript
   // BAD: Will crash if cell is undefined
   const isEmpty = table.cellIsEmpty(table.getCell(5, 5))

   // GOOD: Check undefined first
   const cell = table.getCell(5, 5)
   const isEmpty = cell ? table.cellIsEmpty(cell) : true
   ```

2. **Confusing empty with undefined**
   ```typescript
   // BAD: Doesn't distinguish between undefined and empty
   if (!table.getCell(5, 5)) {
     // Could be undefined OR empty object
   }

   // GOOD: Explicit check
   const cell = table.getCell(5, 5)
   if (!cell) {
     // Cell doesn't exist
   } else if (table.cellIsEmpty(cell)) {
     // Cell exists but is empty
   } else {
     // Cell has data
   }
   ```

3. **Using for placeholder detection**
   ```typescript
   // BAD: Incorrect way to check for placeholder
   if (!table.cellIsEmpty(cell)) {
     // Could be merge OR placeholder
   }

   // GOOD: Check directly
   if (cell?.isMergedPlaceholder === true) {
     // Definitely a placeholder
   }
   ```

## Complete Example

```typescript
import { TableState, Cell } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)

// Scenario 1: Checking cell states
function describeCell(table: TableState, row: number, col: number): string {
  const cell = table.getCell(row, col)

  if (!cell) {
    return 'Cell does not exist (undefined)'
  }

  if (table.cellIsEmpty(cell)) {
    return 'Cell exists but is empty (no properties)'
  }

  if (cell.merge) {
    return `Cell is merged: ${cell.merge.rowSpan}x${cell.merge.colSpan}`
  }

  if (cell.isMergedPlaceholder) {
    return 'Cell is a placeholder'
  }

  return 'Cell has unknown properties'
}

// Usage
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
table.updateCell(0, 1, { isMergedPlaceholder: true })
table.updateCell(1, 1, {}) // Empty cell

console.log(describeCell(table, 0, 0)) // "Cell is merged: 2x2"
console.log(describeCell(table, 0, 1)) // "Cell is a placeholder"
console.log(describeCell(table, 1, 1)) // "Cell exists but is empty"
console.log(describeCell(table, 5, 5)) // "Cell does not exist"

// Scenario 2: Cleanup empty cells
function cleanupEmptyCells(table: TableState): number {
  const data = (table as any)._data
  let cleaned = 0

  for (const [row, rowMap] of data) {
    for (const [col, cell] of rowMap) {
      if (table.cellIsEmpty(cell)) {
        table.updateCell(row, col, {}) // Remove from storage
        cleaned++
      }
    }
  }

  return cleaned
}

// Usage
table.updateCell(2, 2, {})
table.updateCell(2, 3, {})
const cleaned = cleanupEmptyCells(table)
console.log(`Cleaned up ${cleaned} empty cells`)

// Scenario 3: Safe cell inspection
function getCellInfo(table: TableState, row: number, col: number): {
  exists: boolean
  empty: boolean
  merged: boolean
  placeholder: boolean
} {
  const cell = table.getCell(row, col)

  return {
    exists: cell !== undefined,
    empty: cell ? table.cellIsEmpty(cell) : false,
    merged: cell?.merge !== undefined,
    placeholder: cell?.isMergedPlaceholder === true,
  }
}

// Usage
const info = getCellInfo(table, 0, 0)
console.log('Cell (0,0) info:', info)
// { exists: true, empty: false, merged: true, placeholder: false }

// Scenario 4: Filtering non-empty cells
function getNonEmptyCells(table: TableState): Array<{ row: number; col: number; cell: Cell }> {
  const result: Array<{ row: number; col: number; cell: Cell }> = []
  const data = (table as any)._data

  for (const [row, rowMap] of data) {
    for (const [col, cell] of rowMap) {
      if (!table.cellIsEmpty(cell)) {
        result.push({ row, col, cell })
      }
    }
  }

  return result
}

// Usage
const nonEmpty = getNonEmptyCells(table)
console.log(`Found ${nonEmpty.length} non-empty cells`)
nonEmpty.forEach(({ row, col, cell }) => {
  console.log(`  Cell (${row}, ${col}):`, cell)
})

// Scenario 5: Counting cell types
function countCellTypes(table: TableState): { empty: number; merged: number; placeholder: number } {
  const counts = { empty: 0, merged: 0, placeholder: 0 }
  const data = (table as any)._data

  for (const [, rowMap] of data) {
    for (const [, cell] of rowMap) {
      if (table.cellIsEmpty(cell)) {
        counts.empty++
      } else if (cell.merge) {
        counts.merged++
      } else if (cell.isMergedPlaceholder) {
        counts.placeholder++
      }
    }
  }

  return counts
}

// Usage
const counts = countCellTypes(table)
console.log('Cell type counts:', counts)
// { empty: 1, merged: 1, placeholder: 1 }

// Scenario 6: Validating cell before operation
function safeUpdateCell(table: TableState, row: number, col: number, data: Partial<Cell>): boolean {
  const cell = table.getCell(row, col)

  // Validate: don't set merge on placeholder
  if (cell && !table.cellIsEmpty(cell) && cell.isMergedPlaceholder && data.merge) {
    console.error('Cannot set merge on placeholder cell')
    return false
  }

  table.updateCell(row, col, data)
  return true
}

// Usage
table.updateCell(3, 3, { isMergedPlaceholder: true })
safeUpdateCell(table, 3, 3, { merge: { rowSpan: 1, colSpan: 1 } }) // false (logged error)

// Scenario 7: Finding all empty cells
function findEmptyCells(table: TableState): Array<{ row: number; col: number }> {
  const result: Array<{ row: number; col: number }> = []
  const data = (table as any)._data

  for (const [row, rowMap] of data) {
    for (const [col, cell] of rowMap) {
      if (table.cellIsEmpty(cell)) {
        result.push({ row, col })
      }
    }
  }

  return result
}

// Usage
const emptyCells = findEmptyCells(table)
console.log(`Found ${emptyCells.length} empty cells that can be removed`)
```

## Related APIs

- `TableState.getCell()` - Retrieve cell data
- `TableState.updateCell()` - Modify or clear cell data
