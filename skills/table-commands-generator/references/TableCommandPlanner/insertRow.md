# TableCommandPlanner.insertRow

## Declaration

```typescript
public insertRow(r: number, count = 1): TableCommand[] | undefined
```

## Purpose

Use `insertRow()` to insert rows at a specified position with automatic merged cell adjustment. The method generates commands that properly extend merged cells affected by the insertion.

**When to use:**
- When inserting rows in a table with merged cells
- When you need proper handling of row spans during insertion
- When generating commands for replay or recording

**When NOT to use:**
- Do NOT use for simple row insertion without merged cells (consider direct state manipulation)
- Do NOT assume merged cells will remain unchanged (they are automatically adjusted)

## Parameters

### `r: number` (required)

Zero-based row index where insertion should occur.

**Valid values:**
- `>= 0` - Non-negative integer
- Can be at or beyond current row count (appends to end)

**Common mistakes:**
- Not validating bounds before insertion
- Confusing 1-based indexing with 0-based

### `count: number = 1` (optional)

Number of rows to insert.

**Valid values:**
- `>= 1` - Positive integer

**Common mistakes:**
- Passing 0 or negative values (invalid)
- Not scaling merge adjustments for large counts

## Return Value

Returns `TableCommand[] | undefined`:

- `TableCommand[]` - Array of commands to execute the insertion
- `undefined` - If:
  - Insertion position is invalid
  - No commands need to be generated
  - Internal state is inconsistent

**Command sequence:**
1. `INSERT_ROW` - Structural insertion
2. `SET_CELL_ATTR` (rowSpan) - Extend merged cells
3. `SET_CELL_ATTR` (isMergedPlaceholder) - Mark new covered cells

## Merged Cell Adjustment Rules

**Automatic Extension Rule:**

When a merged cell satisfies:
```
mainCell.row < insertionPoint <= mainCell.row + mainCell.rowSpan - 1
```

Then:
```
mainCell.rowSpan += count
```

**Example:**
```typescript
// Merged cell at (0, 0) spans 2 rows: rowSpan=2, covers rows 0-1
// Insert 1 row at position 1
// Result: rowSpan=3, covers rows 0-2

// Before insertion:
// [M:2×2] [P]
// [P]     [P]

// After insertRow(1, 1):
// [M:3×2] [P]
// [P]     [P]  <- New row
// [P]     [P]  <- Shifted down
```

**Placeholder Creation:**

For each merged cell that spans the insertion point, placeholder cells are created for the newly inserted rows.

**Does NOT affect:**
- Merged cells completely above the insertion point
- Merged cells completely below the insertion point (they shift down)

## Best Practices

1. **Validate insertion point**
   - Check that `r` is within valid bounds
   - Consider whether to append vs insert at specific position

2. **Handle undefined return**
   - Check for `undefined` before using commands
   - May indicate no-op or invalid state

3. **Understand merge adjustments**
   - Merged cells are automatically extended
   - No manual intervention needed
   - Placeholders are created automatically

4. **Batch multiple insertions**
   - Use `autoClear: false` for multiple insertions
   - Execute all commands together for efficiency

## Common Pitfalls

1. **Not checking for undefined**
   ```typescript
   // BAD: Assumes commands always returned
   const commands = planner.insertRow(5, 1)
   interpreter.applyCommands(commands) // May fail if undefined

   // GOOD: Check for undefined
   const commands = planner.insertRow(5, 1)
   if (commands) {
     interpreter.applyCommands(commands)
   }
   ```

2. **Expecting merged cells to remain unchanged**
   ```typescript
   // BAD: Assumes merged cells stay same size
   planner.merge(0, 0, 1, 0) // 2×1 merge
   planner.insertRow(1, 1)
   // Expects 2×1 merge, but it's now 3×1!

   // GOOD: Understand automatic extension
   planner.merge(0, 0, 1, 0) // 2×1 merge
   planner.insertRow(1, 1)
   // Result: 3×1 merge (automatically extended)
   ```

