import { render } from '@testing-library/react'
import TableCanvas from './TableCanvas'

it('renders a canvas element', () => {
  const { container } = render(
    <TableCanvas
      grid={null}
      selection={null}
      cellText={() => ''}
      width={300}
      height={200}
      onCellDoubleClick={() => {}}
      onSelectionChange={() => {}}
    />,
  )
  expect(container.querySelector('canvas')).toBeTruthy()
})

it('renders two canvas layers', () => {
  const grid = {
    rows: 1,
    cols: 1,
    cells: new Map([[0, new Map([[0, {}]])]]),
  }
  const { container } = render(
    <TableCanvas
      grid={grid as any}
      selection={null}
      cellText={() => ''}
      onSelectionChange={() => {}}
      onCellDoubleClick={() => {}}
      editingRect={null}
    />,
  )
  expect(container.querySelectorAll('canvas').length).toBe(2)
})
