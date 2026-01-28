# Cell (Interface)

## Declaration

```typescript
export interface Cell {
  /** Merge information: set when the cell is the top-left (main) cell of a merged region */
  merge?: {
    rowSpan: number // Number of rows spanned (>= 1)
    colSpan: number // Number of columns spanned (>= 1)
  }

  /** Placeholder: set to true when the cell is covered by another merged cell */
  isMergedPlaceholder?: boolean
}
```

## Purpose

Use the `Cell` interface to represent individual cell data in a table. This is the fundamental data structure for tracking cell states, particularly merge relationships.

**When to use:**
- When you need to define cell data with merge or placeholder properties
- When working directly with `TableState` or `WorksheetData`
- When implementing custom command interpreters that manipulate cell data

**When NOT to use:**
- Do NOT create instances of this interface directly for high-level operations—use `TableCommandPlanner` instead
- Do NOT set both `merge` and `isMergedPlaceholder` on the same cell (mutually exclusive)

## Properties

### `merge?: { rowSpan: number; colSpan: number }`

**Purpose:** Indicates this cell is the main (top-left) cell of a merged region.

**Valid values:**
- `rowSpan >= 1` - Number of rows this cell spans (including itself)
- `colSpan >= 1` - Number of columns this cell spans (including itself)
- `rowSpan === 1 && colSpan === 1` - Effectively a non-merged cell

**Common mistakes:**
- Setting `rowSpan` or `colSpan` to 0 or negative values (invalid)
- Setting `merge` on cells that are covered by other merged cells
- Forgetting to mark covered cells as `isMergedPlaceholder: true`

### `isMergedPlaceholder?: boolean`

**Purpose:** Indicates this cell is covered by another merged cell and should not be rendered independently.

**Valid values:**
- `true` - This cell is a placeholder (covered by a merge)
- `undefined` or `false` - This cell is not a placeholder

**Common mistakes:**
- Setting `isMergedPlaceholder: true` on the main merged cell (should use `merge` instead)
- Setting `isMergedPlaceholder: true` without a corresponding main cell with `merge`
- Setting to `false` explicitly (use `undefined` to indicate "not a placeholder")

## Best Practices

1. **Use TableCommandPlanner for merge operations**
   - Never manually set `merge` or `isMergedPlaceholder` when using high-level operations
   - Let `TableCommandPlanner.merge()` and `TableCommandPlanner.unmerge()` handle the complex logic

2. **Maintain consistency**
   - When creating a merged region, exactly one cell should have `merge` and all covered cells should have `isMergedPlaceholder: true`
   - Never leave gaps where covered cells don't have the placeholder flag

3. **Sparse storage optimization**
   - Cells with no properties (empty object `{}`) should be deleted from storage to maintain sparsity
   - Only store cells that have actual data or merge information

4. **Pair with TableState operations**
   - Use `TableState.updateCell()` for partial updates (preserves existing properties)
   - Use `TableState.cellIsEmpty()` to check if a cell has meaningful data

## Error Handling

- **Invalid merge values:** The library does not validate `rowSpan`/`colSpan` values. Ensure they are >= 1 to avoid undefined behavior.
- **Inconsistent state:** If you manually manipulate cells, you may create invalid merge states. Always use `TableCommandPlanner` for merge operations.
- **Placeholder without main cell:** If a cell has `isMergedPlaceholder: true` but no corresponding main cell, rendering may produce unexpected results.

## Complete Example

```typescript
import { TableState, TableCommandPlanner } from '@aptx/table-commands-generator'

// Context: Creating a table with merged header cells
// Setup
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table)

// Scenario 1: Using TableCommandPlanner (RECOMMENDED)
const commands = planner.merge(0, 0, 0, 2) // Merge first row, first 3 columns
if (commands) {
  console.log('Header merged successfully')
}

// The merged cell now has:
// - Cell at (0,0): { merge: { rowSpan: 1, colSpan: 3 } }
// - Cell at (0,1): { isMergedPlaceholder: true }
// - Cell at (0,2): { isMergedPlaceholder: true }

// Scenario 2: Direct cell manipulation (ADVANCED - use with caution)
// Manually creating a 2x2 merged region at (5,5)
table.updateCell(5, 5, { merge: { rowSpan: 2, colSpan: 2 } })
table.updateCell(5, 6, { isMergedPlaceholder: true })
table.updateCell(6, 5, { isMergedPlaceholder: true })
table.updateCell(6, 6, { isMergedPlaceholder: true })

// Verify the merge
const mainCell = table.getCell(5, 5)
console.log(`Main cell spans ${mainCell.merge.rowSpan}x${mainCell.merge.colSpan}`)

// Check covered cells
const placeholderCell = table.getCell(5, 6)
console.log(`Is placeholder: ${placeholderCell.isMergedPlaceholder}`) // true

// Scenario 3: Detecting cell types
function getCellType(cell: Cell | undefined): string {
  if (!cell || Object.keys(cell).length === 0) return 'empty'
  if (cell.merge) return 'merged-main'
  if (cell.isMergedPlaceholder) return 'merged-placeholder'
  return 'normal'
}

const cell0 = table.getCell(0, 0)
console.log(`Cell type: ${getCellType(cell0)}`) // "merged-main"
```
