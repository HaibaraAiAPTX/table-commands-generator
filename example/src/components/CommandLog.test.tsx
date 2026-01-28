import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CommandLog from './CommandLog'

describe('CommandLog', () => {
  it('renders empty state', () => {
    render(<CommandLog history={[]} />)
    expect(screen.getByText(/no commands yet/i)).toBeInTheDocument()
  })
})