3. **Multiple insertions with autoClear enabled**
   ```typescript
   // BAD: Only last insertion's commands are kept
   const planner = new TableCommandPlanner(table) // autoClear = true
   planner.insertRow(5, 1)
   planner.insertRow(6, 1)
   const commands = planner.getCommands() // Only insertRow(6, 1)!

   // GOOD: Disable autoClear for batch operations
   const planner = new TableCommandPlanner(table, { autoClear: false })
   planner.insertRow(5, 1)
   planner.insertRow(6, 1)
   const commands = planner.getCommands() // Both insertions!
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table)
const interpreter = new BuildinStateInterpreter(table)

// Scenario 1: Basic insertion with merge adjustment
// Create a merged cell spanning rows 0-1
planner.merge(0, 0, 1, 0)
const mergeCommands = planner.getCommands()
interpreter.applyCommands(mergeCommands)
console.log('After merge: Cell (0,0) spans', table.getCell(0, 0)?.merge?.rowSpan, 'rows') // 2

// Insert a row in the middle of the merge
const insertCommands = planner.insertRow(1, 1)
if (insertCommands) {
  console.log('Generated commands:', insertCommands.length)
  // Commands: INSERT_ROW, SET_CELL_ATTR(rowSpan), SET_CELL_ATTR(placeholder)
  interpreter.applyCommands(insertCommands)
}

console.log('After insert: Cell (0,0) spans', table.getCell(0, 0)?.merge?.rowSpan, 'rows') // 3 (extended!)

// Scenario 2: Insertion without affecting merges
// Insert at row 5 (below the merge at rows 0-2)
const commands2 = planner.insertRow(5, 2)
if (commands2) {
  interpreter.applyCommands(commands2)
}
console.log('Merge at (0,0) unchanged:', table.getCell(0, 0)?.merge?.rowSpan) // Still 3

// Scenario 3: Batch insertions
const table2 = new TableState(10, 10)
const planner2 = new TableCommandPlanner(table2, { autoClear: false })

// Create initial structure
planner2.merge(0, 0, 2, 2)
const initCommands = planner2.getNewCommandsAndReset()
if (initCommands) {
  const interp2 = new BuildinStateInterpreter(table2)
  interp2.applyCommands(initCommands)
}

// Perform multiple insertions
planner2.insertRow(1, 1) // Inside merge - will extend it
planner2.insertRow(5, 2) // Below merge - no effect on merge
planner2.insertRow(0, 1) // Above merge - no effect on merge

const allCommands = planner2.getCommands()
console.log(`Generated ${allCommands.length} commands for 3 insertions`)

// Scenario 4: Checking merge impact before insertion
function willAffectMerge(
  planner: TableCommandPlanner,
  insertRow: number
): boolean {
  let affected = false

  planner.forEachMainMergedCell(info => {
    const mergeEndRow = info.row + info.rowSpan - 1

    // Check if insertion point is within or at merge boundary
    if (info.row < insertRow && insertRow <= mergeEndRow) {
      affected = true
    }
  })

  return affected
}

// Usage
const table3 = new TableState(10, 10)
const planner3 = new TableCommandPlanner(table3)
planner3.merge(0, 0, 2, 2)

if (willAffectMerge(planner3, 1)) {
  console.log('Inserting at row 1 will extend the merge')
}

if (!willAffectMerge(planner3, 5)) {
  console.log('Inserting at row 5 will not affect the merge')
}

// Scenario 5: Inserting with validation
function safeInsertRow(
  planner: TableCommandPlanner,
  interpreter: BuildinStateInterpreter,
  row: number,
  count: number
): boolean {
  // Validate parameters
  if (row < 0 || count < 1) {
    console.error('Invalid parameters: row must be >= 0, count must be >= 1')
    return false
  }

  // Check bounds
  const table = (planner as any).core
  if (row > table.getRowCount()) {
    console.warn(`Row ${row} is beyond table bounds, appending to end`)
  }

  // Insert
  const commands = planner.insertRow(row, count)
  if (!commands) {
    console.error('Failed to generate commands')
    return false
  }

  interpreter.applyCommands(commands)
  console.log(`Successfully inserted ${count} row(s) at position ${row}`)
  return true
}

// Usage
const table4 = new TableState(10, 10)
const planner4 = new TableCommandPlanner(table4)
const interpreter4 = new BuildinStateInterpreter(table4)

safeInsertRow(planner4, interpreter4, 5, 2) // true
safeInsertRow(planner4, interpreter4, -1, 1) // false - invalid
```

## Related APIs

- `TableCommandPlanner.deleteRow()` - Delete rows with merge adjustment
- `TableCommandPlanner.insertCol()` - Insert columns (symmetric behavior)
- `TableCommandPlanner.merge()` - Create merged cells
