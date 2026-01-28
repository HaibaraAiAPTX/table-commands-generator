import { renderHook, act } from '@testing-library/react'
import { useTableState } from './useTableState'

it('creates a table with requested size', () => {
  const { result } = renderHook(() => useTableState())
  act(() => result.current.createTable({ rows: 4, cols: 7 }))
  expect(result.current.grid?.rows).toBe(4)
  expect(result.current.grid?.cols).toBe(7)
})
