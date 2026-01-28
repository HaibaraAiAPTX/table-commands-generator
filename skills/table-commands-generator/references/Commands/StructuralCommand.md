# StructuralCommand (Type)

## Declaration

```typescript
export type StructuralCommand =
  | { type: 'INSERT_ROW'; index: number; count: number }
  | { type: 'DELETE_ROW'; index: number; count: number }
  | { type: 'INSERT_COL'; index: number; count: number }
  | { type: 'DELETE_COL'; index: number; count: number }
```

## Purpose

Use `StructuralCommand` to represent table structure modifications (inserting or deleting rows and columns). These commands change the table's dimensions and may affect merged cells.

**When to use:**
- When implementing custom `CommandInterpreter` handlers for structural operations
- When analyzing or logging structural changes
- When building undo/redo functionality for structural operations

**When NOT to use:**
- Do NOT manually create `StructuralCommand` objects for high-level operations—use `TableCommandPlanner` instead
- Do NOT execute structural commands directly without considering merged cell impacts

## Command Types

### INSERT_ROW

Inserts new rows at the specified index.

```typescript
{ type: 'INSERT_ROW', index: number, count: number }
```

**Behavior:**
- Inserts `count` rows starting at position `index`
- Existing rows at and after `index` are shifted down
- Merged cells spanning the insertion position are automatically expanded

**Parameters:**
- `index`: Zero-based row index where insertion occurs (0 to current row count)
- `count`: Number of rows to insert (must be >= 1)

**Example:**
```typescript
// Insert 2 rows at position 3
const cmd: StructuralCommand = {
  type: 'INSERT_ROW',
  index: 3,
  count: 2,
}
```

### DELETE_ROW

Deletes rows at the specified index.

```typescript
{ type: 'DELETE_ROW', index: number, count: number }
```

**Behavior:**
- Deletes `count` rows starting at position `index`
- Rows after the deleted section are shifted up
- Merged cells are adjusted or removed as needed

**Parameters:**
- `index`: Zero-based row index where deletion starts (0 to current row count - 1)
- `count`: Number of rows to delete (must be >= 1, and `index + count` <= row count)

**Example:**
```typescript
// Delete 1 row at position 5
const cmd: StructuralCommand = {
  type: 'DELETE_ROW',
  index: 5,
  count: 1,
}
```

### INSERT_COL

Inserts new columns at the specified index.

```typescript
{ type: 'INSERT_COL', index: number, count: number }
```

**Behavior:**
- Inserts `count` columns starting at position `index`
- Existing columns at and after `index` are shifted right
- Merged cells spanning the insertion position are automatically expanded

**Parameters:**
- `index`: Zero-based column index where insertion occurs (0 to current column count)
- `count`: Number of columns to insert (must be >= 1)

**Example:**
```typescript
// Insert 3 columns at position 1
const cmd: StructuralCommand = {
  type: 'INSERT_COL',
  index: 1,
  count: 3,
}
```

### DELETE_COL

Deletes columns at the specified index.

```typescript
{ type: 'DELETE_COL', index: number; count: number }
```

**Behavior:**
- Deletes `count` columns starting at position `index`
- Columns after the deleted section are shifted left
- Merged cells are adjusted or removed as needed

**Parameters:**
- `index`: Zero-based column index where deletion starts (0 to current column count - 1)
- `count`: Number of columns to delete (must be >= 1, and `index + count` <= column count)

**Example:**
```typescript
// Delete 2 columns at position 2
const cmd: StructuralCommand = {
  type: 'DELETE_COL',
  index: 2,
  count: 2,
}
```

## Best Practices

1. **Always use TableCommandPlanner for structural operations**
   - Manual command creation doesn't handle merged cell adjustments
   - `TableCommandPlanner` generates complete command sequences that maintain consistency

2. **Validate indices before execution**
   - Check that `index` is within valid bounds
   - For deletions, ensure `index + count` doesn't exceed table size
   - The library may not validate these, leading to undefined behavior

3. **Handle merged cell impacts**
   - Structural operations affect merged cells crossing the operation boundary
   - Insertions expand merged cells automatically
   - Deletions may shrink or remove merged cells

4. **Batch related operations**
   - Use `CommandInterpreter.applyCommands()` for multiple structural changes
   - More efficient than executing commands individually

## Common Pitfalls

1. **Manual insertion without merged cell handling**
   ```typescript
   // BAD: May create invalid merge states
   const insertCmd: StructuralCommand = {
     type: 'INSERT_ROW',
     index: 2,
     count: 1,
   }
   interpreter.applyCommand(insertCmd) // Merged cells not adjusted!

   // GOOD: Use TableCommandPlanner
   const commands = planner.insertRow(2, 1) // Handles merged cells
   if (commands) {
     interpreter.applyCommands(commands)
   }
   ```

