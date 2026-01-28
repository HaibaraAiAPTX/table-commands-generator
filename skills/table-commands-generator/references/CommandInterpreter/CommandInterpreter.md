# CommandInterpreter (Abstract Class)

## Declaration

```typescript
export abstract class CommandInterpreter {
  public applyCommands(cmds: TableCommand[]): void
  public async applyCommandsAsync(cmds: TableCommand[]): Promise<void>
  public applyCommand(cmd: TableCommand): void

  protected abstract handleInsertRow(
    index: number,
    count: number,
  ): void | Promise<void>
  protected abstract handleInsertCol(
    index: number,
    count: number,
  ): void | Promise<void>
  protected abstract handleDeleteRow(
    index: number,
    count: number,
  ): void | Promise<void>
  protected abstract handleDeleteCol(
    index: number,
    count: number,
  ): void | Promise<void>
  protected abstract handleSetCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
    value: number | boolean | undefined,
  ): void | Promise<void>
  protected abstract handleClearCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
  ): void | Promise<void>
}
```

## Purpose

Use `CommandInterpreter` as the base class for implementing custom command execution logic. This abstract class provides the command dispatching framework, while subclasses implement the actual operations.

**When to use:**
- When implementing custom storage backends (DOM, database, file system, etc.)
- When you need to execute table commands on non-standard targets
- When building adapters for external systems
- When implementing custom side effects during command execution

**When NOT to use:**
- Do NOT use directly for in-memory table operations—use `BuildinStateInterpreter` instead
- Do NOT instantiate this abstract class directly—extend it

## Architecture

`CommandInterpreter` follows the **Command Pattern** with abstract handlers:

1. **Public methods** (`applyCommands`, `applyCommand`) - Dispatch commands to appropriate handlers
2. **Protected abstract methods** - Subclasses implement specific operations
3. **Dispatch logic** - Base class handles command type routing

## Abstract Methods

### Structural Operations

| Method | Purpose | When Called |
|--------|---------|-------------|
| `handleInsertRow` | Insert rows at index | Command has `type: 'INSERT_ROW'` |
| `handleInsertCol` | Insert columns at index | Command has `type: 'INSERT_COL'` |
| `handleDeleteRow` | Delete rows at index | Command has `type: 'DELETE_ROW'` |
| `handleDeleteCol` | Delete columns at index | Command has `type: 'DELETE_COL'` |

### Cell Operations

| Method | Purpose | When Called |
|--------|---------|-------------|
| `handleSetCellAttr` | Set cell attribute value | Command has `type: 'SET_CELL_ATTR'` |
| `handleClearCellAttr` | Clear cell attribute | Command has `type: 'CLEAR_CELL_ATTR'` |

## Synchronous vs Asynchronous

Abstract methods can return either `void` or `Promise<void>`:

- **Synchronous**: Implementations that don't need async operations
- **Asynchronous**: Implementations that use async/await (database, network, etc.)

The base class automatically detects and handles both cases.

## Best Practices

1. **Use BuildinStateInterpreter when possible**
   - For standard in-memory operations, `BuildinStateInterpreter` is already implemented
   - Only extend `CommandInterpreter` for custom backends

2. **Implement all abstract methods**
   - All 6 abstract methods must be implemented
   - Even empty implementations must be provided

3. **Handle merged cell adjustments**
   - Structural operations should account for merged cells
   - The library doesn't automatically adjust merges in custom interpreters
   - Consider how insertions/deletions affect existing merges

4. **Maintain consistency**
   - Ensure operations are idempotent when possible
   - Handle edge cases (invalid indices, empty tables, etc.)
   - Keep the state consistent after each command

5. **Use applyCommands for batching**
   - More efficient than individual `applyCommand()` calls
   - Reduces overhead of command dispatch

## Common Pitfalls

