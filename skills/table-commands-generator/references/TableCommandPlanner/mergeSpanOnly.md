# TableCommandPlanner.mergeSpanOnly

## Declaration

```typescript
public mergeSpanOnly(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): TableCommand[] | undefined
```

## Purpose

Use `mergeSpanOnly()` to merge a rectangular region exactly like `merge()`, while producing zero `isMergedPlaceholder` marking commands. The main cell's `rowSpan`/`colSpan` are set and pre-existing merges inside the region are still cleared — the only difference from `merge()` is the omitted placeholder-marking segment.

**Why it exists:**

- Consumers that derive covered cells from the main cell's spans (a renderer reading `rowSpan`/`colSpan` already knows which cells are covered) don't need placeholder flags
- Large merges stay compact: a merge of N cells generates 2 span commands instead of 2 + (N - 1) placeholder commands

**When to use:**

- Your renderer/state derives covered cells from the main cell's `rowSpan`/`colSpan`
- You want to minimize command volume for large merges
- Your storage treats placeholder flags as noise you would have to strip anyway

**When NOT to use:**

- Downstream interpreters rely on `isMergedPlaceholder` to know which cells are covered — use `merge()` so the covered cells are marked
- Shared consumers read the table state directly and expect placeholder flags on covered cells

## Parameters

Same contract as `merge()` — see [merge.md](merge.md) for full parameter documentation.

### `startRow: number` (required)

Row index of the top-left corner of the merge region. Keep `startRow <= endRow` (see `merge()` for coordinate validation).

### `startCol: number` (required)

Column index of the top-left corner of the merge region. Keep `startCol <= endCol`.

### `endRow: number` (required)

Row index of the bottom-right corner, inclusive. May exceed the current table size (expands like `merge()`).

### `endCol: number` (required)

Column index of the bottom-right corner, inclusive. May exceed the current table size (expands like `merge()`).

## Return Value

Returns `TableCommand[] | undefined`:

- `TableCommand[]` - Commands for the pre-clear segment (if pre-existing merges were in the region) plus the main cell span SET commands
- `undefined` - If no commands are needed (region already merged as specified, or a degenerate rectangle with nothing to change)

**Mirror behavior:** the returned commands are also applied to the planner's internal mirror automatically, exactly like `merge()`. The resulting mirror matches `merge()`'s result except that covered cells carry no `isMergedPlaceholder` flag.

## Command Output

### Emitted

1. **Pre-clear segment** (identical to `merge()`): for every pre-existing merge whose **main cell lies inside** the region — main cell `rowSpan`/`colSpan` CLEARs plus `isMergedPlaceholder` CLEARs across its old footprint. Merges anchored outside the region survive, footprint-overlapping or not
2. **Span segment**: `SET_CELL_ATTR` for `rowSpan` and `colSpan` on the main cell

### Never emitted

- `SET_CELL_ATTR` with `attr: 'isMergedPlaceholder'` — this is the defining property of the method

**Example — mergeSpanOnly(1, 1, 2, 3) on an empty table:**

```typescript
// Generated commands:
// 1. SET_CELL_ATTR (1,1, rowSpan, 2)
// 2. SET_CELL_ATTR (1,1, colSpan, 3)
// (merge() would additionally emit 5 placeholder SET commands)
```

## Edge Behavior

| Case                                       | Behavior                                                                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-existing merges anchored in the region | Pre-clear segment kept in full (span + placeholder CLEARs for merges whose main cell lies inside the region), then span SETs; merges anchored outside are untouched even if their footprint overlaps |
| Degenerate 1x1 rectangle                   | Identical command sequence to `merge()` (a 1x1 merge never had placeholder SETs)                                                                                                                     |
| Out-of-bounds rectangle                    | Expands like `merge()`, minus the placeholder segment                                                                                                                                                |
| Inverted rectangle (start > end)           | Behaves like `merge()` — validate coordinates before calling to stay within defined behavior                                                                                                         |

## Best Practices

1. **Choose by consumer, not by habit**
   - Placeholder-based consumers → `merge()`
   - Span-derived renderers → `mergeSpanOnly()`
   - Mixing the two entry points on one table is fine; mirror state stays consistent either way (placeholders are simply absent for `mergeSpanOnly()` regions)

2. **Check for `undefined` like with `merge()`**
   - `undefined` usually means the layout already matches — not an error

3. **Execute via the interpreter**
   - Apply the returned batch with your `CommandInterpreter` as usual; do not manipulate cell data by hand

## Common Pitfalls

1. **Placeholder-dependent consumers see unmarked cells**

   ```typescript
   // BAD: renderer checks isMergedPlaceholder to skip covered cells
   const cmds = planner.mergeSpanOnly(0, 0, 3, 3)!
   interpreter.applyCommands(cmds)
   // Covered cells (0,1)..(3,3) have no placeholder flag → renderer renders them

   // GOOD: use merge() when placeholder flags drive the rendering
   const cmds = planner.merge(0, 0, 3, 3)!
   interpreter.applyCommands(cmds)
   ```

2. **Assuming the mirror carries placeholders after mergeSpanOnly()**
   ```typescript
   // The main cell is merged:
   table.getCell(1, 1) // { merge: { rowSpan: 2, colSpan: 3 } }
   // Covered cells are simply empty:
   table.getCell(1, 2) // undefined — no placeholder flag is set
   ```

## Complete Example

```typescript
import {
  TableState,
  TableCommandPlanner,
  BuildinStateInterpreter,
} from '@aptx/table-commands-generator'

// Setup
const table = new TableState(5, 5)
const planner = new TableCommandPlanner(table)
const interpreter = new BuildinStateInterpreter(table)

// Scenario 1: Compact merge for a span-derived renderer
const cmds = planner.mergeSpanOnly(1, 1, 2, 3)
if (cmds) {
  console.log(`Generated ${cmds.length} commands`) // 2 (vs 7 with merge())
  interpreter.applyCommands(cmds)

  const main = table.getCell(1, 1)
  console.log(main?.merge) // { rowSpan: 2, colSpan: 3 }
  console.log(table.getCell(1, 2)) // undefined — no placeholder flag
}

// Scenario 2: Pre-existing merges still get cleared fully
planner.merge(1, 1, 2, 2) // Existing merge with placeholders
interpreter.applyCommands(planner.getCommands()!)

const cmds2 = planner.mergeSpanOnly(1, 1, 3, 3)
if (cmds2) {
  // Batch contains CLEAR_CELL_ATTR for the old main spans and
  // CLEAR_CELL_ATTR isMergedPlaceholder across the old footprint,
  // then the new span SETs — zero placeholder SETs.
  interpreter.applyCommands(cmds2)
  console.log(table.getCell(1, 1)?.merge) // { rowSpan: 3, colSpan: 3 }
}

// Scenario 3: Counting placeholder commands across entry points
function placeholderSetCount(
  commands: ReturnType<TableCommandPlanner['getCommands']>,
): number {
  return commands.filter(
    (c) => c.type === 'SET_CELL_ATTR' && c.attr === 'isMergedPlaceholder',
  ).length
}

console.log(placeholderSetCount(cmds2 ?? [])) // 0
```

## Related APIs

- `TableCommandPlanner.merge()` - Same merge with placeholder marking (choose by consumer needs)
- `TableCommandPlanner.applySpanMap()` - Whole-table span re-lay, also placeholder-free
- `TableCommandPlanner.unmerge()` - Clear a merge at a specific cell
