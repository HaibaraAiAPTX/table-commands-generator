---
'@aptx/table-commands-generator': minor
---

Add `TableCommandPlanner.applyCommandsToCore()`: apply an externally authored command batch to the planner's internal mirror state so subsequent decisions (e.g. `forEachMainMergedCell`, `unmerge`, insert/delete span adjustments) stay in sync; the fed batch is not appended to the generated-command buffer.
