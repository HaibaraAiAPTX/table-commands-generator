# @aptx/table-commands-generator

## 0.2.0

### Minor Changes

- 70a6788: Add `TableCommandPlanner.applyCommandsToCore()`: apply an externally authored command batch to the planner's internal mirror state so subsequent decisions (e.g. `forEachMainMergedCell`, `unmerge`, insert/delete span adjustments) stay in sync; the fed batch is not appended to the generated-command buffer.
- 522e4af: Add `applySpanMap()` to `TableCommandPlanner`: re-lay the whole table's merge spans in a single batch, without placeholder-marking commands.
- 073a43f: Add `mergeSpanOnly()` to `TableCommandPlanner`: merge rectangle spans without emitting placeholder-marking commands.

## 0.1.5

### Patch Changes

- 区分开 applyCommands 和 applyCommand 方法，将 break 改为 return，新增 applyCommandAsync 方法，方便实现类的异步使用

## 0.1.4

### Patch Changes

- 暴露内部方法

## 0.1.3

### Patch Changes

- 修复合并多个已经合并过的单元格，不能合并成一个更大单元格的bug

## 0.1.2

### Patch Changes

- 修复设置了 rowspan 或 colspan 的单元格有可能还是被合并状态，即时两个参数的值都是1

## 0.1.1

### Patch Changes

- 修改名称，添加返回指令，添加新的获取并重置指令 api