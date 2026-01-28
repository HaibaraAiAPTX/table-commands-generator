# Table Commands Generator - Skill 优化指南

本指南为 AI 辅助使用 `@aptx/table-commands-generator` 库提供深度参考，补充核心 SKILL.md 中未涵盖的关键细节。

## 目录

- [核心概念深度解析](#核心概念深度解析)
- [重要行为细节](#重要行为细节)
- [完整使用场景](#完整使用场景)
- [性能优化指南](#性能优化指南)
- [扩展开发指南](#扩展开发指南)
- [常见陷阱与调试](#常见陷阱与调试)

---

## 核心概念深度解析

### 1. 稀疏存储 (Sparse Storage)

**实现机制**：`Map<number, Map<number, Cell>>`

```typescript
// 只存储非空单元格
table.data = Map {
  0 => Map {    // 第 0 行
    0 => Cell { merge: { rowSpan: 2, colSpan: 3 } },  // 只有 (0,0) 有数据
    2 => Cell { isMergedPlaceholder: true }            // (0,2) 被合并覆盖
  },
  1 => Map {    // 第 1 行
    0 => Cell { isMergedPlaceholder: true }            // (1,0) 被合并覆盖
    2 => Cell { isMergedPlaceholder: true }            // (1,2) 被合并覆盖
  }
  // 第 2 行不存在（整行都空）
}
```

**关键点**：
- `getCell(row, col)` 返回 `undefined` 表示单元格完全空白
- `updateCell` 会自动删除空单元格以保持稀疏性（`TableState.ts:66-74`）
- `maxRow`/`maxCol` 维护虚拟边界，不等于实际存储的单元格数量

### 2. 合并单元格表示

**主单元格 (Main Cell)**：合并区域的左上角
```typescript
{
  merge: {
    rowSpan: 2,  // 向下跨越 2 行（包含自己）
    colSpan: 3   // 向右跨越 3 列（包含自己）
  }
}
```

**占位符单元格 (Placeholder)**：被主单元格覆盖的位置
```typescript
{
  isMergedPlaceholder: true
}
```

**坐标计算**：
```
主单元格: (startRow, startCol)
覆盖区域: [startRow, startRow + rowSpan - 1] × [startCol, startCol + colSpan - 1]
```

**示例**：
```typescript
// merge(0, 0, 1, 2) 合并从 (0,0) 到 (1,2) 的区域
rowSpan = 1 - 0 + 1 = 2
colSpan = 2 - 0 + 1 = 3

// 主单元格在 (0,0)
// 占位符在: (0,1), (0,2), (1,0), (1,1), (1,2)
```

### 3. 坐标系统

**0-based 索引**：
```typescript
// 创建 5×5 表格
const table = new TableState(5, 5)
// 实际坐标: 0-4 行, 0-4 列
// maxRow = 4, maxCol = 4
```

**边界行为**：
- 插入/删除操作**不进行边界检查**（planner 层）
- 解释器层会忽略超出边界的操作（`BuildinStateInterpreter.ts:52-75`）

---

## 重要行为细节

### 1. AutoClear 行为

**默认行为** (`autoClear: true`)：
```typescript
const planner = new TableCommandPlanner(table) // autoClear = true

planner.merge(0, 0, 1, 1)
planner.getCommands() // [merge commands]

planner.insertRow(2, 1)
planner.getCommands() // [insertRow commands] - 之前的 merge 命令被清空！
```

**禁用自动清理** (`autoClear: false`)：
```typescript
const planner = new TableCommandPlanner(table, { autoClear: false })

planner.merge(0, 0, 1, 1)
planner.insertRow(2, 1)
planner.getCommands() // [merge commands, insertRow commands]
```

**使用场景**：
- 启用：单次操作，不需要积累命令
- 禁用：批量操作，需要导出完整命令序列

### 2. 合并单元格调整规则

#### 插入行 (`insertRow`)

**扩展规则**（`TableCommandPlanner.ts:94-99`）：
```
如果合并单元格满足：
  主单元格行号 < 插入位置 <= 主单元格行号 + rowSpan - 1

则：rowSpan += count

示例：
  合并单元格 (0,0) 跨越 2 行 (rowSpan=2)，覆盖行 0-1
  在位置 1 插入 1 行
  结果：rowSpan = 3，覆盖行 0-2
```

**占位符创建**（`TableCommandPlanner.ts:112-122`）：
```typescript
// 为插入的新行创建占位符
for (let insertedRow = r; insertedRow < r + count; insertedRow++) {
  for (let cc = a.col; cc < a.col + a.colSpan; cc++) {
    push({
      type: 'SET_CELL_ATTR',
      row: insertedRow,
      col: cc,
      attr: 'isMergedPlaceholder',
      value: true
    })
  }
}
```

#### 删除行 (`deleteRow`)

**三种情况**（`TableCommandPlanner.ts:214-244`）：

1. **完全在删除区域上方**：无影响
```
合并单元格行 0-1，删除行 3-4 → 无变化
```

2. **完全在删除区域下方**：向上移动
```
合并单元格行 5-6，删除行 2-3 → 移动到行 3-4
```

3. **与删除区域重叠**：
   - **主单元格在删除区域内**：收缩并移动主单元格到删除区域起始位置
   - **主单元格在删除区域上方**：只收缩 rowSpan

**特殊情况**（`TableCommandPlanner.ts:224-226`）：
```typescript
const newRowSpan = info.rowSpan - overlapCount
if (newRowSpan <= 0) {
  return // 整个合并单元格被删除，不生成任何命令
}
```

#### 插入列/删除列

逻辑与行操作对称，参考 `TableCommandPlanner.ts:138-180` 和 `TableCommandPlanner.ts:305-412`

### 3. 命令执行顺序

**结构性命令优先**：
```typescript
// insertRow 生成的命令顺序：
1. INSERT_ROW          // 先执行结构性变更
2. SET_CELL_ATTR       // 然后调整合并单元格的 rowSpan
3. SET_CELL_ATTR (×N)  // 最后为新插入的单元格设置占位符
```

**原因**：结构性命令会移动数据，必须先完成才能正确设置单元格属性

### 4. 合并重叠区域的自动解合并

**行为**（`TableCommandPlanner.ts:432-463`）：
```typescript
planner.merge(0, 0, 2, 2)  // 合并 (0,0) 到 (2,2)

// 如果区域内已有其他合并单元格，会自动解合并
// 例如：(1,1) 处有一个 2×2 的合并单元格
// 生成的命令会：
// 1. 清除 (1,1) 的 merge 属性
// 2. 清除 (1,1) 覆盖的所有占位符
// 3. 创建新的 3×3 合并单元格
```

---

## 完整使用场景

### 场景 1：初始化表格

```typescript
import { TableState, TableCommandPlanner } from '@aptx/table-commands-generator'

// 创建空表格
const table = new TableState(10, 10)  // 10 行 × 10 列
const planner = new TableCommandPlanner(table)

// 创建标题行合并
planner.merge(0, 0, 0, 9)  // 标题跨所有列
const titleCommands = planner.getCommands()

// 创建数据区域合并
planner.merge(1, 0, 4, 2)  // 左侧数据区
planner.merge(1, 3, 4, 9)  // 右侧数据区
const dataCommands = planner.getCommands()

// 获取渲染数据
const grid = table.getGridData()
console.log(`表格: ${grid.rows} 行 × ${grid.cols} 列`)
```

### 场景 2：批量操作（禁用自动清理）

```typescript
const planner = new TableCommandPlanner(table, { autoClear: false })

// 执行多个操作
planner.merge(0, 0, 1, 1)
planner.insertRow(2, 1)
planner.merge(3, 3, 4, 4)

// 获取所有命令
const allCommands = planner.getCommands()

// 保存到后端
fetch('/api/save-operations', {
  method: 'POST',
  body: JSON.stringify({ commands: allCommands })
})

// 重置命令缓存
planner.getNewCommandsAndReset()
```

### 场景 3：命令重放（撤销/重做）

```typescript
class TableHistory {
  private undoStack: TableCommand[][] = []
  private redoStack: TableCommand[][] = []

  constructor(
    private table: TableState,
    private planner: TableCommandPlanner,
    private interpreter: BuildinStateInterpreter
  ) {}

  execute() {
    const commands = this.planner.getNewCommandsAndReset()
    if (commands) {
      this.undoStack.push(commands)
      this.redoStack = [] // 清空 redo 栈
    }
  }

  undo() {
    const commands = this.undoStack.pop()
    if (commands) {
      // 生成反向命令（简化版）
      const reverseCommands = this.generateReverse(commands)
      this.interpreter.applyCommands(reverseCommands)
      this.redoStack.push(commands)
    }
  }

  redo() {
    const commands = this.redoStack.pop()
    if (commands) {
      this.interpreter.applyCommands(commands)
      this.undoStack.push(commands)
    }
  }

  private generateReverse(commands: TableCommand[]): TableCommand[] {
    // 实现反向命令生成逻辑
    // 这里需要根据具体命令类型生成反向操作
    return []
  }
}
```

### 场景 4：与 React 集成

```typescript
import React, { useState, useCallback } from 'react'
import { TableState, TableCommandPlanner, BuildinStateInterpreter } from '@aptx/table-commands-generator'

function TableComponent() {
  const [table] = useState(() => new TableState(10, 10))
  const [planner] = useState(() => new TableCommandPlanner(table))
  const [interpreter] = useState(() => new BuildinStateInterpreter(table))
  const [, forceUpdate] = useState({})

  const refresh = useCallback(() => forceUpdate({}), [])

  const handleMerge = useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    planner.merge(startRow, startCol, endRow, endCol)
    refresh()
  }, [planner, refresh])

  const handleInsertRow = useCallback((index: number) => {
    planner.insertRow(index, 1)
    refresh()
  }, [planner, refresh])

  const grid = table.getGridData()

  return (
    <table>
      <tbody>
        {Array.from({ length: grid.rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: grid.cols }).map((_, c) => {
              const cell = grid.cells.get(r)?.get(c)
              if (cell?.isMergedPlaceholder) return null

              const rowSpan = cell?.merge?.rowSpan ?? 1
              const colSpan = cell?.merge?.colSpan ?? 1

              return (
                <td
                  key={`${r}-${c}`}
                  rowSpan={rowSpan}
                  colSpan={colSpan}
                >
                  {/* 单元格内容 */}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## 性能优化指南

### 1. 稀疏存储的性能优势

**最佳使用场景**：
- 大型稀疏表格（1000×1000 以上，但大部分单元格为空）
- 合并单元格较多的表格
- 需要频繁增删行列的表格

**性能对比**：
```typescript
// 稀疏存储（当前实现）
table.getCell(999, 999)  // O(1) - 直接 Map 查找
table.updateCell(999, 999, {})  // O(1) - 直接 Map 更新

// 二维数组（替代方案）
const grid = Array(1000).fill(null).map(() => Array(1000).fill(null))
grid[999][999]  // O(1) 数组访问，但内存占用 1000×1000
```

**内存估算**：
- 稀疏存储：只存储非空单元格
- 1000×1000 表格，100 个合并单元格 ≈ 几百 KB
- 二维数组：固定 1000×1000 ≈ 几十 MB

### 2. forEachMainMergedCell 的性能

**实现**（`TableCommandPlanner.ts:62-78`）：
```typescript
public forEachMainMergedCell(visitor: (info: MergeCellInfo) => void) {
  const rows = this.core.getRowCount()
  const cols = this.core.getColCount()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = this.core.getCell(r, c)
      if (cell?.merge) {
        visitor({ row: r, col: c, rowSpan: cell.merge.rowSpan, colSpan: cell.merge.colSpan })
      }
    }
  }
}
```

**时间复杂度**：O(R × C)，其中 R = 行数，C = 列数

**优化建议**：
```typescript
// ❌ 避免在循环中调用
for (let i = 0; i < 100; i++) {
  planner.forEachMainMergedCell(...) // O(100 × R × C)
}

// ✅ 缓存结果
const mergedCells: MergeCellInfo[] = []
planner.forEachMainMergedCell(info => mergedCells.push(info))
// 后续使用 mergedCells 数组
```

### 3. 命令缓存管理

**内存泄漏风险**：
```typescript
const planner = new TableCommandPlanner(table, { autoClear: false })

// 执行 10000 次操作
for (let i = 0; i < 10000; i++) {
  planner.insertRow(i, 1)
  // generatedCommands 持续增长！
}

// generatedCommands 可能包含数万个命令对象
```

**解决方案**：
```typescript
// 方案 1：定期清理
const planner = new TableCommandPlanner(table, { autoClear: false })
for (let i = 0; i < 10000; i++) {
  planner.insertRow(i, 1)
  if (i % 100 === 0) {
    planner.getNewCommandsAndReset() // 每 100 次清理一次
  }
}

// 方案 2：手动管理命令数组
const allCommands: TableCommand[] = []
for (let i = 0; i < 10000; i++) {
  planner.insertRow(i, 1)
  const commands = planner.getNewCommandsAndReset()
  if (commands) {
    allCommands.push(...commands)
  }
}
```

### 4. 批量操作优化

**当前实现**：每次操作都会执行命令
```typescript
planner.merge(0, 0, 1, 1)
// 内部调用 interpreter.applyCommands(newly)
```

**优化方案**：手动控制执行时机
```typescript
const planner = new TableCommandPlanner(table, { autoClear: false })

// 只生成命令，不执行
const commands1 = planner.merge(0, 0, 1, 1)
const commands2 = planner.merge(2, 2, 3, 3)

// 一次性执行所有命令
const allCommands = [...(commands1 || []), ...(commands2 || [])]
interpreter.applyCommands(allCommands)
```

---

## 扩展开发指南

### 1. 自定义 CommandInterpreter 模板

#### 场景：直接 DOM 操作

```typescript
class DOMTableInterpreter extends CommandInterpreter {
  constructor(private tableElement: HTMLTableElement) {
    super()
  }

  protected handleInsertRow(index: number, count: number): void {
    const rows = this.tableElement.querySelectorAll('tr')
    const templateRow = rows[0]

    for (let i = 0; i < count; i++) {
      const newRow = templateRow.cloneNode(true) as HTMLTableRowElement
      // 清空单元格内容
      Array.from(newRow.children).forEach(cell => {
        cell.textContent = ''
        cell.removeAttribute('rowspan')
        cell.removeAttribute('colspan')
      })

      if (rows[index]) {
        this.tableElement.querySelector('tbody')?.insertBefore(newRow, rows[index])
      } else {
        this.tableElement.querySelector('tbody')?.appendChild(newRow)
      }
    }
  }

  protected handleInsertCol(index: number, count: number): void {
    const rows = this.tableElement.querySelectorAll('tr')

    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th')
      const templateCell = cells[0]

      for (let i = 0; i < count; i++) {
        const newCell = templateCell.cloneNode(true) as HTMLTableCellElement
        newCell.textContent = ''
        newCell.removeAttribute('rowspan')
        newCell.removeAttribute('colspan')

        if (cells[index]) {
          row.insertBefore(newCell, cells[index])
        } else {
          row.appendChild(newCell)
        }
      }
    })
  }

  protected handleDeleteRow(index: number, count: number): void {
    const rows = this.tableElement.querySelectorAll('tr')

    for (let i = 0; i < count; i++) {
      if (rows[index + i]) {
        rows[index + i].remove()
      }
    }
  }

  protected handleDeleteCol(index: number, count: number): void {
    const rows = this.tableElement.querySelectorAll('tr')

    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th')

      for (let i = 0; i < count; i++) {
        if (cells[index + i]) {
          cells[index + i].remove()
        }
      }
    })
  }

  protected handleSetCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
    value: number | boolean | undefined
  ): void {
    const rows = this.tableElement.querySelectorAll('tr')
    const targetRow = rows[row]
    if (!targetRow) return

    const cells = targetRow.querySelectorAll('td, th')
    const targetCell = cells[col]
    if (!targetCell) return

    switch (attr) {
      case 'rowSpan':
        if (typeof value === 'number' && value > 1) {
          targetCell.setAttribute('rowspan', String(value))
        } else {
          targetCell.removeAttribute('rowspan')
        }
        break
      case 'colSpan':
        if (typeof value === 'number' && value > 1) {
          targetCell.setAttribute('colspan', String(value))
        } else {
          targetCell.removeAttribute('colspan')
        }
        break
      case 'isMergedPlaceholder':
        if (value) {
          targetCell.style.display = 'none'
        } else {
          targetCell.style.display = ''
        }
        break
    }
  }

  protected handleClearCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder'
  ): void {
    const rows = this.tableElement.querySelectorAll('tr')
    const targetRow = rows[row]
    if (!targetRow) return

    const cells = targetRow.querySelectorAll('td, th')
    const targetCell = cells[col]
    if (!targetCell) return

    switch (attr) {
      case 'rowSpan':
        targetCell.removeAttribute('rowspan')
        break
      case 'colSpan':
        targetCell.removeAttribute('colspan')
        break
      case 'isMergedPlaceholder':
        targetCell.style.display = ''
        break
    }
  }
}

