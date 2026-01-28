# CommandInterpreter.applyCommandsAsync

## Declaration

```typescript
public async applyCommandsAsync(cmds: TableCommand[]): Promise<void>
```

## Description

批量执行命令的异步版本。按顺序执行所有命令，支持异步处理器。

## Usage Scenarios

- 需要异步执行命令的场景（如与后端同步）
- 需要在命令执行间添加延迟或动画

## Example Code

```typescript
const interpreter = new BuildinStateInterpreter(tableState)

await interpreter.applyCommandsAsync([
  { type: 'INSERT_ROW', index: 0, count: 1 },
  { type: 'SET_CELL_ATTR', row: 0, col: 0, attr: 'rowSpan', value: 2 },
])
```
