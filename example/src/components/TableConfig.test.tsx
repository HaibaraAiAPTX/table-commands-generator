import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TableConfig from './TableConfig'

describe('TableConfig', () => {
  it('submits chosen table size', () => {
    const onCreate = vi.fn()
    render(<TableConfig onCreate={onCreate} />)
    fireEvent.change(screen.getByLabelText('Rows'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Cols'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: /create table/i }))
    expect(onCreate).toHaveBeenCalledWith({ rows: 4, cols: 5 })
  })
})
