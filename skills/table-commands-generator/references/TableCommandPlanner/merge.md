# TableCommandPlanner.merge

## Declaration

```typescript
public merge(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): TableCommand[] | undefined
```

## Purpose

Use `merge()` to merge a rectangular region of cells into a single merged cell. If the region contains existing merged cells, they will be automatically unmerged first.

**When to use:**
- When creating merged cell headers (spanning multiple rows/columns)
- When grouping related data visually
- When creating title cells or labels that span multiple cells

**When NOT to use:**
- Do NOT use to merge non-contiguous cells (must be rectangular)
- Do NOT use when the region contains data that should be preserved

## Parameters

### `startRow: number` (required)

Row index of the top-left corner of the merge region.

**Valid values:**
- `>= 0` - Non-negative integer
- Must be <= `endRow`

**Behavior:**
- Defines the first row of the merge region
- This cell becomes the main merged cell

### `startCol: number` (required)

Column index of the top-left corner of the merge region.

**Valid values:**
- `>= 0` - Non-negative integer
- Must be <= `endCol`

**Behavior:**
- Defines the first column of the merge region
- This cell becomes the main merged cell

### `endRow: number` (required)

Row index of the bottom-right corner of the merge region.

**Valid values:**
- `>= startRow` - Must be >= startRow
- Can exceed current table size (table will expand)

**Behavior:**
- Defines the last row of the merge region
- Inclusive: the cell at `endRow` is included in the merge

### `endCol: number` (required)

Column index of the bottom-right corner of the merge region.

**Valid values:**
- `>= startCol` - Must be >= startCol
- Can exceed current table size (table will expand)

**Behavior:**
- Defines the last column of the merge region
- Inclusive: the cell at `endCol` is included in the merge

## Return Value

Returns `TableCommand[] | undefined`:

- `TableCommand[]` - Array of commands to execute the merge (may include unmerge commands for existing merges)
- `undefined` - If the merge region is invalid or no commands needed

**Why undefined?**
- The merge region might already be merged as specified
- The region might be a single cell (startRow === endRow && startCol === endCol) with no existing merge to clear

## Merge Behavior

### Automatic Unmerge of Overlapping Regions

**Key behavior:** If the merge region overlaps with any existing merged cells, those existing merges are automatically cleared first.

**Why automatic unmerge?**
- Ensures consistent merge state
- Prevents nested or overlapping merges
- Simplifies merge operations (no manual cleanup needed)

**Overlap detection:**
```
Two rectangles overlap if:
  NOT (newRegion.endRow < existing.row OR
       newRegion.row > existing.endRow OR
       newRegion.endCol < existing.col OR
       newRegion.col > existing.endCol)
```

**Example of automatic unmerge:**
```typescript
// Existing merge: cell at (1,1) spans 2x2, covers (1,1)-(2,2)
planner.merge(1, 1, 2, 2)

// New merge: region (0,0)-(3,3)
planner.merge(0, 0, 3, 3)

// Generated commands:
// 1. CLEAR_CELL_ATTR (1,1, rowSpan)  // Remove old merge
// 2. CLEAR_CELL_ATTR (1,1, colSpan)  // Remove old merge
// 3. CLEAR_CELL_ATTR (1,2, isMergedPlaceholder) // Remove old placeholder
// 4. CLEAR_CELL_ATTR (2,1, isMergedPlaceholder) // Remove old placeholder
// 5. CLEAR_CELL_ATTR (2,2, isMergedPlaceholder) // Remove old placeholder
// 6. SET_CELL_ATTR (0,0, rowSpan, 4)  // Create new 4x4 merge
// 7. SET_CELL_ATTR (0,0, colSpan, 4)  // Create new 4x4 merge
// 8-15. SET_CELL_ATTR placeholders for all covered cells
```

**What happens to existing merges:**
- Main cell: merge attributes are cleared
- Covered cells: placeholder flags are cleared
- All traces of the old merge are removed
- New merge is created in its place

### Merge Steps

1. **Unmerge existing overlaps**
   - Find all merged cells that overlap the new region
   - Clear their merge attributes and placeholder flags
   - This ensures a clean slate for the new merge

2. **Set main cell spans**
   - The cell at `(startRow, startCol)` gets `rowSpan` and `colSpan` set
   - `rowSpan = endRow - startRow + 1`
   - `colSpan = endCol - startCol + 1`

3. **Mark covered cells**
   - All other cells in the region are marked as `isMergedPlaceholder: true`
   - These cells should not be rendered independently

### Visual Example

**Before merge:**
```
[·] [·] [·] [·]  [·] = empty cell
[·] [M:2×2] [P]  [M] = main merged cell
[P] [P] [·] [·]  [P] = placeholder
```

**Execute `merge(0, 0, 2, 2)`:**
```
// Step 1: Clear existing merge at (1,1)
// Step 2: Create new 3x3 merge at (0,0)
// Step 3: Create placeholders
```

**After merge:**
```
[M:3×3] [P] [P] [·]
[P] [P] [P] [·]
[P] [P] [P] [·]
```

**Note:** The previous 2x2 merge at (1,1) was completely replaced by the new 3x3 merge.

## Best Practices

1. **Validate merge regions**
   - Ensure coordinates are within table bounds (or handle expansion)
   - Check for conflicts with existing merges
   - Validate that startRow <= endRow and startCol <= endCol

2. **Handle undefined return**
   - Always check if commands were generated
   - Undefined doesn't necessarily mean failure
   - May mean the merge already exists

