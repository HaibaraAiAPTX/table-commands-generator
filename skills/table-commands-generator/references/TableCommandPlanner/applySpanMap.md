# TableCommandPlanner.applySpanMap

## Declaration

```typescript
public applySpanMap(map: MergeCellInfo[]): TableCommand[] | undefined
```

`MergeCellInfo` is a structural type — plain objects work:

```typescript
type MergeCellInfo = {
  row: number
  col: number
  rowSpan: number
  colSpan: number
}
```

## Purpose

Use `applySpanMap()` to re-lay the whole table's merge state as a single batch, making the table match `map` exactly. Think of it as an authoritative replacement: every entry in the map is applied as a merge, and every existing merge that does not exactly match a map entry is cleared (including its footprint placeholder cleanup). This turns "restore a layout" from a sequence of `merge()`/`unmerge()` calls into one atomic, validated batch.

**When to use:**

- Restoring a saved layout (serialize merges as span entries, rebuild with one batch)
- Bulk layout transformations where incremental `merge()`/`unmerge()` calls would generate noisy intermediate batches
- Syncing the table to a canonical span source (e.g. a server-provided or computed layout)

**When NOT to use:**

- Partial edits of one or two merges — use `merge()` / `unmerge()`
- Consumers that rely on `isMergedPlaceholder` flags on covered cells — `applySpanMap()` emits no placeholder SET commands (same property as `mergeSpanOnly()`)

## Parameters

### `map: MergeCellInfo[]` (required)

The target merge layout as main-cell span entries.

**Valid values (validated before anything is generated):**

- `rowSpan >= 1` and `colSpan >= 1` for every entry
- `row >= 0` and `col >= 0` for every entry
- Every entry within table bounds: `row + rowSpan <= rowCount` and `col + colSpan <= colCount`
- No two entries overlap (rectangles must be disjoint)

**Behavior:**

- An entry with `rowSpan: 1, colSpan: 1` is meaningful: it clears any existing merge at that cell
- An empty array clears all merges in the table

## Return Value

Returns `TableCommand[] | undefined`:

- `TableCommand[]` - One batch containing: clear segments for every existing merge not exactly matched by a map entry, plus span SETs for every map entry
- `undefined` - If the table already matches the map (nothing to change)

**Mirror behavior:** the returned commands are also applied to the planner's internal mirror automatically, so `forEachMainMergedCell()` reports exactly the map entries afterward.

## Validation Behavior

Validation is fail-fast: when any rule above is violated, the method throws **before generating any command** — the internal mirror and the generated-command buffer stay untouched.

```typescript
// All of these throw without mutating anything:
planner.applySpanMap([{ row: 1, col: 1, rowSpan: 0, colSpan: 2 }]) // span < 1
planner.applySpanMap([{ row: -1, col: 0, rowSpan: 1, colSpan: 1 }]) // negative index
planner.applySpanMap([{ row: 4, col: 4, rowSpan: 2, colSpan: 1 }]) // out of bounds (5x5 table)
planner.applySpanMap([
  { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
  { row: 1, col: 1, rowSpan: 2, colSpan: 2 }, // overlaps the first
])
```

**Why validate before generating?** A partial re-lay would be worse than none: the caller can catch the error and keep using the original layout, with mirror and state still in agreement. Note this differs from `merge()`, which silently expands out-of-bounds rectangles — `applySpanMap()` treats out-of-bounds as invalid input.

## Re-lay Rules

1. **Snapshot existing merges** - All current main merged cells are collected via `forEachMainMergedCell()`
2. **Keep exact matches** - An existing merge whose position and spans exactly match a map entry generates no commands
3. **Clear everything else** - Every existing merge without an exact match is cleared (main spans + footprint placeholder CLEARs)
4. **Set every entry** - Every map entry gets `rowSpan`/`colSpan` SETs on its main cell

**Example — applySpanMap([{ row: 1, col: 1, rowSpan: 3, colSpan: 3 }]) on a table with merges at (1,1) 2×2 and (4,4) 2×2:**

```typescript
// Generated commands:
// 1-5.  CLEAR_CELL_ATTR ... // Clear (1,1) 2x2: spans + placeholders
// 6-10. CLEAR_CELL_ATTR ... // Clear (4,4) 2x2: spans + placeholders
// 11.   SET_CELL_ATTR (1,1, rowSpan, 3)
// 12.   SET_CELL_ATTR (1,1, colSpan, 3)
// (no placeholder SETs — final state matches the map exactly)
```

## Best Practices

