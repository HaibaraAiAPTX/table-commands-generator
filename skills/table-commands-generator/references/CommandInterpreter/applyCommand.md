# CommandInterpreter.applyCommand

## Declaration

```typescript
public applyCommand(cmd: TableCommand): void
```

## Description

执行单个命令，根据命令类型分派到对应的处理器。

## Usage Scenarios

- 执行单个表格操作
- 作为批量执行的基础方法

## Example Code

```typescript
const interpreter = new BuildinStateInterpreter(tableState)

interpreter.applyCommand({ type: 'INSERT_ROW', index: 2, count: 1 })
interpreter.applyCommand({
  type: 'SET_CELL_ATTR',
  row: 2,
  col: 0,
  attr: 'colSpan',
  value: 2,
})
```
