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
