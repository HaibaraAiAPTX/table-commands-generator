# WorksheetData (Type)

## Declaration

```typescript
export type WorksheetData = Map<number, Map<number, Cell>>
```

## Purpose

Use `WorksheetData` to represent the entire table's data structure using a **sparse storage** approach. This is the underlying data structure used by `TableState` for efficient memory usage.

**When to use:**
- When implementing custom storage backends or serializers
- When working directly with raw table data outside of `TableState`
- When debugging or inspecting table state

**When NOT to use:**
- Do NOT manually manipulate `WorksheetData` for high-level operations—use `TableCommandPlanner` instead
- Do NOT create instances from scratch for normal table operations—use `TableState` constructor

## Structure

The type is a nested `Map` structure:

```
WorksheetData
├── Map<number, Map<number, Cell>>  (outer map: row index → row data)
│   ├── 0 → Map<number, Cell>        (row 0 data)
│   │   ├── 0 → Cell                 (column 0)
│   │   ├── 2 → Cell                 (column 2)
│   │   └── 5 → Cell                 (column 5)
│   └── 3 → Map<number, Cell>        (row 3 data)
│       └── 1 → Cell                 (column 1)
```

**Key characteristics:**
- **Sparse storage:** Only stores rows that have non-empty cells
- **Nested maps:** Outer key = row index, inner key = column index
- **Direct access:** O(1) average time complexity for cell lookup

## Access Patterns

### Reading cells

```typescript
// Get cell at (row, col) - returns undefined if not found
const cell = worksheetData.get(row)?.get(col)

// Safe access with default
const cell = worksheetData.get(row)?.get(col) ?? {}
```

### Writing cells

```typescript
// Ensure row map exists
let rowMap = worksheetData.get(row)
if (!rowMap) {
  rowMap = new Map()
  worksheetData.set(row, rowMap)
}

// Set cell
rowMap.set(col, { merge: { rowSpan: 2, colSpan: 2 } })

// Delete cell (maintains sparsity)
rowMap.delete(col)
if (rowMap.size === 0) {
  worksheetData.delete(row) // Clean up empty rows
}
```

### Iterating

```typescript
// Iterate over all rows
for (const [rowIndex, rowMap] of worksheetData) {
  // Iterate over cells in this row
  for (const [colIndex, cell] of rowMap) {
    console.log(`Cell (${rowIndex}, ${colIndex}):`, cell)
  }
}

// Get all non-empty cell positions
const positions: [number, number][] = []
for (const [row, rowMap] of worksheetData) {
  for (const col of rowMap.keys()) {
    positions.push([row, col])
  }
}
```

## Best Practices

1. **Maintain sparsity**
   - Always delete cells that become empty (no properties)
   - Always delete rows that become empty (no cells)
   - This prevents memory bloat over time

2. **Use TableState instead**
   - For normal operations, `TableState` provides a safer, higher-level API
   - `TableState` handles sparsity maintenance automatically
   - Only use `WorksheetData` directly when implementing low-level utilities

3. **Coordinate system**
   - Row and column indices are zero-based
   - Negative indices are not supported
   - The structure does not enforce bounds—use `TableState.getRowCount()`/`getColCount()` for validation

4. **Performance considerations**
   - Sparse storage is memory-efficient for sparse tables
   - Dense tables (mostly filled) may benefit from array-based storage
   - Iteration is proportional to the number of non-empty cells, not table size

## Common Pitfalls

1. **Forgetting to clean up empty cells**
   ```typescript
   // BAD: Leaves empty cell in storage
   rowMap.set(col, {})

   // GOOD: Removes the cell
   rowMap.delete(col)
   ```

2. **Forgetting to clean up empty rows**
   ```typescript
   // BAD: Leaves empty row map
   rowMap.delete(col)
   // rowMap is now empty but still in worksheetData

   // GOOD: Cleans up empty row
   rowMap.delete(col)
   if (rowMap.size === 0) {
     worksheetData.delete(row)
   }
   ```

3. **Assuming dense iteration**
   ```typescript
   // BAD: Does not iterate over sparse structure correctly
   for (let row = 0; row < rowCount; row++) {
     for (let col = 0; col < colCount; col++) {
       const cell = worksheetData.get(row)?.get(col) // Always undefined for empty rows
     }
   }

   // GOOD: Only iterates over non-empty cells
   for (const [row, rowMap] of worksheetData) {
     for (const [col, cell] of rowMap) {
       // Process cell
     }
   }
   ```

## Complete Example

```typescript
import { TableState } from '@aptx/table-commands-generator'

// Context: Implementing a custom table serializer that exports to JSON
// Setup
const table = new TableState(5, 5)

// Populate with some merged cells
const planner = new TableCommandPlanner(table)
planner.merge(0, 0, 1, 2) // 2x3 merge starting at (0,0)
planner.merge(3, 3, 3, 3) // 1x1 merge (single cell) at (3,3)

// Custom serializer: Export to compact JSON format
function exportTableToJSON(table: TableState): string {
  // Access the underlying WorksheetData
  const data: Map<number, Map<number, Cell>> = (table as any)._data

  const exportData: Record<number, Record<number, any>> = {}

  for (const [row, rowMap] of data) {
    const rowExport: Record<number, any> = {}
    for (const [col, cell] of rowMap) {
      // Only export cells with actual data
      if (Object.keys(cell).length > 0) {
        rowExport[col] = cell
      }
    }
    exportData[row] = rowExport
  }

  return JSON.stringify(exportData, null, 2)
}

// Custom deserializer: Import from JSON
function importTableFromJSON(json: string): TableState {
  const importData = JSON.parse(json)
  const table = new TableState()

  const data: Map<number, Map<number, Cell>> = (table as any)._data

  for (const [rowStr, rowExport] of Object.entries(importData)) {
    const row = Number(rowStr)
    const rowMap = new Map<number, Cell>()

    for (const [colStr, cellData] of Object.entries(rowExport)) {
      const col = Number(colStr)
      rowMap.set(col, cellData as Cell)
    }

    data.set(row, rowMap)
  }

  return table
}

// Usage
const json = exportTableToJSON(table)
console.log('Exported JSON:', json)

const importedTable = importTableFromJSON(json)
console.log('Imported successfully, cell count:', importedTable.getColCount() * importedTable.getRowCount())
```

## Comparison with Alternatives

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| `WorksheetData` (sparse Map) | Memory-efficient for sparse data, O(1) lookup | Slower iteration for dense data | Default choice, general purpose |
| 2D Array `Cell[][]` | Fast iteration, simple indexing | Memory-intensive for sparse tables | Dense tables (mostly filled) |
| Flat array `Cell[]` with row*width+col indexing | Very fast iteration, cache-friendly | Still memory-intensive | Performance-critical rendering |
