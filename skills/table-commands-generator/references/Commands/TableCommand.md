# TableCommand (Type)

## Declaration

```typescript
export type TableCommand = StructuralCommand | CellCommand
```

## Purpose

Use `TableCommand` as the unified type for all table operation commands. This is the type you'll use when passing commands to `CommandInterpreter.applyCommands()` or similar APIs.

**When to use:**
- When storing or batching commands for later execution
- When implementing command replay or undo functionality
- When defining function signatures that accept any table command

**When NOT to use:**
- Do NOT create `TableCommand` objects manually for high-level operations—use `TableCommandPlanner` instead
- Do NOT rely on this union type for command-specific validation—use the specific command types

## Command Categories

`TableCommand` is a union of two categories:

### 1. StructuralCommand
Commands that modify table structure (rows/columns):
- `INSERT_ROW` - Insert rows at specified index
- `DELETE_ROW` - Delete rows at specified index
- `INSERT_COL` - Insert columns at specified index
- `DELETE_COL` - Delete columns at specified index

### 2. CellCommand
Commands that modify cell attributes:
- `SET_CELL_ATTR` - Set a cell attribute value
- `CLEAR_CELL_ATTR` - Clear a cell attribute

## Type Narrowing

When working with `TableCommand`, use the `type` property to narrow to specific command types:

```typescript
function handleCommand(cmd: TableCommand) {
  switch (cmd.type) {
    case 'INSERT_ROW':
    case 'DELETE_ROW':
    case 'INSERT_COL':
    case 'DELETE_COL':
      // cmd is narrowed to StructuralCommand
      console.log(`Structural: ${cmd.type} at index ${cmd.index}`)
      break

    case 'SET_CELL_ATTR':
    case 'CLEAR_CELL_ATTR':
      // cmd is narrowed to CellCommand
      console.log(`Cell: ${cmd.type} at (${cmd.row}, ${cmd.col})`)
      break
  }
}
```

## Best Practices

1. **Use TableCommandPlanner for command generation**
   - Never manually construct `TableCommand` objects for complex operations
   - Let `TableCommandPlanner` generate the correct command sequences
   - Manual construction is error-prone, especially for merged cell handling

2. **Store commands for replay and undo**
   - Commands are serializable and can be stored for later replay
   - Implement undo by storing inverse commands or command history
   - Commands can be sent over the network for synchronization

3. **Batch commands for performance**
   - Use `CommandInterpreter.applyCommands()` to execute multiple commands at once
   - Batching is more efficient than individual `applyCommand()` calls

4. **Validate before execution**
   - The library does not perform extensive validation
   - Check bounds (row/column indices) before executing commands
   - Ensure structural commands have valid indices

## Common Pitfalls

1. **Manually constructing merge commands**
   ```typescript
   // BAD: Complex and error-prone
   const mergeCommands: TableCommand[] = [
     { type: 'SET_CELL_ATTR', row: 0, col: 0, attr: 'rowSpan', value: 2 },
     { type: 'SET_CELL_ATTR', row: 0, col: 0, attr: 'colSpan', value: 3 },
     { type: 'SET_CELL_ATTR', row: 0, col: 1, attr: 'isMergedPlaceholder', value: true },
     { type: 'SET_CELL_ATTR', row: 0, col: 2, attr: 'isMergedPlaceholder', value: true },
     { type: 'SET_CELL_ATTR', row: 1, col: 1, attr: 'isMergedPlaceholder', value: true },
     { type: 'SET_CELL_ATTR', row: 1, col: 2, attr: 'isMergedPlaceholder', value: true },
   ]

   // GOOD: Let TableCommandPlanner handle it
   const mergeCommands = planner.merge(0, 0, 1, 2)
   ```

2. **Not checking command results**
   ```typescript
   // BAD: Ignores return value
   planner.merge(0, 0, 2, 2)

   // GOOD: Check for undefined (no commands generated)
   const commands = planner.merge(0, 0, 2, 2)
   if (commands) {
     interpreter.applyCommands(commands)
   }
   ```

