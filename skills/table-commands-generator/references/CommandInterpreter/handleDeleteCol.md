# CommandInterpreter.handleDeleteCol (Abstract)

## Declaration

```typescript
protected abstract handleDeleteCol(index: number, count: number): void | Promise<void>
```

## Description

抽象方法，子类需要实现删除列的具体逻辑。

## Usage Scenarios

- 子类实现自定义的列删除逻辑
