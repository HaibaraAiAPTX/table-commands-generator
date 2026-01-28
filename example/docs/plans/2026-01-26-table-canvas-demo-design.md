# Table-Core Canvas 测试项目设计

**日期:** 2026-01-26
**目标:** 创建一个 React + TypeScript 项目，使用 Canvas 渲染表格，测试 @aptx/table-commands-generator 的功能

---

## 项目概述

创建一个交互式表格应用，验证 table-core skill 的效果。项目使用 Canvas 渲染表格，支持单元格选择、范围选择、合并/拆分、行列增删等操作，并实时显示生成的命令。

---

## 技术栈

- **框架:** React 18 + TypeScript
- **构建工具:** Vite
- **核心库:** @aptx/table-commands-generator
- **渲染:** HTML5 Canvas
- **状态管理:** React Hooks

---

## 项目结构

```
src/
├── components/
│   ├── TableCanvas.tsx          # Canvas 渲染组件
│   ├── TableControls.tsx        # 操作面板
│   ├── CommandLog.tsx           # 命令日志组件
│   └── TableConfig.tsx          # 初始配置组件
├── hooks/
│   ├── useTableState.ts         # 表格状态管理 hook
│   └── useCanvasInteraction.ts  # Canvas 交互 hook
├── utils/
│   ├── canvasRenderer.ts        # Canvas 绘制工具
│   └── selectionManager.ts      # 选区管理工具
├── types/
│   └── index.ts                # 类型定义
├── App.tsx                     # 主应用组件
└── main.tsx                    # 入口文件
```

---

## 架构设计

### 数据层

#### 1. table-core (TableState + TableCommandPlanner)
- **职责:** 管理表格结构、合并信息
- **API:**
  - `insertRow(index, count)` - 插入行
  - `insertCol(index, count)` - 插入列
  - `deleteRow(index, count)` - 删除行
  - `deleteCol(index, count)` - 删除列
  - `merge(startRow, startCol, endRow, endCol)` - 合并单元格
  - `unmerge(row, col)` - 拆分单元格
- **输出:** 可序列化的命令数组

#### 2. React State (useTableState hook)
- **职责:** 存储单元格内容、初始配置、命令历史
- **状态:**
  ```typescript
  {
    cellContents: Map<number, Map<number, string>>,  // 单元格文本
    rowCount: number,                                 // 行数
    colCount: number,                                 // 列数
    commandHistory: TableCommand[][],                 // 命令历史
    selection: Selection,                            // 当前选区
    editingCell: { row: number; col: number } | null // 编辑中的单元格
  }
  ```

### 渲染层

#### TableCanvas 组件

**职责:**
- 使用 Canvas 绘制表格
- 渲染网格线、单元格内容、合并单元格
- 处理选区高亮
- 支持单元格编辑模式

**绘制流程:**
```
1. 获取表格数据: tableState.getGridData()
2. 遍历所有单元格 (0..maxRow, 0..maxCol):
   - 如果 cell.isMergedPlaceholder → 跳过
   - 如果 cell.merge → 绘制合并区域 (rowSpan × colSpan)
   - 否则 → 绘制单个单元格
3. 绘制选区（如果存在）:
   - 计算选区矩形
   - 绘制半透明蓝色高亮
4. 绘制编辑框（如果处于编辑模式）
```

**Canvas 绘制参数:**
- 单元格宽度: 100px
- 单元格高度: 40px
- 网格线颜色: #e0e0e0
- 选区颜色: rgba(59, 130, 246, 0.2)
- 文字颜色: #333
- 字体: 14px sans-serif

### 交互层

#### 鼠标事件处理

**事件映射:**
| 事件 | 操作 |
|------|------|
| `mousedown` | 开始选择，记录起始单元格 (startRow, startCol) |
| `mousemove` | 更新选区（如果处于拖拽状态） |
| `mouseup` | 结束选择，记录结束单元格 (endRow, endCol) |
| `dblclick` | 进入单元格编辑模式 |
| `keydown` (Enter) | 保存编辑内容 |
| `keydown` (Escape) | 取消编辑 |

#### 选区管理

**选区状态:**
```typescript
interface Selection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  active: boolean  // 是否处于拖拽状态
}
```

**选区规范化:**
- 确保始终 `startRow ≤ endRow` 和 `startCol ≤ endCol`
- 用于计算选区行数和列数

### 操作层

#### TableControls 组件

**职责:** 提供操作按钮，基于当前选区执行表格操作

**操作按钮:**
| 操作 | 按钮文本 | 调用方法 | 参数 |
|------|---------|---------|------|
| 插入行 | "插入行" | `planner.insertRow` | `selection.startRow, 1` |
| 插入列 | "插入列" | `planner.insertCol` | `selection.startCol, 1` |
| 删除行 | "删除行" | `planner.deleteRow` | `selection.startRow, selection.endRow - selection.startRow + 1` |
| 删除列 | "删除列" | `planner.deleteCol` | `selection.startCol, selection.endCol - selection.startCol + 1` |
| 合并 | "合并单元格" | `planner.merge` | `selection.startRow, selection.startCol, selection.endRow, selection.endCol` |
| 拆分 | "拆分单元格" | `planner.unmerge` | `selection.startRow, selection.startCol` |

**命令执行流程:**
```
用户点击操作按钮
  → 调用 planner 方法（基于当前选区）
  → 获取生成的命令: commands = planner.getCommands()
  → 执行命令: interpreter.applyCommands(commands)
  → 保存命令到历史: setCommandHistory([...])
  → 触发 Canvas 重新渲染
  → 更新命令日志显示
```

### 命令日志

#### CommandLog 组件

**职责:** 显示所有生成的命令

**显示内容:**
- JSON 格式化的命令数组
- 可折叠显示每个命令的详情
- 显示命令类型和关键参数

