# TableCommandPlanner.insertCol

## Declaration

```typescript
public insertCol(c: number, count = 1): TableCommand[] | undefined
```

## Description

在指定位置插入列，自动处理受影响的合并单元格。返回生成的命令列表。

## Usage Scenarios

- 插入列并自动调整合并单元格
- 获取生成的命令用于回放或记录

## Example Code

```typescript
const planner = new TableCommandPlanner(tableState)

// 在第3列之前插入2列
const commands = planner.insertCol(3, 2)
// 如果有跨越第3列的合并单元格，会自动扩展它们的 colSpan
```
