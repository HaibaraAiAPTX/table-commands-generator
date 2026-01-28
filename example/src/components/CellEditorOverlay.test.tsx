import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CellEditorOverlay from './CellEditorOverlay'

describe('CellEditorOverlay', () => {
  it('covers the cell border with an inflated overlay', () => {
    render(
      <CellEditorOverlay
        open
        value=""
        x={10}
        y={20}
        width={100}
        height={40}
        onChange={() => {}}
        onCommit={() => {}}
        onCancel={() => {}}
      />,
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveStyle({
      transform: 'translate(9px, 19px)',
      width: '102px',
      height: '42px',
    })
  })

  it('commits value on Enter', () => {
    const onCommit = vi.fn()
    render(
      <CellEditorOverlay
        open
        value=""
        x={0}
        y={0}
        width={100}
        height={40}
        onChange={() => {}}
        onCommit={onCommit}
        onCancel={() => {}}
      />,
    )
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onCommit).toHaveBeenCalled()
  })
})