// 使用
const tableElement = document.querySelector('table') as HTMLTableElement
const interpreter = new DOMTableInterpreter(tableElement)

// 应用命令
const commands = planner.merge(0, 0, 1, 1)
interpreter.applyCommands(commands || [])
```

#### 场景：数据库持久化

```typescript
class DatabaseInterpreter extends CommandInterpreter {
  constructor(private db: Database, private tableId: string) {
    super()
  }

  protected async handleInsertRow(index: number, count: number): Promise<void> {
    const transaction = this.db.transaction(['cells'], 'readwrite')
    const store = transaction.objectStore('cells')

    // 1. 移动现有行
    const existingCells = await store.getAll(
      IDBKeyRange.bound([this.tableId, index], [this.tableId, Infinity])
    )

    for (const cell of existingCells) {
      const [_, row, col] = cell.key as [string, number, number]
      await store.put({
        ...cell,
        key: [this.tableId, row + count, col]
      })
      await store.delete([this.tableId, row, col])
    }

    // 2. 插入新行（空单元格）
    for (let i = 0; i < count; i++) {
      await store.add({
        key: [this.tableId, index + i, 0],
        value: null
      })
    }
  }

  protected async handleSetCellAttr(
    row: number,
    col: number,
    attr: 'rowSpan' | 'colSpan' | 'isMergedPlaceholder',
    value: number | boolean | undefined
  ): Promise<void> {
    const transaction = this.db.transaction(['cells'], 'readwrite')
    const store = transaction.objectStore('cells')

    const key = [this.tableId, row, col]
    const existing = await store.get(key)

    if (existing) {
      await store.put({
        ...existing,
        [attr]: value
      })
    } else {
      await store.add({
        key,
        [attr]: value
      })
    }
  }

