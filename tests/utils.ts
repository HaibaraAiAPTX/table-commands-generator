import { RenderingData } from '../src'

/**
 * 根据 TableCore 的 getGridData() 返回的稀疏数据，生成 HTML <table> 字符串。
 * @param renderingData TableCore.getGridData() 的返回数据。
 * @returns 包含渲染后的表格的 HTML 字符串。
 */
export function renderHtmlTable(renderingData: RenderingData): string {
  const { rows, cols, cells } = renderingData
  let html =
    '<style>table td { height: 40px; }</style><table border="1" style="border-collapse: collapse; width: 100%; table-layout: fixed;">'

  for (let r = 0; r < rows; r++) {
    html += '<tr>'

    for (let c = 0; c < cols; c++) {
      // 1. 从稀疏 Map 中获取单元格数据
      const cell = cells.get(r)?.get(c)

      // 2. 处理占位符 (isMergedPlaceholder)
      if (cell?.isMergedPlaceholder) {
        // 如果是占位符，说明它被它左上方的主单元格覆盖了，所以直接跳过（不渲染 <td>）
        continue
      }

      let tdContent = `(${r}, ${c})` // 默认内容：显示坐标用于测试
      let tdAttrs = ''

      // 3. 处理合并单元格 (merge)
      if (cell?.merge) {
        const { rowSpan, colSpan } = cell.merge

        // 只有主单元格才需要设置 rowspan 和 colspan 属性
        if (rowSpan > 1) {
          tdAttrs += ` rowspan="${rowSpan}"`
          tdContent += ` [R:${rowSpan}]` // 测试标记
        }
        if (colSpan > 1) {
          tdAttrs += ` colspan="${colSpan}"`
          tdContent += ` [C:${colSpan}]` // 测试标记
        }

        // 如果是主单元格，可以给它加个背景色区分
        tdAttrs += ' style="background-color: #f0f8ff;"'
      } else if (!cell) {
        // 4. 处理真正的空白单元格 (稀疏存储中不存在)
        tdAttrs += ' style="background-color: #eee;"'
        tdContent = ''
      }

      // 渲染 <td> 标签
      html += `<td${tdAttrs}>${tdContent}</td>`
    }

    html += '</tr>'
  }

  html += '</table>'
  return html
}
