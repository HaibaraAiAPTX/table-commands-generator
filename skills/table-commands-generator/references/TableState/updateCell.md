# TableState.updateCell

## Declaration

```typescript
public updateCell(
  row: number,
  col: number,
  partialData: Partial<Cell>
): void
```

## Purpose

Use `updateCell()` to modify cell data at a specific position using partial updates. This method merges the provided data with existing cell data, and automatically removes cells that become empty to maintain sparse storage.

**When to use:**
- When setting cell merge properties (`rowSpan`, `colSpan`)
- When marking cells as placeholders
- When clearing specific cell attributes
- When modifying existing cell data without replacing it entirely

**When NOT to use:**
- Do NOT use for high-level merge operations—use `TableCommandPlanner.merge()` instead
- Do NOT use when you need to completely replace cell data (though partial update usually suffices)

## Parameters

### `row: number` (required)

Zero-based row index of the cell to update.

**Valid values:**
- `>= 0` - Non-negative integer
- Can exceed current row count (table will expand)

**Behavior:**
- If row doesn't exist, it will be created
- Table dimensions automatically expand if needed

**Common mistakes:**
- Passing negative values (undefined behavior)

### `col: number` (required)

Zero-based column index of the cell to update.

**Valid values:**
- `>= 0` - Non-negative integer
- Can exceed current column count (table will expand)

**Behavior:**
- If column doesn't exist, it will be created
- Table dimensions automatically expand if needed

**Common mistakes:**
- Passing negative values (undefined behavior)

### `partialData: Partial<Cell>` (required)

Partial cell data to merge with existing cell data.

**Valid properties:**
- `merge?: { rowSpan: number; colSpan: number }` - Set or update merge info
- `isMergedPlaceholder?: boolean` - Set or clear placeholder flag

**Behavior:**
- Performs a **partial update**: merges with existing data
- Properties not specified remain unchanged
- Properties set to `undefined` are removed
- If cell becomes empty (no properties), it's deleted from storage

**Common mistakes:**
- Setting both `merge` and `isMergedPlaceholder` on the same cell (invalid state)
- Forgetting to mark covered cells as placeholders when creating merges
- Setting `merge` on placeholder cells

## Return Value

Returns `void` (no return value).

**Side effects:**
- Updates the cell data in place
- May expand table dimensions if `row`/`col` exceed current bounds
- May delete the cell from storage if it becomes empty
- Triggers no events or callbacks (pure state update)

## Best Practices

1. **Use TableCommandPlanner for merge operations**
   - Manual merge cell creation is complex and error-prone
   - `TableCommandPlanner.merge()` handles all cells in the merged region
   - Only use `updateCell()` directly for low-level operations

2. **Use undefined to clear properties**
   - Set properties to `undefined` to remove them
   - This maintains sparsity by deleting empty cells

3. **Understand partial update semantics**
   - Only specified properties are updated
   - Existing properties not mentioned are preserved
   - Use `getCell()` first if you need to replace entirely

4. **Validate merge consistency**
   - When creating merges, ensure covered cells are marked as placeholders
   - When unmerging, clear all related properties
   - Inconsistent merge states cause rendering issues

## Common Pitfalls

1. **Incomplete merge creation**
   ```typescript
   // BAD: Only sets main cell, doesn't mark covered cells
   table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
   // Cells at (0,1), (1,0), (1,1) are not marked as placeholders!

   // GOOD: Use TableCommandPlanner
   const commands = planner.merge(0, 0, 1, 1)
   if (commands) interpreter.applyCommands(commands)

   // Or manually mark all covered cells
   table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
   table.updateCell(0, 1, { isMergedPlaceholder: true })
   table.updateCell(1, 0, { isMergedPlaceholder: true })
   table.updateCell(1, 1, { isMergedPlaceholder: true })
   ```

2. **Conflicting merge and placeholder**
   ```typescript
   // BAD: Cell has both merge and placeholder (invalid)
   table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
   table.updateCell(0, 0, { isMergedPlaceholder: true })
   // This cell is now in an invalid state

   // GOOD: Only main cells have merge, covered cells have placeholder
   table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
   table.updateCell(0, 1, { isMergedPlaceholder: true })
   ```

3. **Not using undefined to clear**
   ```typescript
   // BAD: Leaves empty object in storage
   table.updateCell(0, 0, {})

   // GOOD: Clears specific property
   table.updateCell(0, 0, { merge: undefined })

   // Or clear all (cell is deleted)
   table.updateCell(0, 0, { merge: undefined, isMergedPlaceholder: undefined })
   ```