  // ... 实现其他方法
}
```

### 2. 命令序列化

**JSON 序列化方案**：
```typescript
// 序列化
function serializeCommands(commands: TableCommand[]): string {
  return JSON.stringify(commands)
}

// 反序列化
function deserializeCommands(json: string): TableCommand[] {
  return JSON.parse(json) as TableCommand[]
}

// 保存到 localStorage
localStorage.setItem('table-operations', serializeCommands(commands))

// 从 localStorage 恢复
const saved = localStorage.getItem('table-operations')
if (saved) {
  const commands = deserializeCommands(saved)
  interpreter.applyCommands(commands)
}
```

### 3. 远程同步

```typescript
class RemoteSyncInterpreter extends CommandInterpreter {
  constructor(
    private local: CommandInterpreter,
    private apiClient: APIClient
  ) {
    super()
  }

  protected async handleInsertRow(index: number, count: number): Promise<void> {
    // 1. 本地执行
    await this.local.handleInsertRow(index, count)

    // 2. 同步到远程
    try {
      await this.apiClient.post('/table/operations', {
        type: 'INSERT_ROW',
        index,
        count
      })
    } catch (error) {
      // 处理同步失败
      console.error('Sync failed:', error)
    }
  }

  // ... 实现其他方法
}
```

---

## 常见陷阱与调试

### 1. 合并单元格重叠导致数据丢失

**问题**：
```typescript
// 创建两个重叠的合并区域
planner.merge(0, 0, 2, 2)  // 3×3 合并
planner.merge(1, 1, 3, 3)  // 3×3 合并，与第一个重叠

