import { useState } from 'react'
import TableCanvas from './components/TableCanvas'
import TableControls from './components/TableControls'
import TableConfig from './components/TableConfig'
import CellEditorOverlay from './components/CellEditorOverlay'
import CommandLog from './components/CommandLog'
import { CanvasViewport } from './components/CanvasViewport'
import { useTableState } from './hooks/useTableState'
import type { CanvasConfig } from './types'

const DEFAULT_CONFIG: CanvasConfig = {
  cellWidth: 120,
  cellHeight: 44,
  gridColor: '#e2e8f0',
  selectionColor: 'rgba(99, 102, 241, 0.15)',
  textColor: '#334155',
  font: '14px Inter, system-ui, sans-serif',
}

export default function App() {
  const s = useTableState()
  const [editorValue, setEditorValue] = useState('')

  const disabled = !s.grid

  const handleCommit = () => {
    if (s.editingCell) {
      s.setCellText(s.editingCell.row, s.editingCell.col, editorValue)
      s.stopEditing()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-medium">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-slate-900">Table-Core</h1>
              <p className="text-sm text-slate-500">Professional Canvas Table Editor</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            <TableConfig onCreate={s.createTable} />
            <TableControls
              disabled={disabled}
              onInsertRow={s.ops.insertRow}
              onInsertCol={s.ops.insertCol}
              onDeleteRow={s.ops.deleteRow}
              onDeleteCol={s.ops.deleteCol}
              onMerge={s.ops.merge}
              onUnmerge={s.ops.unmerge}
            />
          </div>

          {/* Right Panel - Canvas + Command Log */}
          <div className="lg:col-span-3 space-y-4">
            {/* Table Canvas Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-semibold text-lg text-slate-900">Table Canvas</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Double-click cells to edit • Use mouse wheel to scroll</p>
                  </div>
                  {s.grid && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="font-medium">{s.grid.rows} rows</span>
                      <span className="text-slate-300">×</span>
                      <span className="font-medium">{s.grid.cols} columns</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6 bg-slate-50/30">
                <CanvasViewport
                  gridWidth={s.grid ? s.grid.cols * DEFAULT_CONFIG.cellWidth : 800}
                  gridHeight={s.grid ? s.grid.rows * DEFAULT_CONFIG.cellHeight : 400}
                  minHeight={500}
                >
                  <TableCanvas
                    grid={s.grid}
                    selection={s.grid ? s.selection : null}
                    cellText={(r, c) => s.cellContents.get(r)?.get(c) ?? ''}
                    config={DEFAULT_CONFIG}
                    onCellDoubleClick={s.startEditing}
                    onSelectionChange={s.setSelection}
                  />
                  <CellEditorOverlay
                    open={!!s.editingCell}
                    value={editorValue}
                    onChange={setEditorValue}
                    onCommit={handleCommit}
                    onCancel={s.stopEditing}
                    x={s.editingCell ? s.editingCell.col * DEFAULT_CONFIG.cellWidth : 0}
                    y={s.editingCell ? s.editingCell.row * DEFAULT_CONFIG.cellHeight : 0}
                    width={DEFAULT_CONFIG.cellWidth}
                    height={DEFAULT_CONFIG.cellHeight}
                  />
                </CanvasViewport>
              </div>
            </div>

            {/* Command Log */}
            <CommandLog history={s.commandHistory} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-400">
          <p>Built with React, Canvas, and TypeScript</p>
        </footer>
      </div>
    </div>
  )
}
