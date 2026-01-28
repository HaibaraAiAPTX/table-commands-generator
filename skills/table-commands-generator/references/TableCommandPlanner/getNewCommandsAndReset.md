# TableCommandPlanner.getNewCommandsAndReset

## Declaration

```typescript
public getNewCommandsAndReset(): TableCommand[]
```

## Purpose

Use `getNewCommandsAndReset()` to retrieve all cached commands AND clear the cache. This is the preferred method for command replay, export, and undo functionality.

**When to use:**
- When implementing command replay or undo/redo
- When exporting command sequences for storage
- When accumulating commands for batch operations
- When you need to clear the cache after retrieval

**When NOT to use:**
- Do NOT use if you need to inspect commands without clearing them—use `getCommands()` instead
- Do NOT use if you plan to execute the same commands multiple times from cache

## Return Value

Returns `TableCommand[]` - Array of all cached commands before clearing.

**Important notes:**
- Returns an empty array `[]` if no commands have been generated
- Clears the command cache after retrieval (next call returns empty array)
- Returns a new array (safe to modify without affecting internal state)

## Behavior with autoClear

### When `autoClear: true` (default)
- Returns commands from the most recent operation
- Cache is already cleared before each operation
- This method mainly serves consistency

### When `autoClear: false`
- Returns all accumulated commands
- Clears the cache after retrieval
- Next call returns empty array until new commands are generated

## Cache Management

**Why use this method?**

Prevents memory leaks when accumulating commands:

```typescript
// Without cache clearing:
for (let i = 0; i < 10000; i++) {
  planner.insertRow(i, 1)
  // Memory keeps growing!
}

// With cache clearing:
for (let i = 0; i < 10000; i++) {
  planner.insertRow(i, 1)
  const commands = planner.getNewCommandsAndReset()
  // Memory is freed each iteration
}
```

## Best Practices

1. **Use for command replay systems**
   - Retrieve and store commands for undo/redo
   - Clear cache to prevent accumulation

2. **Export commands to external storage**
   - Save commands to database, file, or network
   - Clear cache after export

3. **Prevent memory leaks**
   - Always call this method when done with accumulated commands
   - Don't rely on manual cache management

4. **Combine with autoClear: false**
   - Use this pattern for batch operations:
     1. Create planner with `autoClear: false`
     2. Perform multiple operations
     3. Call `getNewCommandsAndReset()` to retrieve and clear

## Common Pitfalls

1. **Calling multiple times expecting same commands**
   ```typescript
   // BAD: Second call returns empty array
   planner.merge(0, 0, 1, 1)
   const commands1 = planner.getNewCommandsAndReset()
   const commands2 = planner.getNewCommandsAndReset()
   // commands2 is [] - cache was cleared!

   // GOOD: Store the result
   planner.merge(0, 0, 1, 1)
   const commands = planner.getNewCommandsAndReset()
   // Use commands for multiple purposes
   ```

2. **Forgetting to call with autoClear disabled**
   ```typescript
   // BAD: Commands accumulate indefinitely
   const planner = new TableCommandPlanner(table, { autoClear: false })
   for (let i = 0; i < 10000; i++) {
     planner.insertRow(i, 1)
     // Memory leak!
   }

   // GOOD: Clear periodically
   const planner = new TableCommandPlanner(table, { autoClear: false })
   for (let i = 0; i < 10000; i++) {
     planner.insertRow(i, 1)
     if (i % 100 === 0) {
       planner.getNewCommandsAndReset()
     }
   }
   ```

