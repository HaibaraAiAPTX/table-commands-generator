---
name: table-commands-generator
description: "Comprehensive table operation command generator library (@aptx/table-commands-generator). Use when working with table operations including: (1) Inserting/deleting rows and columns, (2) Merging/unmerging cells, (3) Implementing custom command interpreters for different frameworks, (4) Managing sparse table data structures, (5) Recording/replaying table command sequences"
---

# Table Commands Generator API Reference Index

This skill provides comprehensive usage documentation for Table Commands Generator. Each API is documented in detail in the reference files listed below.

## Quick Reference

Use the index below to find the API you need. Each reference file contains:
- When and why to use the API
- Complete parameter documentation
- Best practices and common pitfalls
- Error handling strategies
- Runnable code examples

## API References

### DataStructure

| API | When to Use | Reference |
|-----|-------------|-----------|
| Cell | Defining cell data with merge or placeholder properties | `references/DataStructure/Cell.md` |
| WorksheetData | Working with sparse table data structure (Map-based) | `references/DataStructure/WorksheetData.md` |

### TableState

| API | When to Use | Reference |
|-----|-------------|-----------|
| TableState - constructor | Creating new table instances with sparse storage | `references/TableState/constructor.md` |
| TableState.getCell | Getting cell data at specific position (returns undefined for empty cells) | `references/TableState/getCell.md` |
| TableState.updateCell | Updating cell attributes (merge, placeholder) with partial updates | `references/TableState/updateCell.md` |
| TableState.getRowCount | Getting total row count (virtual boundary) | `references/TableState/getRowCount.md` |
| TableState.getColCount | Getting total column count (virtual boundary) | `references/TableState/getColCount.md` |
| TableState.cellIsEmpty | Checking if a cell is empty (no data or placeholder) | `references/TableState/cellIsEmpty.md` |
| TableState.getGridData | Getting renderable grid data for UI rendering | `references/TableState/getGridData.md` |
| RenderingData | Understanding the structure of renderable table data | `references/TableState/RenderingData.md` |

### Commands

| API | When to Use | Reference |
|-----|-------------|-----------|
| TableCommand | Using the union type for all table commands | `references/Commands/TableCommand.md` |
| StructuralCommand | Working with row/column insert/delete commands | `references/Commands/StructuralCommand.md` |
| CellCommand | Working with cell attribute set/clear commands | `references/Commands/CellCommand.md` |

### CommandInterpreter

| API | When to Use | Reference |
|-----|-------------|-----------|
| CommandInterpreter | Creating custom command interpreters for different frameworks (DOM, database, etc.) | `references/CommandInterpreter/CommandInterpreter.md` |
| CommandInterpreter.applyCommands | Executing commands synchronously in batch | `references/CommandInterpreter/applyCommands.md` |
| CommandInterpreter.applyCommandsAsync | Executing commands asynchronously in batch | `references/CommandInterpreter/applyCommandsAsync.md` |
| CommandInterpreter.applyCommand | Executing a single command | `references/CommandInterpreter/applyCommand.md` |
| CommandInterpreter.handleInsertRow | Implementing row insertion in custom interpreter | `references/CommandInterpreter/handleInsertRow.md` |
| CommandInterpreter.handleInsertCol | Implementing column insertion in custom interpreter | `references/CommandInterpreter/handleInsertCol.md` |
| CommandInterpreter.handleDeleteRow | Implementing row deletion in custom interpreter | `references/CommandInterpreter/handleDeleteRow.md` |
| CommandInterpreter.handleDeleteCol | Implementing column deletion in custom interpreter | `references/CommandInterpreter/handleDeleteCol.md` |
| CommandInterpreter.handleSetCellAttr | Implementing cell attribute setting in custom interpreter | `references/CommandInterpreter/handleSetCellAttr.md` |
| CommandInterpreter.handleClearCellAttr | Implementing cell attribute clearing in custom interpreter | `references/CommandInterpreter/handleClearCellAttr.md` |

### BuildinStateInterpreter

| API | When to Use | Reference |
|-----|-------------|-----------|
| BuildinStateInterpreter | Using the built-in interpreter for TableState (direct in-memory operations) | `references/BuildinStateInterpreter/BuildinStateInterpreter.md` |
| BuildinStateInterpreter - constructor | Creating interpreter instance with TableState | `references/BuildinStateInterpreter/constructor.md` |

### TableCommandPlanner

| API | When to Use | Reference |
|-----|-------------|-----------|
| TableCommandPlanner - constructor | Creating planner for high-level table operations with automatic merged cell handling | `references/TableCommandPlanner/constructor.md` |
| TableCommandPlanner.getCommands | Getting all generated commands without resetting cache | `references/TableCommandPlanner/getCommands.md` |
| TableCommandPlanner.getNewCommandsAndReset | Getting commands and clearing cache for command replay | `references/TableCommandPlanner/getNewCommandsAndReset.md` |
| TableCommandPlanner.forEachMainMergedCell | Iterating over merged cells (main cells only, not placeholders) | `references/TableCommandPlanner/forEachMainMergedCell.md` |
| TableCommandPlanner.insertRow | Inserting rows with automatic merged cell adjustment | `references/TableCommandPlanner/insertRow.md` |
| TableCommandPlanner.insertCol | Inserting columns with automatic merged cell adjustment | `references/TableCommandPlanner/insertCol.md` |
| TableCommandPlanner.deleteRow | Deleting rows with automatic merged cell adjustment | `references/TableCommandPlanner/deleteRow.md` |
| TableCommandPlanner.deleteCol | Deleting columns with automatic merged cell adjustment | `references/TableCommandPlanner/deleteCol.md` |
| TableCommandPlanner.merge | Merging cells with automatic unmerge of overlapping cells | `references/TableCommandPlanner/merge.md` |
| TableCommandPlanner.unmerge | Unmerging previously merged cells | `references/TableCommandPlanner/unmerge.md` |
