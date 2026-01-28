# TableCommandPlanner - constructor

## Declaration

```typescript
constructor(coreInstance: TableState, options?: { autoClear?: boolean })
```

## Purpose

Use the constructor to create a `TableCommandPlanner` instance that generates table operation commands. The planner is linked to a `TableState` instance and generates commands for high-level operations like merging cells or inserting rows.

**When to use:**
- When setting up a new table with command generation capabilities
- When you need high-level operations that handle merged cells automatically

**When NOT to use:**
- Do NOT create multiple planners for the same `TableState` (unnecessary overhead)
- Do NOT reuse a planner after the table is destroyed

## Parameters

### `coreInstance: TableState` (required)

The table state instance that this planner will operate on.

**Behavior:**
- The planner stores a reference to this `TableState`
- All generated commands are intended to modify this table
- Changes to the table are reflected immediately when commands are executed

### `options?: { autoClear?: boolean }` (optional)

Configuration options for command caching behavior.

#### `autoClear: boolean` (default: `true`)

Controls whether the command cache is automatically cleared after each operation.

**When `autoClear: true` (default):**
- Command cache is cleared before each new operation
- Only the most recent operation's commands are available via `getCommands()`
- Prevents memory buildup from accumulated commands
- Use for: Single operations, real-time updates

**When `autoClear: false`:**
- Commands accumulate across multiple operations
- All generated commands remain available until manually cleared
- Use for: Batch operations, command recording, export sequences
- **Warning:** Can cause memory leaks if not managed properly

## Return Value

Returns a new `TableCommandPlanner` instance.

## Best Practices

1. **Choose autoClear based on use case**
   - Enable (`true`) for normal operations (default)
   - Disable (`false`) when you need to capture complete command sequences

2. **Manage command cache when autoClear is false**
   - Call `getNewCommandsAndReset()` periodically to prevent memory buildup
   - Export commands to external storage if needed for long-term retention

3. **Pair with CommandInterpreter**
   - Use `BuildinStateInterpreter` to execute generated commands
   - Both should reference the same `TableState`

4. **Don't create multiple planners for the same table**
   - One planner per `TableState` is sufficient
   - Multiple planners waste memory and can cause confusion

## Common Pitfalls

1. **Forgetting to disable autoClear for batch operations**
   ```typescript
   // BAD: Commands are cleared after each operation
   const planner = new TableCommandPlanner(table) // autoClear = true (default)
   planner.merge(0, 0, 1, 1)
   planner.insertRow(2, 1)

   const commands = planner.getCommands()
   // Only contains insertRow commands, merge commands were cleared!

   // GOOD: Disable autoClear for batch operations
   const planner = new TableCommandPlanner(table, { autoClear: false })
   planner.merge(0, 0, 1, 1)
   planner.insertRow(2, 1)

   const commands = planner.getCommands()
   // Contains both merge and insertRow commands
   ```

2. **Memory leak with autoClear disabled**
   ```typescript
   // BAD: Commands accumulate indefinitely
   const planner = new TableCommandPlanner(table, { autoClear: false })
   for (let i = 0; i < 10000; i++) {
     planner.insertRow(i, 1)
     // Command cache keeps growing!
   }

   // GOOD: Periodically clear the cache
   const planner = new TableCommandPlanner(table, { autoClear: false })
   for (let i = 0; i < 10000; i++) {
     planner.insertRow(i, 1)
     if (i % 100 === 0) {
       planner.getNewCommandsAndReset() // Clear every 100 operations
     }
   }

   // BETTER: Manually manage commands
   const allCommands: TableCommand[] = []
   const planner = new TableCommandPlanner(table, { autoClear: false })

   for (let i = 0; i < 10000; i++) {
     planner.insertRow(i, 1)
     const commands = planner.getNewCommandsAndReset()
     if (commands) {
       allCommands.push(...commands)
     }
   }
   ```

