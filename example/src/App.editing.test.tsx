import { render, screen, fireEvent } from '@testing-library/react'
import { it, expect } from 'vitest'
import App from './App'

const CELL_WIDTH = 120
const CELL_HEIGHT = 44

function setupCanvas(container: HTMLElement): HTMLCanvasElement {
  const canvas = container.querySelector('canvas') as HTMLCanvasElement | null
  if (!canvas) throw new Error('Canvas not found')
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 400,
      width: 800,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    }),
  })
  return canvas
}

function doubleClickCell(canvas: HTMLCanvasElement, row: number, col: number) {
  fireEvent.doubleClick(canvas, {
    clientX: col * CELL_WIDTH + 10,
    clientY: row * CELL_HEIGHT + 10,
  })
}

it('starts editing new cell with its own value', () => {
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /create table/i }))
  const canvas = setupCanvas(container)

  doubleClickCell(canvas, 0, 0)
  const firstInput = screen.getByRole('textbox') as HTMLInputElement
  fireEvent.change(firstInput, { target: { value: 'Hello' } })
  fireEvent.keyDown(firstInput, { key: 'Enter' })

  doubleClickCell(canvas, 0, 1)
  const secondInput = screen.getByRole('textbox') as HTMLInputElement
  expect(secondInput).toHaveValue('')
})

it('restores original value on Escape cancel', () => {
  const { container } = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /create table/i }))
  const canvas = setupCanvas(container)

  doubleClickCell(canvas, 0, 0)
  const firstInput = screen.getByRole('textbox') as HTMLInputElement
  fireEvent.change(firstInput, { target: { value: 'Hello' } })
  fireEvent.keyDown(firstInput, { key: 'Enter' })

  doubleClickCell(canvas, 0, 0)
  const editInput = screen.getByRole('textbox') as HTMLInputElement
  fireEvent.change(editInput, { target: { value: 'World' } })
  fireEvent.keyDown(editInput, { key: 'Escape' })

  doubleClickCell(canvas, 0, 0)
  const reopenedInput = screen.getByRole('textbox') as HTMLInputElement
  expect(reopenedInput).toHaveValue('Hello')
})