3. **Use with CommandInterpreter**
   - Get commands from `merge()` and execute with interpreter
   - Don't manually manipulate cell data

4. **Consider existing data**
   - Merging will clear any existing merges in the region
   - Decide whether to preserve or replace existing merges

## Common Pitfalls

1. **Not checking for undefined**
   ```typescript
   // BAD: Assumes commands are always generated
   const commands = planner.merge(0, 0, 2, 2)
   interpreter.applyCommands(commands) // May crash if undefined!

   // GOOD: Check return value
   const commands = planner.merge(0, 0, 2, 2)
   if (commands) {
     interpreter.applyCommands(commands)
   }
   ```

2. **Wrong coordinate order**
   ```typescript
   // BAD: startRow > endRow
   planner.merge(5, 0, 2, 2) // Undefined behavior

   // GOOD: startRow <= endRow
   planner.merge(2, 0, 5, 2)
   ```

3. **Forgetting existing merges**
   ```typescript
   // BAD: Doesn't account for existing merges being cleared
   const commands = planner.merge(0, 0, 2, 2)
   // If (1,1) was already merged, that merge is now gone

   // GOOD: Understand that merge() handles cleanup automatically
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter } from '@aptx/table-commands-generator'

// Setup
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table)
const interpreter = new BuildinStateInterpreter(table)

// Scenario 1: Basic 2x2 merge
const commands1 = planner.merge(0, 0, 1, 1)
if (commands1) {
  console.log(`Generated ${commands1.length} commands for 2x2 merge`)
  interpreter.applyCommands(commands1)

  const cell = table.getCell(0, 0)
  console.log('Cell (0,0) merge:', cell?.merge) // { rowSpan: 2, colSpan: 2 }
}

// Scenario 2: Creating a header row (merge first row, 5 columns)
const commands2 = planner.merge(0, 0, 0, 4)
if (commands2) {
  interpreter.applyCommands(commands2)
  console.log('Header merged across 5 columns')
}

// Scenario 3: Merging with conflict handling
// First, create an existing merge
planner.merge(2, 2, 3, 3)
interpreter.applyCommands(planner.getCommands()!)

// Now merge a region that overlaps
const commands3 = planner.merge(1, 1, 4, 4)
if (commands3) {
  console.log(`Generated ${commands3.length} commands (includes unmerge)`)
  interpreter.applyCommands(commands3)
  // The previous merge at (2,2)-(3,3) is automatically cleared
}

// Scenario 4: Merge with validation
function safeMerge(
  planner: TableCommandPlanner,
  interpreter: BuildinStateInterpreter,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): boolean {
  // Validate coordinates
  if (startRow > endRow || startCol > endCol) {
    console.error('Invalid coordinates: start > end')
    return false
  }

  if (startRow < 0 || startCol < 0) {
    console.error('Invalid coordinates: negative values')
    return false
  }

  // Attempt merge
  const commands = planner.merge(startRow, startCol, endRow, endCol)
  if (commands) {
    interpreter.applyCommands(commands)
    console.log(`Merged (${startRow}, ${startCol}) to (${endRow}, ${endCol})`)
    return true
  } else {
    console.log('No commands generated (merge may already exist)')
    return false
  }
}

// Usage
safeMerge(planner, interpreter, 5, 5, 7, 8)

// Scenario 5: Checking merge result
function getMergeInfo(table: TableState, row: number, col: number): {
  isMerged: boolean
  rowSpan: number
  colSpan: number
  isPlaceholder: boolean
} {
  const cell = table.getCell(row, col)

  return {
    isMerged: cell?.merge !== undefined,
    rowSpan: cell?.merge?.rowSpan ?? 1,
    colSpan: cell?.merge?.colSpan ?? 1,
    isPlaceholder: cell?.isMergedPlaceholder === true,
  }
}

// Usage
const info = getMergeInfo(table, 0, 0)
console.log('Cell (0,0) info:', info)
// { isMerged: true, rowSpan: 2, colSpan: 2, isPlaceholder: false }

// Scenario 6: Batch merge operations
function createHeaderMerges(
  planner: TableCommandPlanner,
  interpreter: BuildinStateInterpreter,
  headerRowCount: number,
  colCount: number
): void {
  const allCommands: TableCommand[] = []

  // Merge each header row cell to span full width
  for (let row = 0; row < headerRowCount; row++) {
    const commands = planner.merge(row, 0, row, colCount - 1)
    if (commands) {
      allCommands.push(...commands)
    }
  }

  interpreter.applyCommands(allCommands)
  console.log(`Created ${headerRowCount} header merges`)
}

// Usage
createHeaderMerges(planner, interpreter, 2, 5)

// Scenario 7: Unmerge helper
function unmerge(
  planner: TableCommandPlanner,
  interpreter: BuildinStateInterpreter,
  row: number,
  col: number
): boolean {
  const cell = table.getCell(row, col)

  if (cell?.merge) {
    const commands = planner.unmerge(row, col)
    if (commands) {
      interpreter.applyCommands(commands)
      console.log(`Unmerged cell at (${row}, ${col})`)
      return true
    }
  }

  return false
}
```

## Related APIs

- `TableCommandPlanner.unmerge()` - Unmerge a previously merged cell
- `TableState.getCell()` - Check if a cell is merged
- `TableCommandPlanner.forEachMainMergedCell()` - Iterate over all merged cells