1. **Not implementing all abstract methods**
   ```typescript
   // BAD: Missing implementations
   class MyInterpreter extends CommandInterpreter {
     protected handleInsertRow(index: number, count: number): void {
       // Implemented
     }
     // Missing: handleInsertCol, handleDeleteRow, etc.
   }

   // GOOD: Implement all methods
   class MyInterpreter extends CommandInterpreter {
     protected handleInsertRow(index: number, count: number): void { /* ... */ }
     protected handleInsertCol(index: number, count: number): void { /* ... */ }
     protected handleDeleteRow(index: number, count: number): void { /* ... */ }
     protected handleDeleteCol(index: number, count: number): void { /* ... */ }
     protected handleSetCellAttr(row: number, col: number, attr: string, value: any): void { /* ... */ }
     protected handleClearCellAttr(row: number, col: number, attr: string): void { /* ... */ }
   }
   ```

2. **Forgetting merged cell handling**
   ```typescript
   // BAD: Doesn't adjust merged cells
   protected handleInsertRow(index: number, count: number): void {
     // Just inserts rows, ignores merged cells
     this.data.splice(index, 0, ...new Array(count))
   }

   // GOOD: Adjusts merged cells
   protected handleInsertRow(index: number, count: number): void {
     // Expand merged cells that span the insertion point
     this.adjustMergedCellsForInsertion('row', index, count)
     // Then insert
     this.data.splice(index, 0, ...new Array(count))
   }
   ```

3. **Using applyCommand in loops**
   ```typescript
   // BAD: Inefficient
   commands.forEach(cmd => interpreter.applyCommand(cmd))

   // GOOD: Use batch method
   interpreter.applyCommands(commands)
   ```

## Complete Example