2. **Invalid indices**
   ```typescript
   // BAD: Index out of bounds
   const cmd: StructuralCommand = {
     type: 'DELETE_ROW',
     index: 100, // Too large!
     count: 1,
   }

   // GOOD: Validate first
   const index = 100
   const table = new TableState(10, 10)
   if (index >= 0 && index < table.getRowCount()) {
     const commands = planner.deleteRow(index, 1)
     // ...
   }
   ```

3. **Not checking command results**
   ```typescript
   // BAD: Doesn't check if commands were generated
   planner.insertRow(5, 1)
   interpreter.applyCommands(planner.getCommands()) // May be empty!

   // GOOD: Check return value
   const commands = planner.insertRow(5, 1)
   if (commands && commands.length > 0) {
     interpreter.applyCommands(commands)
   }
   ```

## Complete Example

```typescript
import {
  TableState,
  TableCommandPlanner,
  BuildinStateInterpreter,
  StructuralCommand,
  TableCommand
} from '@aptx/table-commands-generator'

// Context: Implementing a custom command interpreter for database-backed tables
// Setup
class DatabaseCommandInterpreter extends CommandInterpreter {
  constructor(private tableName: string) {
    super()
  }

  protected handleInsertRow(index: number, count: number): void {
    // Insert rows in database
    console.log(`DB: INSERT ${count} rows into ${this.tableName} at index ${index}`)
    // Actual database implementation would go here
  }

  protected handleDeleteRow(index: number, count: number): void {
    // Delete rows from database
    console.log(`DB: DELETE ${count} rows from ${this.tableName} at index ${index}`)
    // Actual database implementation would go here
  }

  protected handleInsertCol(index: number, count: number): void {
    // Insert columns in database
    console.log(`DB: INSERT ${count} columns into ${this.tableName} at index ${index}`)
    // Actual database implementation would go here
  }

  protected handleDeleteCol(index: number, count: number): void {
    // Delete columns from database
    console.log(`DB: DELETE ${count} columns from ${this.tableName} at index ${index}`)
    // Actual database implementation would go here
  }

  protected handleSetCellAttr(row: number, col: number, attr: string, value: any): void {
    // Update cell in database
    console.log(`DB: UPDATE cell (${row}, ${col}) set ${attr} = ${value}`)
    // Actual database implementation would go here
  }

  protected handleClearCellAttr(row: number, col: number, attr: string): void {
    // Clear cell attribute in database
    console.log(`DB: CLEAR ${attr} from cell (${row}, ${col})`)
    // Actual database implementation would go here
  }
}

// Usage
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table)
const dbInterpreter = new DatabaseCommandInterpreter('users_table')

// Perform structural operation
const commands = planner.insertRow(5, 2)
if (commands) {
  console.log(`Generated ${commands.length} commands`)

  // Execute on database
  dbInterpreter.applyCommands(commands)

  // Filter for structural commands only
  const structuralCmds = commands.filter(
    (cmd): cmd is StructuralCommand =>
      cmd.type === 'INSERT_ROW' ||
      cmd.type === 'DELETE_ROW' ||
      cmd.type === 'INSERT_COL' ||
      cmd.type === 'DELETE_COL'
  )

  console.log(`Structural commands: ${structuralCmds.length}`)
  structuralCmds.forEach(cmd => {
    console.log(`  ${cmd.type} at index ${cmd.index}, count ${cmd.count}`)
  })
}

// Example: Command validation utility
function validateStructuralCommand(cmd: StructuralCommand, table: TableState): boolean {
  const rowCount = table.getRowCount()
  const colCount = table.getColCount()

  switch (cmd.type) {
    case 'INSERT_ROW':
      return cmd.index >= 0 && cmd.index <= rowCount && cmd.count >= 1

    case 'DELETE_ROW':
      return (
        cmd.index >= 0 &&
        cmd.index < rowCount &&
        cmd.count >= 1 &&
        cmd.index + cmd.count <= rowCount
      )

    case 'INSERT_COL':
      return cmd.index >= 0 && cmd.index <= colCount && cmd.count >= 1

    case 'DELETE_COL':
      return (
        cmd.index >= 0 &&
        cmd.index < colCount &&
        cmd.count >= 1 &&
        cmd.index + cmd.count <= colCount
      )
  }
}

// Usage of validation
const testCmd: StructuralCommand = { type: 'INSERT_ROW', index: 5, count: 1 }
const isValid = validateStructuralCommand(testCmd, table)
console.log(`Command valid: ${isValid}`)
```