3. **Not checking for undefined return values**
   ```typescript
   // BAD: Assumes getCommands() always returns non-empty array
   const commands = planner.getCommands()
   commands.forEach(cmd => interpreter.applyCommand(cmd))

   // GOOD: Check for undefined or empty
   const commands = planner.getCommands()
   if (commands && commands.length > 0) {
     commands.forEach(cmd => interpreter.applyCommand(cmd))
   }
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter } from '@aptx/table-commands-generator'

// Scenario 1: Normal usage (autoClear enabled - default)
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table) // autoClear = true
const interpreter = new BuildinStateInterpreter(table)

// Each operation clears previous commands
planner.merge(0, 0, 1, 1)
const commands1 = planner.getCommands() // [merge commands]

planner.insertRow(5, 1)
const commands2 = planner.getCommands() // [insertRow commands] - merge commands cleared!

// Execute the latest operation
interpreter.applyCommands(commands2)

// Scenario 2: Batch operations (autoClear disabled)
const table2 = new TableState(10, 10)
const planner2 = new TableCommandPlanner(table2, { autoClear: false })

// Commands accumulate
planner2.merge(0, 0, 1, 1)
planner2.insertRow(5, 1)
planner2.merge(7, 7, 8, 8)

const allCommands = planner2.getCommands()
// Contains: [merge commands, insertRow commands, merge commands]

// Execute all commands at once
const interpreter2 = new BuildinStateInterpreter(table2)
interpreter2.applyCommands(allCommands)

// Clear the cache for next batch
planner2.getNewCommandsAndReset()

// Scenario 3: Command recording for export
interface OperationLog {
  timestamp: number
  operation: string
  commands: TableCommand[]
}

const operationLog: OperationLog[] = []
const table3 = new TableState(5, 5)
const planner3 = new TableCommandPlanner(table3, { autoClear: false })

// Perform operations and log them
function performAndLogMerge(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): void {
  planner3.merge(startRow, startCol, endRow, endCol)
  const commands = planner3.getNewCommandsAndReset()

  if (commands) {
    operationLog.push({
      timestamp: Date.now(),
      operation: `merge(${startRow}, ${startCol}, ${endRow}, ${endCol})`,
      commands,
    })
  }
}

// Usage
performAndLogMerge(0, 0, 1, 1)
performAndLogMerge(2, 2, 3, 3)

// Export log
console.log('Operation log:', operationLog)
const exportData = JSON.stringify(operationLog, null, 2)

// Scenario 4: Choosing the right mode
// Use autoClear: true for real-time operations (like user interactions)
function setupInteractiveTable(): TableCommandPlanner {
  const table = new TableState(20, 20)
  return new TableCommandPlanner(table) // autoClear = true (default)
}

// Use autoClear: false for bulk operations (like data import)
function setupBulkImportTable(): { table: TableState; planner: TableCommandPlanner } {
  const table = new TableState(1000, 50)
  const planner = new TableCommandPlanner(table, { autoClear: false })
  return { table, planner }
}

// Example: Import data with command recording
const { table: importTable, planner: importPlanner } = setupBulkImportTable()

// Simulate importing data from CSV
const csvData = [
  ['Header1', 'Header2', 'Header3'],
  ['Data1', 'Data2', 'Data3'],
  ['Data4', 'Data5', 'Data6'],
]

// Import would create many operations here
// For now, just demonstrate the pattern
importPlanner.merge(0, 0, 0, 2) // Merge header cells

// Get all import commands for replay/validation
const importCommands = importPlanner.getCommands()
console.log(`Import generated ${importCommands.length} commands`)

// Clear cache after import is complete
importPlanner.getNewCommandsAndReset()
```

## Related APIs

- `TableCommandPlanner.getCommands()` - Get current commands without clearing
- `TableCommandPlanner.getNewCommandsAndReset()` - Get commands and clear cache
- `TableState` - The table state being operated on
