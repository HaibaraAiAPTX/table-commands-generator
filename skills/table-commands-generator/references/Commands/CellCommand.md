# CellCommand (Type)

## Declaration

```typescript
export type CellCommand =
  | {
      type: 'SET_CELL_ATTR'
      row: number
      col: number
      attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder'
      value: number | boolean | undefined
    }
  | {
      type: 'CLEAR_CELL_ATTR'
      row: number
      col: number
      attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder'
    }
```

## Purpose

Use `CellCommand` to represent cell attribute modifications (setting or clearing merge properties). These commands modify individual cell data without changing table structure.

**When to use:**
- When implementing custom `CommandInterpreter` handlers for cell operations
- When tracking cell-level changes for audit logs or synchronization
- When building fine-grained undo/redo functionality

**When NOT to use:**
- Do NOT manually create `CellCommand` objects for high-level merge operations—use `TableCommandPlanner.merge()` instead
- Do NOT use `CellCommand` for structural changes—use `StructuralCommand` instead

## Command Types

### SET_CELL_ATTR

Sets a cell attribute to a specific value.

```typescript
{
  type: 'SET_CELL_ATTR',
  row: number,
  col: number,
  attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
  value: number | boolean | undefined
}
```

**Parameters:**
- `row`: Zero-based row index of the target cell
- `col`: Zero-based column index of the target cell
- `attr`: The attribute to set:
  - `'rowSpan'` - Number of rows spanned by merged cell (value: `number`)
  - `'colSpan'` - Number of columns spanned by merged cell (value: `number`)
  - `'isMergedPlaceholder'` - Whether cell is a placeholder (value: `boolean`)
- `value`: The value to set (number for spans, boolean for placeholder, `undefined` to clear)

**Behavior:**
- Updates only the specified attribute (partial update)
- Other cell attributes remain unchanged
- If `value` is `undefined`, effectively clears the attribute

**Examples:**
```typescript
// Set rowSpan to create a merged cell
const setRowSpan: CellCommand = {
  type: 'SET_CELL_ATTR',
  row: 0,
  col: 0,
  attr: 'rowSpan',
  value: 3,
}

// Set colSpan to create a merged cell
const setColSpan: CellCommand = {
  type: 'SET_CELL_ATTR',
  row: 0,
  col: 0,
  attr: 'colSpan',
  value: 2,
}

// Mark cell as placeholder
const setPlaceholder: CellCommand = {
  type: 'SET_CELL_ATTR',
  row: 0,
  col: 1,
  attr: 'isMergedPlaceholder',
  value: true,
}

// Clear attribute by setting to undefined
const clearAttr: CellCommand = {
  type: 'SET_CELL_ATTR',
  row: 0,
  col: 0,
  attr: 'rowSpan',
  value: undefined,
}
```

### CLEAR_CELL_ATTR

Clears a cell attribute (removes it entirely).

```typescript
{
  type: 'CLEAR_CELL_ATTR',
  row: number,
  col: number,
  attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder'
}
```

**Parameters:**
- `row`: Zero-based row index of the target cell
- `col`: Zero-based column index of the target cell
- `attr`: The attribute to clear:
  - `'rowSpan'` - Remove row span information
  - `'colSpan'` - Remove column span information
  - `'isMergedPlaceholder'` - Remove placeholder flag

**Behavior:**
- Removes the specified attribute from the cell
- Equivalent to `SET_CELL_ATTR` with `value: undefined`
- If cell has no other attributes, it may be deleted from sparse storage

**Examples:**
```typescript
// Clear rowSpan (unmerge vertically)
const clearRowSpan: CellCommand = {
  type: 'CLEAR_CELL_ATTR',
  row: 0,
  col: 0,
  attr: 'rowSpan',
}

// Clear placeholder flag
const clearPlaceholder: CellCommand = {
  type: 'CLEAR_CELL_ATTR',
  row: 0,
  col: 1,
  attr: 'isMergedPlaceholder',
}
```

## Attribute Details

### `rowSpan` (number)

