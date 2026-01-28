# TableState - constructor

## Declaration

```typescript
constructor(initialRows: number = 0, initialCols: number = 0)
```

## Purpose

Use the `TableState` constructor to create a new table instance with sparse storage. The table uses a Map-based data structure that only stores cells with actual data, making it memory-efficient for sparse tables.

**When to use:**
- When creating a new table from scratch
- When initializing a table with specific dimensions
- When you need a table with automatic sparse storage management

**When NOT to use:**
- Do NOT create multiple instances for the same logical table—share the instance
- Do NOT create tables with extremely large dimensions unless you have sparse data

## Parameters

### `initialRows: number = 0` (optional)

The initial number of rows for the table.

**Valid values:**
- `>= 0` - Non-negative integer
- `0` - Creates an empty table with no rows

**Behavior:**
- Sets the virtual row boundary (affects `getRowCount()`)
- Does NOT pre-allocate memory for all rows (sparse storage)
- The table will automatically expand as cells are added beyond this boundary

**Common mistakes:**
- Passing negative values (will cause unexpected behavior)
- Assuming this pre-allocates memory (it doesn't due to sparse storage)
- Setting this too large unnecessarily (keep it to your expected max)

### `initialCols: number = 0` (optional)

The initial number of columns for the table.

**Valid values:**
- `>= 0` - Non-negative integer
- `0` - Creates an empty table with no columns

**Behavior:**
- Sets the virtual column boundary (affects `getColCount()`)
- Does NOT pre-allocate memory for all columns (sparse storage)
- The table will automatically expand as cells are added beyond this boundary

**Common mistakes:**
- Passing negative values (will cause unexpected behavior)
- Assuming this pre-allocates memory (it doesn't due to sparse storage)
- Setting this too large unnecessarily (keep it to your expected max)

## Return Value

Returns a new `TableState` instance initialized with the specified dimensions.

The instance starts with:
- No cell data (empty sparse storage)
- Virtual boundaries set to `initialRows` and `initialCols`
- Ready for cell operations via `updateCell()`, `getCell()`, etc.

## Best Practices

1. **Set realistic initial dimensions**
   - Use your expected working area, not the maximum possible size
   - The table will expand automatically as needed
   - Smaller initial values have no performance impact due to sparse storage

2. **Use zero for dynamic sizing**
   - If you don't know the size upfront, use `new TableState()`
   - Let the table grow organically as you add cells
   - Dimensions are tracked automatically

3. **Consider your use case**
   - For spreadsheet-like data: Use realistic row/column counts
   - For dynamic forms: Start small and let it grow
   - For fixed grids: Set exact dimensions

4. **Share instances properly**
   - Create one `TableState` instance per logical table
   - Share it between `TableCommandPlanner` and `BuildinStateInterpreter`
   - Do NOT create multiple instances for the same data

## Common Pitfalls

1. **Assuming pre-allocated memory**
   ```typescript
   // BAD: Assumes memory is pre-allocated
   const table = new TableState(10000, 10000)
   // This does NOT use 10000*10000 memory due to sparse storage

   // GOOD: Understand it's just a boundary
   const table = new TableState(10000, 10000)
   // Only cells with data are stored
   table.updateCell(5, 5, { merge: { rowSpan: 2, colSpan: 2 } })
   // Only 4 cells are actually stored, not 100 million
   ```

2. **Creating unnecessary instances**
   ```typescript
   // BAD: Creates multiple instances for the same table
   const planner = new TableCommandPlanner(new TableState(10, 10))
   const interpreter = new BuildinStateInterpreter(new TableState(10, 10))
   // These are two different tables!

   // GOOD: Share the instance
   const table = new TableState(10, 10)
   const planner = new TableCommandPlanner(table)
   const interpreter = new BuildinStateInterpreter(table)
   ```

3. **Negative dimensions**
   ```typescript
   // BAD: Negative dimensions
   const table = new TableState(-1, 10) // Undefined behavior

   // GOOD: Always non-negative
   const table = new TableState(0, 10) or new TableState(10, 10)
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter } from '@aptx/table-commands-generator'

// Scenario 1: Empty table that grows dynamically
// Setup
const dynamicTable = new TableState()
console.log('Initial rows:', dynamicTable.getRowCount()) // 0
console.log('Initial cols:', dynamicTable.getColCount()) // 0

// Add cells far out - table expands automatically
dynamicTable.updateCell(100, 50, { merge: { rowSpan: 1, colSpan: 1 } })
console.log('After add, rows:', dynamicTable.getRowCount()) // 101
console.log('After add, cols:', dynamicTable.getColCount()) // 51

// Scenario 2: Fixed-size spreadsheet
// Setup
const spreadsheet = new TableState(1000, 26) // 1000 rows, 26 columns (A-Z)
const planner = new TableCommandPlanner(spreadsheet)
const interpreter = new BuildinStateInterpreter(spreadsheet)

// Perform operations
const mergeCmds = planner.merge(0, 0, 0, 2) // Merge header row
if (mergeCmds) {
  interpreter.applyCommands(mergeCmds)
}

console.log('Spreadsheet size:', spreadsheet.getRowCount(), 'x', spreadsheet.getColCount())

// Scenario 3: Creating a table with initial merged cells
// Setup
const table = new TableState(5, 5)

// Create a 2x3 merged cell at (0,0)
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 3 } })
table.updateCell(0, 1, { isMergedPlaceholder: true })
table.updateCell(0, 2, { isMergedPlaceholder: true })
table.updateCell(1, 1, { isMergedPlaceholder: true })
table.updateCell(1, 2, { isMergedPlaceholder: true })

// Verify the merge
const mainCell = table.getCell(0, 0)
console.log('Main cell merge:', mainCell.merge) // { rowSpan: 2, colSpan: 3 }

const placeholder = table.getCell(0, 1)
console.log('Is placeholder:', placeholder.isMergedPlaceholder) // true

// Scenario 4: Copying a table (shallow copy of structure)
function createTableCopy(original: TableState): TableState {
  // Get original dimensions
  const rows = original.getRowCount()
  const cols = original.getColCount()

  // Create new table with same dimensions
  const copy = new TableState(rows, cols)

  // Copy cell data (deep copy for each cell)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = original.getCell(row, col)
      if (cell && !original.cellIsEmpty(cell)) {
        copy.updateCell(row, col, { ...cell })
      }
    }
  }

  return copy
}

// Usage
const original = new TableState(10, 10)
original.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })

const copy = createTableCopy(original)
console.log('Copy has same data:', copy.getCell(0, 0)?.merge?.rowSpan) // 2

// Scenario 5: Resetting a table while preserving dimensions
function clearTableData(table: TableState): void {
  const rows = table.getRowCount()
  const cols = table.getColCount()

  // Clear all cells by updating with empty objects
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = table.getCell(row, col)
      if (cell) {
        table.updateCell(row, col, {})
      }
    }
  }
}

// Usage
const table = new TableState(5, 5)
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })

clearTableData(table)
console.log('After clear, cell at (0,0):', table.getCell(0, 0)) // undefined
```

## Related APIs

- `TableState.updateCell()` - Add or modify cells after creation
- `TableState.getCell()` - Retrieve cell data
- `TableState.getRowCount()` - Get current row count
- `TableState.getColCount()` - Get current column count