3. **Not checking for empty array**
   ```typescript
   // BAD: Assumes commands always returned
   const commands = planner.getNewCommandsAndReset()
   commands.forEach(cmd => interpreter.applyCommand(cmd))
   // May be unexpected if commands is empty

   // GOOD: Check array length
   const commands = planner.getNewCommandsAndReset()
   if (commands.length > 0) {
     commands.forEach(cmd => interpreter.applyCommand(cmd))
   }
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter, TableCommand } from '@aptx/table-commands-generator'

// Scenario 1: Basic command retrieval and reset
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table)

// Generate some commands
planner.merge(0, 0, 1, 1)
const commands1 = planner.getNewCommandsAndReset()
console.log('First call:', commands1.length, 'commands')

const commands2 = planner.getNewCommandsAndReset()
console.log('Second call:', commands2.length, 'commands') // 0 - cache was cleared!

// Scenario 2: Command history for undo/redo
class CommandHistory {
  private history: TableCommand[][] = []
  private currentIndex: number = -1

  add(commands: TableCommand[]): void {
    // Remove any redo history
    this.history = this.history.slice(0, this.currentIndex + 1)
    this.history.push(commands)
    this.currentIndex++
  }

  undo(): TableCommand[] | null {
    if (this.currentIndex < 0) return null

    const commands = this.history[this.currentIndex]
    this.currentIndex--
    return commands
  }

  redo(): TableCommand[] | null {
    if (this.currentIndex >= this.history.length - 1) return null

    this.currentIndex++
    return this.history[this.currentIndex]
  }

  canUndo(): boolean {
    return this.currentIndex >= 0
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }
}

// Usage
const table2 = new TableState(10, 10)
const planner2 = new TableCommandPlanner(table2)
const interpreter2 = new BuildinStateInterpreter(table2)
const history = new CommandHistory()

// Perform operations
planner2.merge(0, 0, 1, 1)
const cmd1 = planner2.getNewCommandsAndReset()
if (cmd1.length > 0) {
  interpreter2.applyCommands(cmd1)
  history.add(cmd1)
}

planner2.insertRow(5, 1)
const cmd2 = planner2.getNewCommandsAndReset()
if (cmd2.length > 0) {
  interpreter2.applyCommands(cmd2)
  history.add(cmd2)
}

// Undo
if (history.canUndo()) {
  const toUndo = history.undo()
  if (toUndo) {
    const inverse = generateInverseCommands(toUndo)
    interpreter2.applyCommands(inverse)
  }
}

// Scenario 3: Export commands to file
function exportCommands(commands: TableCommand[], filename: string): void {
  const json = JSON.stringify(commands, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

// Usage
const table3 = new TableState(20, 20)
const planner3 = new TableCommandPlanner(table3, { autoClear: false })

// Perform batch operations
planner3.merge(0, 0, 0, 4) // Header row
planner3.merge(1, 0, 4, 1) // Side label
planner3.merge(1, 2, 4, 4) // Data area

// Export all commands
const commands = planner3.getNewCommandsAndReset()
exportCommands(commands, 'table-operations.json')

// Scenario 4: Batch operations with memory management
function performBatchOperations(
  table: TableState,
  operations: Array<(planner: TableCommandPlanner) => void>
): TableCommand[] {
  const planner = new TableCommandPlanner(table, { autoClear: false })
  const allCommands: TableCommand[] = []

  for (const operation of operations) {
    // Perform operation
    operation(planner)

    // Retrieve and clear commands
    const commands = planner.getNewCommandsAndReset()

    // Accumulate
    if (commands.length > 0) {
      allCommands.push(...commands)
    }
  }

  return allCommands
}

// Usage
const table4 = new TableState(100, 50)

const operations = [
  (p: TableCommandPlanner) => p.merge(0, 0, 0, 9),
  (p: TableCommandPlanner) => p.insertRow(5, 2),
  (p: TableCommandPlanner) => p.merge(10, 0, 15, 5),
  (p: TableCommandPlanner) => p.deleteCol(8, 1),
]

const batchCommands = performBatchOperations(table4, operations)
console.log(`Batch generated ${batchCommands.length} commands`)

// Scenario 5: Streaming commands
async function streamCommandsToServer(
  planner: TableCommandPlanner,
  endpoint: string
): Promise<void> {
  const commands = planner.getNewCommandsAndReset()

  if (commands.length === 0) {
    console.log('No commands to stream')
    return
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    console.log(`Successfully streamed ${commands.length} commands`)
  } catch (error) {
    console.error('Failed to stream commands:', error)
    throw error
  }
}

// Usage
const table5 = new TableState(50, 50)
const planner5 = new TableCommandPlanner(table5, { autoClear: false })

// Perform operations
planner5.merge(0, 0, 2, 3)
planner5.insertRow(10, 5)

// Stream to server
await streamCommandsToServer(planner5, '/api/table/operations')

// Scenario 6: Command validation before export
function validateCommands(commands: TableCommand[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  commands.forEach((cmd, index) => {
    switch (cmd.type) {
      case 'INSERT_ROW':
      case 'DELETE_ROW':
      case 'INSERT_COL':
      case 'DELETE_COL':
        if (cmd.index < 0) {
          errors.push(`Command ${index}: Negative index`)
        }
        if (cmd.count < 1) {
          errors.push(`Command ${index}: Invalid count`)
        }
        break

      case 'SET_CELL_ATTR':
      case 'CLEAR_CELL_ATTR':
        if (cmd.row < 0 || cmd.col < 0) {
          errors.push(`Command ${index}: Negative coordinates`)
        }
        break
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Usage
const table6 = new TableState(10, 10)
const planner6 = new TableCommandPlanner(table6)

planner6.merge(0, 0, 1, 1)
const commandsToExport = planner6.getNewCommandsAndReset()

const validation = validateCommands(commandsToExport)
if (!validation.valid) {
  console.error('Invalid commands:', validation.errors)
} else {
  console.log('Commands validated, exporting...')
}

// Scenario 7: Memory-efficient command processing
function processLargeTableSafely(table: TableState): void {
  const planner = new TableCommandPlanner(table, { autoClear: false })
  const interpreter = new BuildinStateInterpreter(table)

  // Process in chunks
  const chunkSize = 100
  let totalCommands = 0

  for (let i = 0; i < 1000; i += chunkSize) {
    // Generate chunk of operations
    for (let j = 0; j < chunkSize && i + j < 1000; j++) {
      planner.insertRow(i + j, 1)
    }

    // Retrieve and clear commands
    const commands = planner.getNewCommandsAndReset()
    totalCommands += commands.length

    // Execute
    interpreter.applyCommands(commands)

    console.log(`Processed ${i + chunkSize} rows, ${commands.length} commands`)
  }

  console.log(`Total: ${totalCommands} commands generated and executed`)
}

// Scenario 8: Command comparison for diff
function computeCommandDiff(
  commands1: TableCommand[],
  commands2: TableCommand[]
): {
  added: TableCommand[]
  removed: TableCommand[]
  common: TableCommand[]
} {
  const added: TableCommand[] = []
  const removed: TableCommand[] = []
  const common: TableCommand[] = []

  const set1 = new Set(commands1.map(c => JSON.stringify(c)))
  const set2 = new Set(commands2.map(c => JSON.stringify(c)))

  commands1.forEach(cmd => {
    const key = JSON.stringify(cmd)
    if (!set2.has(key)) {
      removed.push(cmd)
    } else {
      common.push(cmd)
    }
  })

  commands2.forEach(cmd => {
    const key = JSON.stringify(cmd)
    if (!set1.has(key)) {
      added.push(cmd)
    }
  })

  return { added, removed, common }
}

// Usage
const tableA = new TableState(5, 5)
const tableB = new TableState(5, 5)
const plannerA = new TableCommandPlanner(tableA, { autoClear: false })
const plannerB = new TableCommandPlanner(tableB, { autoClear: false })

plannerA.merge(0, 0, 1, 1)
plannerA.insertRow(3, 1)

plannerB.merge(0, 0, 1, 1)
plannerB.merge(3, 0, 4, 1)

const commandsA = plannerA.getNewCommandsAndReset()
const commandsB = plannerB.getNewCommandsAndReset()

const diff = computeCommandDiff(commandsA, commandsB)
console.log('Diff:', diff)
```

## Related APIs

- `TableCommandPlanner.getCommands()` - Get commands without clearing cache
- `TableCommandPlanner constructor` - Configure autoClear behavior
