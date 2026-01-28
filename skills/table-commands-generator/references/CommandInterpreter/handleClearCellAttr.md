# CommandInterpreter.handleClearCellAttr (Abstract)

## Declaration

```typescript
protected abstract handleClearCellAttr(
  row: number,
  col: number,
  attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
): void | Promise<void>
```

## Description

抽象方法，子类需要实现清除单元格属性的具体逻辑。

## Usage Scenarios

- 子类实现自定义的单元格属性清除逻辑