// 第一个合并单元格会被部分解合并，可能导致预期外的行为
```

**解决方案**：
```typescript
// 在合并前检查重叠
function checkOverlap(
  planner: TableCommandPlanner,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): boolean {
  let hasOverlap = false

  planner.forEachMainMergedCell(info => {
    const mergeEndRow = info.row + info.rowSpan - 1
    const mergeEndCol = info.col + info.colSpan - 1

    // 检查矩形重叠
    const overlap = !(
      endRow < info.row ||
      startRow > mergeEndRow ||
      endCol < info.col ||
      startCol > mergeEndCol
    )

    if (overlap) {
      hasOverlap = true
    }
  })

  return hasOverlap
}

// 使用
if (checkOverlap(planner, 1, 1, 3, 3)) {
  console.warn('合并区域与现有合并单元格重叠')
  // 选择：1. 取消操作  2. 先解合并现有区域
}
```

### 2. 删除操作导致合并单元格消失

**问题**：
```typescript
// 创建合并单元格
planner.merge(0, 0, 2, 2)  // rowSpan=3, colSpan=3

// 删除中间行
planner.deleteRow(1, 2)  // 删除行 1-2

// 结果：整个合并单元格消失（newRowSpan <= 0）
```

**原因**（`TableCommandPlanner.ts:224-226`）：
```typescript
const newRowSpan = info.rowSpan - overlapCount
if (newRowSpan <= 0) {
  return // 不生成任何命令，合并单元格直接消失
}
```

**解决方案**：
```typescript
// 在删除前检查影响
function checkDeleteImpact(
  planner: TableCommandPlanner,
  index: number,
  count: number
): MergeCellInfo[] {
  const affected: MergeCellInfo[] = []
  const deleteEnd = index + count - 1

  planner.forEachMainMergedCell(info => {
    const end = info.row + info.rowSpan - 1
    if (end >= index && info.row <= deleteEnd) {
      const overlapStart = Math.max(info.row, index)
      const overlapEnd = Math.min(end, deleteEnd)
      const overlapCount = overlapEnd - overlapStart + 1
      const newRowSpan = info.rowSpan - overlapCount

      if (newRowSpan <= 0) {
        affected.push(info)
      }
    }
  })

  return affected
}

