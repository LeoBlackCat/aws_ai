import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple test to verify the testing setup is working
describe('Setup Test', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello, World!</div>
    
    render(<TestComponent />)
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
  })
  
  it('should have proper test environment', () => {
    expect(typeof window).toBe('object')
    expect(typeof document).toBe('object')
  })
})