1. **Treat the map as the complete layout**
   - Entries you omit are cleared — carry over every span you want to keep when building the map from a previous layout

2. **Catch errors for untrusted input**
   - A throw happens before any mutation, so a `try/catch` around the call leaves the table and planner untouched

3. **Use 1×1 entries to unmerge**
   - Restoring a layout where some cells were previously merged and now are not: include them as 1×1 entries (or leave them out — both clear the merge; the 1×1 form documents intent)

4. **Prefer one batch over many merges for bulk restores**
   - A single validated batch replays faster and keeps the generated-command buffer to one coherent operation

## Common Pitfalls

1. **Treating applySpanMap() as an incremental merge**

   ```typescript
   // BAD: expects existing merges to survive
   planner.applySpanMap([{ row: 0, col: 0, rowSpan: 2, colSpan: 2 }])
   // Every other merge in the table was just cleared!

   // GOOD: pass the complete target layout, or use merge() for a partial edit
   planner.merge(0, 0, 1, 1) // Only touches this region
   ```

2. **Relying on placeholder flags afterward**

   ```typescript
   // BAD: consumer checks isMergedPlaceholder to skip covered cells
   planner.applySpanMap(map) // No placeholder SETs are emitted

   // GOOD: derive covered cells from rowSpan/colSpan, or use merge() per region
   ```

3. **Ignoring validation for dynamic input**

   ```typescript
   // BAD: server data applied unchecked
   planner.applySpanMap(serverMap) // May throw on overlaps or bad spans

   // GOOD: validate or catch, keeping the current layout intact
   try {
     planner.applySpanMap(serverMap)
   } catch (e) {
     console.error('Invalid span map, layout unchanged', e)
   }
   ```

## Complete Example

```typescript
import {
  TableState,
  TableCommandPlanner,
  BuildinStateInterpreter,
} from '@aptx/table-commands-generator'

// Setup
const table = new TableState(6, 6)
const planner = new TableCommandPlanner(table)
const interpreter = new BuildinStateInterpreter(table)

// Scenario 1: Restore a saved layout in one batch
const savedLayout = [
  { row: 0, col: 0, rowSpan: 1, colSpan: 6 }, // full-width header
  { row: 1, col: 1, rowSpan: 3, colSpan: 3 },
]
const cmds = planner.applySpanMap(savedLayout)
if (cmds) {
  interpreter.applyCommands(cmds)
  console.log(`Restored layout with ${cmds.length} commands`)
}

// Mirror reports exactly the map entries:
const merges: Array<{
  row: number
  col: number
  rowSpan: number
  colSpan: number
}> = []
planner.forEachMainMergedCell((info) => merges.push(info))
console.log(merges) // [{ row: 0, col: 0, rowSpan: 1, colSpan: 6 }, { row: 1, col: 1, rowSpan: 3, colSpan: 3 }]

// Scenario 2: 1x1 entry clears a previous merge at that cell
const layout2 = [{ row: 1, col: 1, rowSpan: 1, colSpan: 1 }]
const cmds2 = planner.applySpanMap(layout2)
if (cmds2) {
  interpreter.applyCommands(cmds2)
  console.log(table.getCell(1, 1)) // undefined — merge cleared
}

// Scenario 3: Snapshot & restore round-trip
function captureLayout(planner: TableCommandPlanner) {
  const spans: Array<{
    row: number
    col: number
    rowSpan: number
    colSpan: number
  }> = []
  planner.forEachMainMergedCell((info) => spans.push(info))
  return spans
}

function restoreLayout(
  planner: TableCommandPlanner,
  spans: ReturnType<typeof captureLayout>,
) {
  const cmds = planner.applySpanMap(spans)
  if (cmds) {
    // Execute through your interpreter as usual
  }
  return cmds
}

// Scenario 4: Safe restore with validation error handling
function safeRestore(
  planner: TableCommandPlanner,
  map: Parameters<TableCommandPlanner['applySpanMap']>[0],
): boolean {
  try {
    const cmds = planner.applySpanMap(map)
    return cmds === undefined // undefined = layout already matched
  } catch (e) {
    console.error('Span map rejected, table unchanged:', e)
    return false
  }
}
```

## Related APIs

- `TableCommandPlanner.merge()` - Merge a single region (with placeholder marking)
- `TableCommandPlanner.mergeSpanOnly()` - Merge a single region without placeholder marking
- `TableCommandPlanner.unmerge()` - Clear one merge
- `TableCommandPlanner.forEachMainMergedCell()` - Read the current layout (e.g. to build a map)
