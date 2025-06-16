import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SearchPage } from './SearchPage'
import { ThemeProvider } from '@/contexts/ThemeContext'

// Mock fetch to avoid API calls during tests
global.fetch = vi.fn()

const mockFetch = vi.mocked(fetch)

// Wrapper component to provide necessary context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </MemoryRouter>
)

describe('SearchPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockFetch.mockClear()
    
    // Mock successful stats fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 5 })
    } as Response)
  })

  it('renders the main heading "FAE Knowledge Base"', async () => {
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    )

    // Check for the main heading
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    
    // The heading has "FAE" and "Knowledge Base" in separate divs
    expect(screen.getAllByText('FAE').length).toBeGreaterThan(0)
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
  })

  it('renders the search input field', () => {
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    )

    const searchInput = screen.getByPlaceholderText('Search all documentation...')
    expect(searchInput).toBeInTheDocument()
  })

  it('renders the stats cards', () => {
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    )

    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('MD')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getAllByText('FAE').length).toBeGreaterThan(0)
    expect(screen.getByText('Powered')).toBeInTheDocument()
  })
})