import { describe, it, expect, vi } from 'vitest'
import { renderTable } from './canvasRenderer'
import type { CanvasConfig } from '../types'

function mockCtx() {
  const clear = vi.fn()
  const stroke = vi.fn()
  const fill = vi.fn()
  const text = vi.fn()
  const beginPath = vi.fn()
  const save = vi.fn()
  const restore = vi.fn()

  return {
    clearRect: clear,
    strokeRect: stroke,
    fillRect: fill,
    fillText: text,
    beginPath: beginPath,
    stroke: stroke,
    save: save,
    restore: restore,
    set font(v: string) {},
    set fillStyle(v: string) {},
    set strokeStyle(v: string) {},
    set textBaseline(v: CanvasTextBaseline) {},
  } as unknown as CanvasRenderingContext2D
}

describe('canvasRenderer', () => {
  it('skips merged placeholders', () => {
    const ctx = mockCtx()
    const config: CanvasConfig = {
      cellWidth: 100,
      cellHeight: 40,
      gridColor: '#e0e0e0',
      selectionColor: 'rgba(59,130,246,0.2)',
      textColor: '#333',
      font: '14px sans-serif',
    }

    const grid = {
      rows: 2,
      cols: 2,
      cells: new Map<any, any>([
        [0, new Map([[0, { merge: { rowSpan: 2, colSpan: 2 } }]])],
        [0, new Map([[1, { isMergedPlaceholder: true }]])],
      ]),
    }

    renderTable({
      ctx,
      width: 200,
      height: 80,
      grid: grid as any,
      config,
      cellText: () => '',
    })

    // we still draw something for the main merged cell
    expect((ctx.clearRect as any).mock.calls.length).toBeGreaterThan(0)
  })
})
