# TableCommandPlanner.getCommands

## Declaration

```typescript
public getCommands(): TableCommand[]
```

## Purpose

Use `getCommands()` to retrieve all currently cached commands without clearing the cache. This allows you to inspect commands while preserving them for later use.

**When to use:**
- When you need to inspect generated commands without clearing them
- When debugging command generation
- When you want to preview commands before execution

**When NOT to use:**
- Do NOT use if you plan to clear the cache afterward—use `getNewCommandsAndReset()` instead
- Do NOT rely on this for command replay without understanding `autoClear` behavior

## Return Value

Returns `TableCommand[]` - Array of all cached commands.

**Important notes:**
- Returns an empty array `[]` if no commands have been generated
- Does NOT clear the command cache (commands remain available)
- Returns a reference to the internal array (modifications affect internal state)

## Behavior with autoClear

### When `autoClear: true` (default)
- Only contains commands from the most recent operation
- Previous operations' commands are automatically cleared
- Cache is cleared before each new operation

### When `autoClear: false`
- Contains all accumulated commands from all operations
- Commands accumulate until manually cleared
- Use `getNewCommandsAndReset()` to get and clear

## Best Practices

1. **Use for inspection, not execution**
   - Perfect for debugging and logging
   - Use `getNewCommandsAndReset()` when you want to clear after retrieval

2. **Understand autoClear impact**
   - With `autoClear: true`, only latest operation's commands are present
   - With `autoClear: false`, all accumulated commands are present

3. **Don't modify returned array**
   - The returned array references internal state
   - Modifications will corrupt the command cache
   - Create a copy if you need to modify: `[...planner.getCommands()]`

4. **Use for command preview**
   - Inspect commands before execution
   - Validate command sequences
   - Debug command generation logic

## Common Pitfalls

1. **Assuming commands persist with autoClear enabled**
   ```typescript
   // BAD: Only last operation's commands available
   const planner = new TableCommandPlanner(table) // autoClear = true
   planner.merge(0, 0, 1, 1)
   planner.insertRow(2, 1)

   const commands = planner.getCommands()
   // Only contains insertRow commands, merge commands were cleared!

   // GOOD: Disable autoClear for accumulation
   const planner2 = new TableCommandPlanner(table, { autoClear: false })
   planner2.merge(0, 0, 1, 1)
   planner2.insertRow(2, 1)

   const commands2 = planner2.getCommands()
   // Contains both merge and insertRow commands
   ```

2. **Modifying the returned array**
   ```typescript
   // BAD: Modifies internal state
   const commands = planner.getCommands()
   commands.push({ type: 'INSERT_ROW', index: 5, count: 1 })
   // Corrupts the internal command cache!

   // GOOD: Create a copy
   const commands = [...planner.getCommands()]
   commands.push({ type: 'INSERT_ROW', index: 5, count: 1 })
   ```

3. **Not clearing cache with autoClear disabled**
   ```typescript
   // BAD: Commands accumulate indefinitely
   const planner = new TableCommandPlanner(table, { autoClear: false })
   for (let i = 0; i < 1000; i++) {
     planner.insertRow(i, 1)
   }
   const commands = planner.getCommands()
   // May contain thousands of commands, memory leak!

   // GOOD: Periodically clear
   const planner2 = new TableCommandPlanner(table, { autoClear: false })
   for (let i = 0; i < 1000; i++) {
     planner2.insertRow(i, 1)
     if (i % 100 === 0) {
       planner2.getNewCommandsAndReset() // Clear periodically
     }
   }
   ```

4. **Confusing getCommands() with getNewCommandsAndReset()**
   ```typescript
   // BAD: Uses getCommands() but wants to clear cache
   const commands = planner.getCommands()
   // Forget to call something to clear cache...
   // Next operation accumulates more commands

   // GOOD: Use getNewCommandsAndReset() directly
   const commands = planner.getNewCommandsAndReset()
   // Cache is cleared automatically
   ```

## Complete Example

