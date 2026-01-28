# TableCommandPlanner.forEachMainMergedCell

## Declaration

```typescript
public forEachMainMergedCell(visitor: (info: MergeCellInfo) => void): void
```

## Description

遍历所有主合并单元格（左上角单元格），调用 visitor 函数。

## Usage Scenarios

- 查找所有合并区域
- 自定义合并单元格处理逻辑

## Example Code

```typescript
const planner = new TableCommandPlanner(tableState)
tableState.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })

planner.forEachMainMergedCell((info) => {
  console.log(
    `Merged cell at (${info.row}, ${info.col}), ${info.rowSpan}x${info.colSpan}`,
  )
})
```
