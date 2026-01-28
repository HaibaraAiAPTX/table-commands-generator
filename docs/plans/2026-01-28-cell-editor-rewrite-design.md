# Cell Editor Rewrite Design (Example)

Date: 2026-01-28

## Goals
- Double-click a cell to enter edit mode.
- Editor covers the full merged area when editing a merged cell.
- Editor layer follows scroll and zoom, staying aligned with the cell.
- Clicking outside commits the edit and restores normal cell rendering.
- Fix the right/bottom gap so the editor border covers grid lines.

## Non-Goals
- Rich text editing.
- Formula support.
- Keyboard navigation beyond Enter/Escape.

## Proposed Architecture
Layer the canvas and editor in a single scaled container:
- Grid layer (canvas): grid lines, selection, merged cell backgrounds.
- Text layer (canvas): cell text only.
- Editor layer (DOM input): positioned in the same coordinate space.

All layers live inside the existing scaled wrapper in `CanvasViewport`, so they share
one coordinate system (unscaled units). The wrapper handles the zoom transform.

## Components and Responsibilities
- `TableCanvas`:
  - Render two canvases: `GridCanvas` and `TextCanvas`.
  - Bind mouse events (selection, double-click) to the grid canvas.
- `CellEditorOverlay`:
  - Render the input inside an overlay container, positioned by `{x, y, width, height}`.
  - Commit on Enter or outside click; cancel on Escape.
- `CanvasViewport`:
  - Keep scroll/zoom behavior; host the three layers in the scaled wrapper.

## Data Flow
- `useTableState` holds:
  - `editingCell: { row, col } | null`
  - `cellContents: Map<row, Map<col, string>>`
- New helper: `getEditingRect(grid, editingCell, config)` returns
  `{ x, y, width, height, rowSpan, colSpan }` using merged cell info.
- Double-click:
  - Map pointer to cell.
  - If in merged area, resolve to the merged main cell.
  - Set `editingCell` to that main cell.
- Render:
  - Grid canvas draws lines, selection, merged backgrounds.
  - Text canvas draws all text except the active editing area.
  - Editor overlay uses `getEditingRect(...)` for position and size.
- Outside click:
  - Commit and clear `editingCell` before handling selection changes.

## Coordinate System and Alignment
- Canvas sizes are in unscaled units:
  - `width = cols * cellWidth`, `height = rows * cellHeight`.
- The scaled wrapper applies `transform: scale(zoom)`.
- Mouse coordinates are converted by dividing by `scale`.
- Editor border should cover grid lines:
  - Position: `x - 1`, `y - 1`.
  - Size: `width + 2`, `height + 2`.

## Error Handling
- If `grid` is null, editor does not render.
- If `editingCell` is set but `getEditingRect` cannot resolve merge info,
  fall back to a 1x1 cell rectangle.

## Testing Plan
- Unit tests:
  - `getEditingRect` with merged cells (rowSpan/colSpan sizing).
  - Editor rectangle border expansion (x/y - 1, width/height + 2).
- Interaction tests:
  - Double-click a merged placeholder resolves to main cell.
  - Text layer skips rendering for the active editing area.
- Manual QA:
  - Zoom 50/125/200 and scroll: editor stays aligned.
  - Clicking outside commits and restores text rendering.

## Rollout Notes
- Keep previous rendering utilities intact; add new text/grid renderers or split
  the existing one to minimize risk.
- Update docs/examples only after visual alignment is verified.