Indicates how many rows a merged cell spans (including itself).

**Valid values:**
- `>= 1` - Number of rows to span
- `undefined` - Cell is not merged vertically

**Common mistakes:**
- Setting to 0 or negative (invalid)
- Setting on placeholder cells (only main cells should have spans)
- Forgetting to set corresponding `colSpan` for 2D merges

### `colSpan` (number)

Indicates how many columns a merged cell spans (including itself).

**Valid values:**
- `>= 1` - Number of columns to span
- `undefined` - Cell is not merged horizontally

**Common mistakes:**
- Setting to 0 or negative (invalid)
- Setting on placeholder cells (only main cells should have spans)
- Forgetting to set corresponding `rowSpan` for 2D merges

### `isMergedPlaceholder` (boolean)

Indicates whether a cell is covered by a merged cell.

**Valid values:**
- `true` - Cell is a placeholder (covered by another cell's merge)
- `undefined` - Cell is not a placeholder

**Common mistakes:**
- Setting to `false` explicitly (use `undefined` instead)
- Setting on the main merged cell (should use spans instead)
- Setting without corresponding main cell with spans

## Best Practices

1. **Always use TableCommandPlanner for merge operations**
   - Manual cell command creation is complex and error-prone
   - `TableCommandPlanner.merge()` generates complete, consistent command sequences
   - Manual creation requires careful handling of all covered cells

2. **Maintain merge consistency**
   - When creating a merged region:
     - Main cell (top-left) gets `rowSpan` and `colSpan`
     - All covered cells get `isMergedPlaceholder: true`
   - When unmerging, clear all related attributes

3. **Validate before execution**
   - Ensure `row` and `col` are within table bounds
   - Validate `rowSpan` and `colSpan` are >= 1
   - Check for conflicts with existing merges

4. **Prefer CLEAR_CELL_ATTR for removing attributes**
   - More explicit intent than `SET_CELL_ATTR` with `undefined`
   - Clearer code for maintenance

## Common Pitfalls

1. **Incomplete merge commands**
   ```typescript
   // BAD: Only sets rowSpan, doesn't handle covered cells
   const badMerge: CellCommand = {
     type: 'SET_CELL_ATTR',
     row: 0,
     col: 0,
     attr: 'rowSpan',
     value: 2,
   }

   // GOOD: Use TableCommandPlanner which generates complete commands
   const commands = planner.merge(0, 0, 1, 0) // Returns 2 commands
   ```

2. **Setting spans on placeholder cells**
   ```typescript
   // BAD: Placeholder shouldn't have spans
   const bad: CellCommand = {
     type: 'SET_CELL_ATTR',
     row: 0,
     col: 1, // This is a placeholder cell
     attr: 'rowSpan',
     value: 2, // Invalid!
   }

   // GOOD: Only main cells have spans
   const good: CellCommand = {
     type: 'SET_CELL_ATTR',
     row: 0,
     col: 0, // Main cell
     attr: 'rowSpan',
     value: 2,
   }
   ```

3. **Forgetting to mark covered cells**
   ```typescript
   // BAD: Creates merged cell but doesn't mark covered cells
   const cmd1: CellCommand = {
     type: 'SET_CELL_ATTR',
     row: 0,
     col: 0,
     attr: 'rowSpan',
     value: 2,
   }
   const cmd2: CellCommand = {
     type: 'SET_CELL_ATTR',
     row: 0,
     col: 0,
     attr: 'colSpan',
     value: 2,
   }
   // Missing: cells at (0,1), (1,0), (1,1) should be placeholders!

   // GOOD: Use TableCommandPlanner
   const commands = planner.merge(0, 0, 1, 1)
   // Returns 6 commands: 2 SET for main cell, 4 SET for placeholders
   ```

## Complete Example

```typescript
import {
  TableState,
  TableCommandPlanner,
  BuildinStateInterpreter,
  CellCommand
} from '@aptx/table-commands-generator'

// Context: Implementing cell-level audit logging
// Setup
const table = new TableState(10, 10)
const interpreter = new BuildinStateInterpreter(table)
const planner = new TableCommandPlanner(table)

// Audit log for tracking changes
interface AuditEntry {
  timestamp: number
  command: CellCommand
  user: string
}

const auditLog: AuditEntry[] = []

function executeWithAudit(cmd: CellCommand, user: string): void {
  // Log before execution
  auditLog.push({
    timestamp: Date.now(),
    command: cmd,
    user,
  })

  // Execute
  interpreter.applyCommand(cmd)
}

// Scenario 1: Manually creating a 2x2 merge (ADVANCED)
// This demonstrates what TableCommandPlanner.merge() does internally
function manualMerge2x2(startRow: number, startCol: number): void {
  const commands: CellCommand[] = [
    // Main cell: set spans
    {
      type: 'SET_CELL_ATTR',
      row: startRow,
      col: startCol,
      attr: 'rowSpan',
      value: 2,
    },
    {
      type: 'SET_CELL_ATTR',
      row: startRow,
      col: startCol,
      attr: 'colSpan',
      value: 2,
    },
    // Covered cells: mark as placeholders
    {
      type: 'SET_CELL_ATTR',
      row: startRow,
      col: startCol + 1,
      attr: 'isMergedPlaceholder',
      value: true,
    },
    {
      type: 'SET_CELL_ATTR',
      row: startRow + 1,
      col: startCol,
      attr: 'isMergedPlaceholder',
      value: true,
    },
    {
      type: 'SET_CELL_ATTR',
      row: startRow + 1,
      col: startCol + 1,
      attr: 'isMergedPlaceholder',
      value: true,
    },
  ]

  commands.forEach(cmd => executeWithAudit(cmd, 'admin'))
}

// Scenario 2: Using TableCommandPlanner (RECOMMENDED)
function smartMerge2x2(startRow: number, startCol: number): void {
  const commands = planner.merge(startRow, startCol, startRow + 1, startCol + 1)

  if (commands) {
    commands
      .filter((cmd): cmd is CellCommand =>
        cmd.type === 'SET_CELL_ATTR' || cmd.type === 'CLEAR_CELL_ATTR'
      )
      .forEach(cmd => executeWithAudit(cmd, 'admin'))
  }
}

// Execute both methods
manualMerge2x2(0, 0)
console.log('Manual merge audit log:', auditLog.length, 'entries')

smartMerge2x2(3, 3)
console.log('Smart merge audit log:', auditLog.length, 'entries total')

// Scenario 3: Unmerge by clearing attributes
function unmergeCell(row: number, col: number): void {
  const cell = table.getCell(row, col)

  if (cell?.merge) {
    const { rowSpan, colSpan } = cell.merge
    const commands: CellCommand[] = []

    // Clear main cell spans
    commands.push(
      { type: 'CLEAR_CELL_ATTR', row, col, attr: 'rowSpan' },
      { type: 'CLEAR_CELL_ATTR', row, col, attr: 'colSpan' }
    )

    // Clear placeholder flags from covered cells
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (r !== row || c !== col) {
          commands.push({
            type: 'CLEAR_CELL_ATTR',
            row: r,
            col: c,
            attr: 'isMergedPlaceholder',
          })
        }
      }
    }

    commands.forEach(cmd => executeWithAudit(cmd, 'admin'))
  }
}

// Unmerge the manually created merge
unmergeCell(0, 0)
console.log('After unmerge, audit log:', auditLog.length, 'entries')

// Scenario 4: Query audit log
function getUserChanges(user: string): CellCommand[] {
  return auditLog
    .filter(entry => entry.user === user)
    .map(entry => entry.command)
}

const adminChanges = getUserChanges('admin')
console.log(`Admin made ${adminChanges.length} cell changes`)
```

## Related Types

- `TableCommand` - Union type including `StructuralCommand` and `CellCommand`
- `StructuralCommand` - See `references/Commands/StructuralCommand.md`
- `Cell` - See `references/DataStructure/Cell.md`
