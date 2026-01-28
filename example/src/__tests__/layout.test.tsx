import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('Layout', () => {
  it('shows controls and commands panel headings', () => {
    render(<App />)
    expect(screen.getByText('Commands')).toBeInTheDocument()
  })
})