```typescript
import { TableState, TableCommandPlanner, BuildinStateInterpreter } from '@aptx/table-commands-generator'

// Scenario 1: Inspection before execution
const table = new TableState(10, 10)
const planner = new TableCommandPlanner(table)

planner.merge(0, 0, 1, 2)

// Preview commands before executing
const commands = planner.getCommands()
console.log('Generated commands:', commands.length)
console.log('Command types:', commands.map(c => c.type))

// Execute after inspection
const interpreter = new BuildinStateInterpreter(table)
interpreter.applyCommands(commands)

// Scenario 2: Debugging command generation
function debugCommands(planner: TableCommandPlanner, operation: string): void {
  const commands = planner.getCommands()

  console.log(`\n=== Debug: ${operation} ===`)
  console.log(`Total commands: ${commands.length}`)

  const summary = commands.reduce((acc, cmd) => {
    acc[cmd.type] = (acc[cmd.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('Command breakdown:', summary)

  commands.forEach((cmd, i) => {
    console.log(`  ${i + 1}.`, formatCommand(cmd))
  })
}

function formatCommand(cmd: TableCommand): string {
  switch (cmd.type) {
    case 'INSERT_ROW':
      return `INSERT_ROW at ${cmd.index}, count=${cmd.count}`
    case 'DELETE_ROW':
      return `DELETE_ROW at ${cmd.index}, count=${cmd.count}`
    case 'INSERT_COL':
      return `INSERT_COL at ${cmd.index}, count=${cmd.count}`
    case 'DELETE_COL':
      return `DELETE_COL at ${cmd.index}, count=${cmd.count}`
    case 'SET_CELL_ATTR':
      return `SET_CELL_ATTR (${cmd.row},${cmd.col}) ${cmd.attr}=${cmd.value}`
    case 'CLEAR_CELL_ATTR':
      return `CLEAR_CELL_ATTR (${cmd.row},${cmd.col}) ${cmd.attr}`
  }
}

// Usage
planner.merge(0, 0, 2, 2)
debugCommands(planner, 'merge(0,0,2,2)')

planner.insertRow(5, 2)
debugCommands(planner, 'insertRow(5,2)')

// Scenario 3: Monitoring command accumulation
function monitorCacheSize(planner: TableCommandPlanner, label: string): void {
  const size = planner.getCommands().length
  console.log(`[${label}] Cache size: ${size} commands`)

  if (size > 1000) {
    console.warn('Warning: Large command cache detected!')
  }
}

const table2 = new TableState(100, 100)
const planner2 = new TableCommandPlanner(table2, { autoClear: false })

monitorCacheSize(planner2, 'Initial')

for (let i = 0; i < 100; i++) {
  planner2.insertRow(i, 1)
  if (i % 20 === 0) {
    monitorCacheSize(planner2, `After ${i} insertions`)
  }
}

// Scenario 4: Safe command copying
function getCommandsCopy(planner: TableCommandPlanner): TableCommand[] {
  // Create a shallow copy to avoid modifying internal state
  return [...planner.getCommands()]
}

// Usage
const original = planner.getCommands()
const copy = getCommandsCopy(planner)

// Safe to modify copy
copy.push({ type: 'INSERT_ROW', index: 99, count: 1 })

// Original is unchanged
console.log('Original length:', original.length)
console.log('Copy length:', copy.length)

// Scenario 5: Comparing commands
function compareCommands(
  planner1: TableCommandPlanner,
  planner2: TableCommandPlanner
): { same: boolean; details: string } {
  const cmds1 = planner1.getCommands()
  const cmds2 = planner2.getCommands()

  if (cmds1.length !== cmds2.length) {
    return {
      same: false,
      details: `Different counts: ${cmds1.length} vs ${cmds2.length}`,
    }
  }

  for (let i = 0; i < cmds1.length; i++) {
    if (!commandsEqual(cmds1[i], cmds2[i])) {
      return {
        same: false,
        details: `Command ${i} differs`,
      }
    }
  }

  return { same: true, details: 'Commands are identical' }
}

function commandsEqual(a: TableCommand, b: TableCommand): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Usage
const tableA = new TableState(5, 5)
const tableB = new TableState(5, 5)
const plannerA = new TableCommandPlanner(tableA)
const plannerB = new TableCommandPlanner(tableB)

plannerA.merge(0, 0, 1, 1)
plannerB.merge(0, 0, 1, 1)

const comparison = compareCommands(plannerA, plannerB)
console.log('Comparison result:', comparison)

// Scenario 6: Command statistics
function analyzeCommands(commands: TableCommand[]): {
  structural: number
  cell: number
  byType: Record<string, number>
} {
  const structural = commands.filter(
    (c): c is StructuralCommand =>
      c.type === 'INSERT_ROW' ||
      c.type === 'DELETE_ROW' ||
      c.type === 'INSERT_COL' ||
      c.type === 'DELETE_COL'
  ).length

  const cell = commands.filter(
    (c): c is CellCommand =>
      c.type === 'SET_CELL_ATTR' ||
      c.type === 'CLEAR_CELL_ATTR'
  ).length

  const byType = commands.reduce((acc, cmd) => {
    acc[cmd.type] = (acc[cmd.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return { structural, cell, byType }
}

// Usage
const allCommands = planner.getCommands()
const stats = analyzeCommands(allCommands)
console.log('Command statistics:', stats)
// { structural: 1, cell: 6, byType: { INSERT_ROW: 1, SET_CELL_ATTR: 6 } }
```

## Related APIs

- `TableCommandPlanner.getNewCommandsAndReset()` - Get commands and clear cache
- `TableCommandPlanner constructor` - Configure autoClear behavior