## Complete Example

```typescript
import { TableState } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)

// Scenario 1: Setting merge properties
// Create a 2x3 merged cell
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 3 } })
console.log('Cell (0,0) merge:', table.getCell(0, 0)?.merge) // { rowSpan: 2, colSpan: 3 }

// Scenario 2: Partial update - modify only rowSpan
table.updateCell(0, 0, { merge: { rowSpan: 3, colSpan: 3 } })
// colSpan was already 3, rowSpan updated to 3
console.log('Updated merge:', table.getCell(0, 0)?.merge) // { rowSpan: 3, colSpan: 3 }

// Scenario 3: Clearing specific properties
// Clear only rowSpan (keep colSpan)
table.updateCell(0, 0, { merge: { rowSpan: undefined, colSpan: 3 } })
// Note: This results in merge: { colSpan: 3 } which is valid

// Scenario 4: Marking placeholders
// Mark covered cells as placeholders
table.updateCell(0, 1, { isMergedPlaceholder: true })
table.updateCell(0, 2, { isMergedPlaceholder: true })
table.updateCell(1, 0, { isMergedPlaceholder: true })
table.updateCell(1, 1, { isMergedPlaceholder: true })
table.updateCell(1, 2, { isMergedPlaceholder: true })
table.updateCell(2, 0, { isMergedPlaceholder: true })
table.updateCell(2, 1, { isMergedPlaceholder: true })
table.updateCell(2, 2, { isMergedPlaceholder: true })

console.log('Cell (0,1) is placeholder:', table.getCell(0, 1)?.isMergedPlaceholder) // true

// Scenario 5: Unmerging by clearing all properties
function unmergeCell(table: TableState, row: number, col: number): void {
  const cell = table.getCell(row, col)

  if (cell?.merge) {
    const { rowSpan, colSpan } = cell.merge

    // Clear main cell merge
    table.updateCell(row, col, { merge: undefined })

    // Clear all placeholder flags
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (r !== row || c !== col) {
          table.updateCell(r, c, { isMergedPlaceholder: undefined })
        }
      }
    }
  }
}

// Usage
unmergeCell(table, 0, 0)
console.log('After unmerge, cell (0,0):', table.getCell(0, 0)) // undefined (deleted)

// Scenario 6: Batch update helper
function updateCells(table: TableState, updates: Array<{ row: number; col: number; data: Partial<Cell> }>): void {
  updates.forEach(({ row, col, data }) => {
    table.updateCell(row, col, data)
  })
}

// Usage
updateCells(table, [
  { row: 5, col: 5, data: { merge: { rowSpan: 1, colSpan: 1 } } },
  { row: 5, col: 6, data: { isMergedPlaceholder: true } },
])

// Scenario 7: Safe update with validation
function safeUpdateCell(table: TableState, row: number, col: number, data: Partial<Cell>): boolean {
  // Validate indices
  if (row < 0 || col < 0) {
    console.error('Invalid indices: negative values')
    return false
  }

  // Validate data consistency
  if (data.merge && data.isMergedPlaceholder) {
    console.error('Invalid: cell cannot have both merge and placeholder')
    return false
  }

  table.updateCell(row, col, data)
  return true
}

// Usage
safeUpdateCell(table, 0, 0, { merge: { rowSpan: 2, colSpan: 2 } }) // true
safeUpdateCell(table, 0, 0, { isMergedPlaceholder: true }) // false (logged error)

// Scenario 8: Expand-and-collapse pattern
function toggleMerge(table: TableState, row: number, col: number, rowSpan: number, colSpan: number): void {
  const cell = table.getCell(row, col)

  if (cell?.merge) {
    // Already merged - unmerge
    unmergeCell(table, row, col)
    console.log(`Unmerged cell at (${row}, ${col})`)
  } else {
    // Not merged - create new merge
    table.updateCell(row, col, { merge: { rowSpan, colSpan } })

    // Mark covered cells
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (r !== row || c !== col) {
          table.updateCell(r, c, { isMergedPlaceholder: true })
        }
      }
    }
    console.log(`Merged cell at (${row}, ${col}) to ${rowSpan}x${colSpan}`)
  }
}

// Usage
toggleMerge(table, 3, 3, 2, 2) // Merges (3,3) to (4,4)
toggleMerge(table, 3, 3, 2, 2) // Unmerges
```

## Related APIs

- `TableState.getCell()` - Retrieve cell data before updating
- `TableState.cellIsEmpty()` - Check if a cell is empty
- `TableCommandPlanner.merge()` - High-level merge operations