3. **Executing structural commands without adjusting merged cells**
   ```typescript
   // BAD: May leave merged cells in invalid state
   const deleteCmd: TableCommand = { type: 'DELETE_ROW', index: 2, count: 1 }
   interpreter.applyCommand(deleteCmd)

   // GOOD: Use TableCommandPlanner which handles merged cells
   const commands = planner.deleteRow(2, 1)
   if (commands) {
     interpreter.applyCommands(commands)
   }
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter, TableCommand } from '@aptx/table-commands-generator'

// Context: Implementing command recording and replay for undo/redo
// Setup
const table = new TableState(10, 10)
const interpreter = new BuildinStateInterpreter(table)
const planner = new TableCommandPlanner(table)

// Command history for undo functionality
const commandHistory: TableCommand[][] = []

// Perform an operation and record commands
function performMergeAndRecord(startRow: number, startCol: number, endRow: number, endCol: number): void {
  const commands = planner.merge(startRow, startCol, endRow, endCol)

  if (commands) {
    // Record commands for potential undo
    commandHistory.push(commands)

    // Execute the commands
    interpreter.applyCommands(commands)

    console.log(`Merge completed. ${commands.length} commands recorded.`)
  }
}

// Undo last operation
function undoLastOperation(): boolean {
  const lastCommands = commandHistory.pop()
  if (!lastCommands) {
    console.log('No operations to undo')
    return false
  }

  // Generate inverse commands (simplified example)
  const inverseCommands = generateInverseCommands(lastCommands)

  interpreter.applyCommands(inverseCommands)
  console.log(`Undo completed. ${inverseCommands.length} inverse commands executed.`)
  return true
}

// Generate inverse commands (simplified - real implementation would be more complex)
function generateInverseCommands(commands: TableCommand[]): TableCommand[] {
  const inverse: TableCommand[] = []

  // Process in reverse order
  for (let i = commands.length - 1; i >= 0; i--) {
    const cmd = commands[i]

    switch (cmd.type) {
      case 'INSERT_ROW':
        inverse.push({ type: 'DELETE_ROW', index: cmd.index, count: cmd.count })
        break
      case 'DELETE_ROW':
        inverse.push({ type: 'INSERT_ROW', index: cmd.index, count: cmd.count })
        break
      case 'INSERT_COL':
        inverse.push({ type: 'DELETE_COL', index: cmd.index, count: cmd.count })
        break
      case 'DELETE_COL':
        inverse.push({ type: 'INSERT_COL', index: cmd.index, count: cmd.count })
        break
      case 'SET_CELL_ATTR':
        // For SET_CELL_ATTR, we need to know the previous value
        // This is simplified - real implementation would track previous values
        inverse.push({ type: 'CLEAR_CELL_ATTR', row: cmd.row, col: cmd.col, attr: cmd.attr })
        break
      case 'CLEAR_CELL_ATTR':
        // For CLEAR_CELL_ATTR, we need to know the previous value
        // This is simplified - real implementation would track previous values
        break
    }
  }

  return inverse
}

// Usage
performMergeAndRecord(0, 0, 1, 2)
console.log('Current row count:', table.getRowCount()) // 10

undoLastOperation()
console.log('After undo, row count:', table.getRowCount()) // Still 10 (merge undone)

// Example: Serialize commands for network transmission
function serializeCommands(commands: TableCommand[]): string {
  return JSON.stringify(commands)
}

function deserializeCommands(json: string): TableCommand[] {
  return JSON.parse(json)
}

// Send commands over network (e.g., for collaborative editing)
const commands = planner.insertRow(5, 1)
if (commands) {
  const serialized = serializeCommands(commands)
  // Send to server...
  console.log('Serialized commands:', serialized)
}
```

## Related Types

- `StructuralCommand` - See `references/Commands/StructuralCommand.md`
- `CellCommand` - See `references/Commands/CellCommand.md`