// 使用
const willBeDeleted = checkDeleteImpact(planner, 1, 2)
if (willBeDeleted.length > 0) {
  console.warn('删除操作将移除以下合并单元格:', willBeDeleted)
  // 询问用户确认
}
```

### 3. 占位符清理不完整

**问题**：
```typescript
// 手动操作 TableState 可能导致占位符不一致
table.updateCell(0, 0, { merge: { rowSpan: 2, colSpan: 2 } })
// 忘记设置占位符！

// 结果：渲染时 (0,1), (1,0), (1,1) 不会被跳过
```

**解决方案**：
```typescript
// 始终使用 TableCommandPlanner
planner.merge(0, 0, 1, 1)  // 会自动设置占位符

// 或者手动设置占位符
function setMergePlaceholders(
  table: TableState,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number
) {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      if (r === row && c === col) continue
      table.updateCell(r, c, { isMergedPlaceholder: true })
    }
  }
}
```

### 4. 边界检查问题

**问题**：
```typescript
const table = new TableState(5, 5)  // maxRow=4, maxCol=4

// 以下操作不会报错，但会被忽略
planner.insertRow(10, 1)  // 超出边界
planner.deleteRow(10, 1)  // 超出边界
```

**解决方案**：
```typescript
function validateBounds(table: TableState, row: number, col: number): boolean {
  return row >= 0 && row <= table.maxRow && col >= 0 && col <= table.maxCol
}

