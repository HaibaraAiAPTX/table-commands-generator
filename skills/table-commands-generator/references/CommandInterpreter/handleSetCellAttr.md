# CommandInterpreter.handleSetCellAttr (Abstract)

## Declaration

```typescript
protected abstract handleSetCellAttr(
  row: number,
  col: number,
  attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
  value: number | boolean | undefined,
): void | Promise<void>
```

## Description

抽象方法，子类需要实现设置单元格属性的具体逻辑。

## Usage Scenarios

- 子类实现自定义的单元格属性设置逻辑
