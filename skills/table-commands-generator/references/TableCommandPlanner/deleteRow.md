# TableCommandPlanner.deleteRow

## Declaration

```typescript
public deleteRow(r: number, count = 1): TableCommand[] | undefined
```

## Description

删除指定位置的行，自动处理受影响的合并单元格。合并单元格可能被收缩或主单元格位置调整。返回生成的命令列表。

## Usage Scenarios

- 删除行并自动调整合并单元格
- 获取生成的命令用于回放或记录

## Example Code

```typescript
const planner = new TableCommandPlanner(tableState)

// 删除第1行（共1行）
const commands = planner.deleteRow(1, 1)
// 受影响的合并单元格会自动调整
```