// 使用
if (!validateBounds(table, row, col)) {
  throw new Error(`超出边界: (${row}, ${col})`)
}
```

### 5. 调试工具

**命令可视化**：
```typescript
function visualizeCommand(cmd: TableCommand): string {
  switch (cmd.type) {
    case 'INSERT_ROW':
      return `INSERT_ROW at ${cmd.index}, count=${cmd.count}`
    case 'DELETE_ROW':
      return `DELETE_ROW at ${cmd.index}, count=${cmd.count}`
    case 'INSERT_COL':
      return `INSERT_COL at ${cmd.index}, count=${cmd.count}`
    case 'DELETE_COL':
      return `DELETE_COL at ${cmd.index}, count=${cmd.count}`
    case 'SET_CELL_ATTR':
      return `SET_CELL_ATTR (${cmd.row},${cmd.col}) ${cmd.attr}=${cmd.value}`
    case 'CLEAR_CELL_ATTR':
      return `CLEAR_CELL_ATTR (${cmd.row},${cmd.col}) ${cmd.attr}`
  }
}

// 使用
planner.merge(0, 0, 1, 1)
const commands = planner.getCommands()
commands.forEach(cmd => console.log(visualizeCommand(cmd)))
```

**表格状态可视化**：
```typescript
function visualizeTable(table: TableState): void {
  const grid = table.getGridData()

  console.log(`表格: ${grid.rows} 行 × ${grid.cols} 列\n`)

  for (let r = 0; r < grid.rows; r++) {
    let rowStr = `Row ${r}: `
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells.get(r)?.get(c)
      if (cell?.merge) {
        rowStr += `[M:${cell.merge.rowSpan}×${cell.merge.colSpan}] `
      } else if (cell?.isMergedPlaceholder) {
        rowStr += `[P] '
      } else {
        rowStr += `[·] '
      }
    }
    console.log(rowStr)
  }
}

// 使用
visualizeTable(table)
// 输出:
// 表格: 5 行 × 5 列
// Row 0: [M:2×2] [P] [·] [·] [·]
// Row 1: [P] [P] [·] [·] [·]
// Row 2: [·] [·] [·] [·] [·]
// ...
```

---

## 总结

本指南涵盖了 `@aptx/table-commands-generator` 库的核心概念、行为细节、使用场景、性能优化、扩展开发和常见陷阱。作为 AI 辅助开发的参考，建议：

1. **优先使用 TableCommandPlanner**：避免直接操作 TableState
2. **注意合并单元格调整规则**：插入/删除操作会自动调整合并单元格
3. **合理使用 autoClear**：批量操作时禁用，单次操作时启用
4. **自定义 CommandInterpreter**：根据实际需求扩展命令解释器
5. **注意边界情况**：重叠合并单元格、删除导致的数据丢失等

通过理解这些细节，可以更准确地使用本库，避免常见陷阱。
