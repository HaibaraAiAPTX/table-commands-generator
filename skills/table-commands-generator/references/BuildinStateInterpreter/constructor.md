# BuildinStateInterpreter - constructor

## Declaration

```typescript
constructor(state: TableState)
```

## Description

创建解释器实例，绑定到指定的 TableState 实例。

## Usage Scenarios

- 初始化解释器并关联表格状态

## Example Code

```typescript
const tableState = new TableState()
const interpreter = new BuildinStateInterpreter(tableState)
```
