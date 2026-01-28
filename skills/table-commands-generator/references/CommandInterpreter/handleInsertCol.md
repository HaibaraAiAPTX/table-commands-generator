# CommandInterpreter.handleInsertCol (Abstract)

## Declaration

```typescript
protected abstract handleInsertCol(index: number, count: number): void | Promise<void>
```

## Description

抽象方法，子类需要实现插入列的具体逻辑。

## Usage Scenarios

- 子类实现自定义的列插入逻辑
