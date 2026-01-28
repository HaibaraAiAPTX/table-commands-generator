# TableCommandPlanner.unmerge

## Declaration

```typescript
public unmerge(row: number, col: number): TableCommand[] | undefined
```

## Description

拆分指定位置的合并单元格。如果该单元格不是合并单元格，则不执行任何操作。返回生成的命令列表。

## Usage Scenarios

- 拆分合并单元格
- 获取生成的命令用于回放或记录

## Example Code

```typescript
const planner = new TableCommandPlanner(tableState)

// 拆分位于 (0,0) 的合并单元格
const commands = planner.unmerge(0, 0)
```
