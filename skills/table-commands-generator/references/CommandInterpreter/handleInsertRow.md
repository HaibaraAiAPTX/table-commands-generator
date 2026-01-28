# CommandInterpreter.handleInsertRow (Abstract)

## Declaration

```typescript
protected abstract handleInsertRow(index: number, count: number): void | Promise<void>
```

## Description

抽象方法，子类需要实现插入行的具体逻辑。

## Usage Scenarios

- 子类实现自定义的行插入逻辑

## Example Code

```typescript
class MyInterpreter extends CommandInterpreter {
  protected handleInsertRow(index: number, count: number): void {
    // 实现插入行的逻辑
    console.log(`Insert ${count} row(s) at index ${index}`)
  }

  // ... 实现其他抽象方法
}
```