```typescript
import { CommandInterpreter, TableCommand } from '@aptx/table-commands-generator'

// Scenario 1: DOM-based interpreter
class DOMInterpreter extends CommandInterpreter {
  constructor(private tableElement: HTMLTableElement) {
    super()
  }

  protected handleInsertRow(index: number, count: number): void {
    const rows = this.tableElement.rows
    for (let i = 0; i < count; i++) {
      const newRow = document.createElement('tr')
      // Add cells based on current column count
      const colCount = rows[0]?.cells.length || 1
      for (let c = 0; c < colCount; c++) {
        newRow.appendChild(document.createElement('td'))
      }
      // Insert at position (or append if index is beyond length)
      if (index >= rows.length) {
        this.tableElement.appendChild(newRow)
      } else {
        this.tableElement.insertBefore(newRow, rows[index])
      }
    }
  }

  protected handleInsertCol(index: number, count: number): void {
    const rows = this.tableElement.rows
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].cells
      for (let c = 0; c < count; c++) {
        const newCell = document.createElement('td')
        if (index >= cells.length) {
          rows[r].appendChild(newCell)
        } else {
          rows[r].insertBefore(newCell, cells[index])
        }
      }
    }
  }

  protected handleDeleteRow(index: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.tableElement.rows[index]) {
        this.tableElement.deleteRow(index)
      }
    }
  }

  protected handleDeleteCol(index: number, count: number): void {
    const rows = this.tableElement.rows
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < count; c++) {
        if (rows[r].cells[index]) {
          rows[r].deleteCell(index)
        }
      }
    }
  }

  protected handleSetCellAttr(
    row: number,
    col: number,
    attr: string,
    value: any
  ): void {
    const cell = this.tableElement.rows[row]?.cells[col]
    if (!cell) return

    switch (attr) {
      case 'rowSpan':
        cell.rowSpan = value
        break
      case 'colSpan':
        cell.colSpan = value
        break
      case 'isMergedPlaceholder':
        if (value) {
          cell.style.visibility = 'hidden'
        } else {
          cell.style.visibility = ''
        }
        break
    }
  }

  protected handleClearCellAttr(row: number, col: number, attr: string): void {
    const cell = this.tableElement.rows[row]?.cells[col]
    if (!cell) return

    switch (attr) {
      case 'rowSpan':
        cell.rowSpan = 1
        break
      case 'colSpan':
        cell.colSpan = 1
        break
      case 'isMergedPlaceholder':
        cell.style.visibility = ''
        break
    }
  }
}

// Usage
const tableElement = document.getElementById('my-table') as HTMLTableElement
const domInterpreter = new DOMInterpreter(tableElement)

const commands: TableCommand[] = [
  { type: 'INSERT_ROW', index: 0, count: 2 },
  { type: 'SET_CELL_ATTR', row: 0, col: 0, attr: 'rowSpan', value: 2 },
]

domInterpreter.applyCommands(commands)

// Scenario 2: Database-backed interpreter
class DatabaseInterpreter extends CommandInterpreter {
  constructor(private tableName: string, private db: any) {
    super()
  }

  protected async handleInsertRow(index: number, count: number): Promise<void> {
    // SQL: Update row indices for rows >= index
    await this.db.run(
      `UPDATE ${this.tableName} SET row_index = row_index + ? WHERE row_index >= ?`,
      [count, index]
    )
  }

  protected async handleDeleteRow(index: number, count: number): Promise<void> {
    // SQL: Delete rows in range, then update indices
    await this.db.run(
      `DELETE FROM ${this.tableName} WHERE row_index >= ? AND row_index < ?`,
      [index, index + count]
    )
    await this.db.run(
      `UPDATE ${this.tableName} SET row_index = row_index - ? WHERE row_index > ?`,
      [count, index + count - 1]
    )
  }

  // ... implement other methods similarly

  protected handleInsertCol(index: number, count: number): Promise<void> {
    // Asynchronous implementation
    return this.handleInsertColAsync(index, count)
  }

  private async handleInsertColAsync(index: number, count: number): Promise<void> {
    await this.db.run(
      `UPDATE ${this.tableName} SET col_index = col_index + ? WHERE col_index >= ?`,
      [count, index]
    )
  }

  protected handleDeleteCol(index: number, count: number): Promise<void> {
    // Similar to handleDeleteRow but for columns
    return Promise.resolve()
  }

  protected handleSetCellAttr(
    row: number,
    col: number,
    attr: string,
    value: any
  ): Promise<void> {
    return this.db.run(
      `UPDATE ${this.tableName} SET ${attr} = ? WHERE row_index = ? AND col_index = ?`,
      [value, row, col]
    )
  }

  protected handleClearCellAttr(row: number, col: number, attr: string): Promise<void> {
    return this.db.run(
      `UPDATE ${this.tableName} SET ${attr} = NULL WHERE row_index = ? AND col_index = ?`,
      [row, col]
    )
  }
}

// Usage (async)
const dbInterpreter = new DatabaseInterpreter('cells', database)
await dbInterpreter.applyCommandsAsync([
  { type: 'INSERT_ROW', index: 5, count: 1 },
  { type: 'SET_CELL_ATTR', row: 5, col: 0, attr: 'rowSpan', value: 2 },
])

// Scenario 3: Logging decorator
class LoggingInterpreter extends CommandInterpreter {
  constructor(private baseInterpreter: CommandInterpreter) {
    super()
  }

  protected handleInsertRow(index: number, count: number): void {
    console.log(`[LOG] Inserting ${count} row(s) at index ${index}`)
    // Delegate to base interpreter
    ;(this.baseInterpreter as any).handleInsertRow(index, count)
  }

  protected handleInsertCol(index: number, count: number): void {
    console.log(`[LOG] Inserting ${count} column(s) at index ${index}`)
    ;(this.baseInterpreter as any).handleInsertCol(index, count)
  }

  // ... implement other methods with logging
  protected handleDeleteRow(index: number, count: number): void {
    console.log(`[LOG] Deleting ${count} row(s) at index ${index}`)
    ;(this.baseInterpreter as any).handleDeleteRow(index, count)
  }

  protected handleDeleteCol(index: number, count: number): void {
    console.log(`[LOG] Deleting ${count} column(s) at index ${index}`)
    ;(this.baseInterpreter as any).handleDeleteCol(index, count)
  }

  protected handleSetCellAttr(row: number, col: number, attr: string, value: any): void {
    console.log(`[LOG] Setting cell (${row}, ${col}) ${attr} = ${value}`)
    ;(this.baseInterpreter as any).handleSetCellAttr(row, col, attr, value)
  }

  protected handleClearCellAttr(row: number, col: number, attr: string): void {
    console.log(`[LOG] Clearing cell (${row}, ${col}) ${attr}`)
    ;(this.baseInterpreter as any).handleClearCellAttr(row, col, attr)
  }
}
```

## Related APIs

- `BuildinStateInterpreter` - Built-in implementation for TableState
- `TableCommandPlanner` - High-level operations that generate commands
- `TableCommand` - Command types to execute
