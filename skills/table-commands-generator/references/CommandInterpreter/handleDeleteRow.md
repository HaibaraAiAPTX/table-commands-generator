# CommandInterpreter.handleDeleteRow (Abstract)

## Declaration

```typescript
protected abstract handleDeleteRow(index: number, count: number): void | Promise<void>
```

## Description

抽象方法，子类需要实现删除行的具体逻辑。

## Usage Scenarios

- 子类实现自定义的行删除逻辑
