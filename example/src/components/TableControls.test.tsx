import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TableControls from './TableControls'

describe('TableControls', () => {
  it('calls merge handler', () => {
    const onMerge = vi.fn()
    render(
      <TableControls
        disabled={false}
        onInsertRow={() => {}}
        onInsertCol={() => {}}
        onDeleteRow={() => {}}
        onDeleteCol={() => {}}
        onMerge={onMerge}
        onUnmerge={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /merge cells/i }))
    expect(onMerge).toHaveBeenCalled()
  })
})