**UI 结构:**
```
[命令日志面板]
  ├─ 操作 #1: INSERT_ROW
  │  └─ { "type": "INSERT_ROW", "index": 2, "count": 1 }
  ├─ 操作 #2: MERGE
  │  ├─ { "type": "SET_CELL_ATTR", ... }
  │  ├─ { "type": "SET_CELL_ATTR", ... }
  │  └─ ...
  └─ ...
```

---

## 单元格编辑

### 编辑模式流程

**触发:** 双击单元格

**状态切换:**
```
普通模式 → 编辑模式
  - 显示输入框（覆盖单元格位置）
  - 聚焦输入框
  - 加载当前单元格内容
```

**保存编辑:**
```
编辑模式 → 普通模式
  - 失去焦点 或 按 Enter
  - 更新 cellContents Map
  - 触发 Canvas 重新渲染
```

**取消编辑:**
```
编辑模式 → 普通模式
  - 按 Escape
  - 不更新内容
  - 隐藏输入框
```

---

## 初始配置

### TableConfig 组件

**职责:** 允许用户设置初始表格尺寸

**输入:**
- 初始行数（默认: 10）
- 初始列数（默认: 10）

**操作:**
- 点击"创建表格"按钮
- 初始化 TableState
- 重置所有状态
- 显示表格和操作面板

---

## 类型定义

### 核心类型

```typescript
// 选区状态
interface Selection {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  active: boolean
}

// 单元格内容映射
type CellContent = Map<number, Map<number, string>>

// 表格状态
interface TableData {
  rowCount: number
  colCount: number
  cellContents: CellContent
  selection: Selection
  commandHistory: TableCommand[][]
  editingCell: { row: number; col: number } | null
}

// Canvas 尺寸配置
interface CanvasConfig {
  cellWidth: number
  cellHeight: number
  gridColor: string
  selectionColor: string
  textColor: string
  fontSize: number
  fontFamily: string
}
```

---

## 验证目标

项目需要验证以下 table-core skill 的能力：

1. **数据管理:**
   - ✅ 初始化表格状态
   - ✅ 获取表格渲染数据
   - ✅ 稀疏存储的高效性

2. **行列操作:**
   - ✅ 插入行/列
   - ✅ 删除行/列
   - ✅ 自动调整合并单元格

3. **合并操作:**
   - ✅ 合并单元格
   - ✅ 拆分单元格
   - ✅ 处理重叠合并

4. **命令生成:**
   - ✅ 生成正确的命令序列
   - ✅ 命令可序列化
   - ✅ 命令可重放

5. **AI 理解能力:**
   - ✅ 能否不阅读源码，仅凭 skill 文档实现功能
   - ✅ 生成的代码是否符合 TypeScript 类型安全
   - ✅ 代码质量和结构

---

## 实施计划

### 阶段 1: 项目初始化
- [ ] 创建 Vite + React + TypeScript 项目
- [ ] 安装依赖: @aptx/table-commands-generator
- [ ] 创建项目结构目录
- [ ] 配置 TypeScript 类型

### 阶段 2: 数据层实现
- [ ] 创建 useTableState hook
- [ ] 初始化 TableState 和 TableCommandPlanner
- [ ] 实现命令历史管理
- [ ] 实现选区状态管理

### 阶段 3: Canvas 渲染
- [ ] 创建 TableCanvas 组件
- [ ] 实现 canvasRenderer.ts 绘制工具
- [ ] 绘制基础网格
- [ ] 绘制单元格内容
- [ ] 处理合并单元格渲染

### 阶段 4: 交互层
- [ ] 创建 useCanvasInteraction hook
- [ ] 实现鼠标事件处理
- [ ] 实现选区管理
- [ ] 实现单元格编辑模式

### 阶段 5: 操作面板
- [ ] 创建 TableControls 组件
- [ ] 实现行列操作按钮
- [ ] 实现合并/拆分按钮
- [ ] 集成命令执行流程

### 阶段 6: 命令日志
- [ ] 创建 CommandLog 组件
- [ ] 实现 JSON 格式化显示
- [ ] 实现命令历史记录

### 阶段 7: 初始配置
- [ ] 创建 TableConfig 组件
- [ ] 实现表格尺寸配置
- [ ] 实现表格初始化逻辑

### 阶段 8: 集成和测试
- [ ] 集成所有组件
- [ ] 创建 App.tsx 主应用
- [ ] 测试所有功能
- [ ] 验证命令生成正确性
- [ ] 优化用户体验

---

## 成功标准

项目完成时，应该能够：

1. ✅ 使用 Canvas 正确渲染表格（包括合并单元格）
2. ✅ 通过鼠标选择单个或多个单元格
3. ✅ 基于选区执行所有操作（行列增删、合并拆分）
4. ✅ 实时显示生成的命令（JSON 格式）
5. ✅ 双击单元格编辑内容
6. ✅ 可配置初始表格尺寸
7. ✅ 所有操作正确更新表格状态

---

## 注意事项

### table-core 特性
- **稀疏存储:** 空单元格不存储，节省内存
- **自动合并调整:** 插入/删除行列时自动调整合并单元格
- **静默验证:** 无效操作返回 undefined，不抛出异常
- **命令序列:** 每个操作可能生成多个命令

### Canvas 注意事项
- **性能优化:** 使用 requestAnimationFrame 优化重绘
- **坐标转换:** 正确处理屏幕坐标到表格坐标的转换
- **合并单元格:** 跳过 placeholder 单元格的绘制

### React 注意事项
- **状态同步:** 确保 table-core 状态和 React 状态同步
- **命令累积:** 使用 `autoClear: false` 累积命令，或每次调用后立即获取
- **内存管理:** Map 类型状态需要正确复制和更新
