import React, { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpring, useTransition, animated, config } from '@react-spring/web'
import { Search, File, Zap, Database, AlertCircle, Loader2, Sun, Moon } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { rehypeHighlightSearch } from '@/lib/rehype-highlight-search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDebounce } from '@/hooks/useDebounce'
import { useTheme } from '@/contexts/ThemeContext'

// Search states enum for better state management
const SEARCH_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading', 
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error'
} as const


type SearchStatus = typeof SEARCH_STATUS[keyof typeof SEARCH_STATUS]

interface SearchResult {
  filename: string
  content: string
  highlight?: string
  score: number
}

interface SearchResponse {
  total: number
  results: SearchResult[]
}

interface StatsResponse {
  count: number
}

const SearchResultItem = React.memo(({ result, onClick, searchQuery }: { 
  result: SearchResult
  onClick: (filename: string) => void 
  searchQuery: string
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  const itemAnimation = useSpring({
    opacity: 1,
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0px)',
    config: config.wobbly
  })
  // Simple title highlighter (since title isn't markdown)
  const highlightTitle = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0)
    let highlightedText = text
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="search-highlight">$1</mark>')
    })
    
    return highlightedText
  }

  // Function to render markdown with search term highlighting
  const renderMarkdownWithHighlight = (text: string) => {
    return (
      <Markdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlightSearch, searchQuery]]}
        components={{
          // Style markdown elements nicely
          p: ({ children, ...props }) => <p {...props} className="mb-2 leading-relaxed">{children}</p>,
          h1: ({ children, ...props }) => <h1 {...props} className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children, ...props }) => <h2 {...props} className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children, ...props }) => <h3 {...props} className="text-md font-bold mb-1">{children}</h3>,
          strong: ({ children, ...props }) => <strong {...props} className="font-bold">{children}</strong>,
          em: ({ children, ...props }) => <em {...props} className="italic">{children}</em>,
          code: ({ children, ...props }) => <code {...props} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
          pre: ({ children, ...props }) => <pre {...props} className="bg-muted p-2 rounded overflow-x-auto mb-2">{children}</pre>,
          blockquote: ({ children, ...props }) => <blockquote {...props} className="border-l-4 border-muted-foreground/20 pl-4 italic mb-2">{children}</blockquote>,
          ul: ({ children, ...props }) => <ul {...props} className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children, ...props }) => <ol {...props} className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children, ...props }) => <li {...props}>{children}</li>
        }}
      >
        {text}
      </Markdown>
    )
  }


  // Always use markdown rendering, but get content from the right source
  const contentToRender = result.content.substring(0, 500) + '...'
  // Always render as markdown for proper formatting
  const titleText = result.filename.replace('.md', '').replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
  const highlightedTitle = highlightTitle(titleText, searchQuery)

  return (
  <animated.div
    style={itemAnimation}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
  >
    <Card 
      className="group cursor-pointer glass-effect premium-card sparkle-effect hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ease-out"
      style={{ borderColor: 'hsl(var(--color-border) / 0.5)' }}
      onClick={() => onClick(result.filename)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
            <File className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle 
              className="text-lg font-semibold text-foreground group-hover:cosmic-text transition-all duration-300 tracking-tight leading-tight"
              dangerouslySetInnerHTML={{ __html: highlightedTitle }}
            />
            <div className="flex items-center space-x-3 mt-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-muted-foreground font-medium">
                  {result.score.toFixed(2)} relevance
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {(result.content.length / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground line-clamp-3 leading-relaxed group-hover:text-foreground/80 transition-colors markdown-content">
          {renderMarkdownWithHighlight(contentToRender)}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
            Documentation
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="text-xs text-primary font-medium flex items-center">
              View document
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </animated.div>
  )
})

SearchResultItem.displayName = 'SearchResultItem'

export function SearchPage() {
  const navigate = useNavigate()
  const { toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<SearchStatus>(SEARCH_STATUS.IDLE)
  const [stats, setStats] = useState<StatsResponse>({ count: 0 })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce search query to prevent excessive API calls
  const debouncedQuery = useDebounce(query, 300)

  // Fetch stats on mount
  useEffect(() => {
    const controller = new AbortController()

    // Get the API base URL from the host/environment or use default
    const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'http://172.20.32.1:5000'
    console.log(`🔄 Fetching stats from ${apiBaseUrl}/stats`)
    fetch(`${apiBaseUrl}/stats`, { signal: controller.signal })
      .then(res => {
        console.log('📊 Stats response:', res.status, res.ok)
        if (!res.ok) throw new Error('Failed to fetch stats')
        return res.json()
      })
      .then(data => {
        console.log('✅ Stats data:', data)
        setStats(data)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('❌ Stats fetch error:', err)
        }
      })

    return () => controller.abort()
  }, [])

  // Keyboard shortcut to open command dialog
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Main search effect with race condition prevention
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      setTotal(0)
      setStatus(SEARCH_STATUS.IDLE)
      setError(null)
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    const performSearch = async () => {
      setStatus(SEARCH_STATUS.LOADING)
      setError(null)

      try {
        // Get the API base URL from the host/environment or use default
        const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'http://172.20.32.1:5000'
        const response = await fetch(`${apiBaseUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: debouncedQuery }),
          signal
        })

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status} ${response.statusText}`)
        }

        const data: SearchResponse = await response.json()
        
        setResults(data.results)
        setTotal(data.total)
        
        if (data.results.length > 0) {
          setStatus(SEARCH_STATUS.SUCCESS)
        } else {
          setStatus(SEARCH_STATUS.EMPTY)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setStatus(SEARCH_STATUS.ERROR)
          setError(err.message || 'Failed to search. Please try again.')
          console.error('Search error:', err)
        }
      }
    }

    performSearch()

    return () => {
      controller.abort()
    }
  }, [debouncedQuery])

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      // Force search even if query hasn't changed
      setStatus(SEARCH_STATUS.LOADING)
    }
  }, [query])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const openDocument = useCallback((filename: string) => {
    navigate(`/document/${encodeURIComponent(filename)}`)
  }, [navigate])

  const handleRetry = useCallback(() => {
    setStatus(SEARCH_STATUS.IDLE)
    setError(null)
    handleSearch()
  }, [handleSearch])

  // Container animation using react-spring
  const containerAnimation = useSpring({
    opacity: status === SEARCH_STATUS.SUCCESS ? 1 : 0,
    config: config.gentle
  })

  // Page section animations
  const headerAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    config: { ...config.gentle, duration: 800 }
  })

  const statsAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: 200,
    config: { ...config.gentle, duration: 800 }
  })

  const searchAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0px)' },
    delay: 400,
    config: { ...config.gentle, duration: 800 }
  })

  // Results count transition
  const resultsCountTransition = useTransition(status === SEARCH_STATUS.SUCCESS, {
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
    config: config.gentle
  })

  const LoadingState = () => {
    const loadingAnimation = useSpring({
      from: { opacity: 0 },
      to: { opacity: 1 },
      config: config.gentle
    })
    
    return (
      <animated.div style={loadingAnimation} className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Searching...</p>
      </animated.div>
    )
  }

  const EmptyState = () => {
    const emptyAnimation = useSpring({
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0px)' },
      config: config.gentle
    })
    
    return (
      <animated.div style={emptyAnimation} className="text-center py-12">
        <Search className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          No Results for "{debouncedQuery}"
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Check the spelling or try a different search term.
        </p>
      </animated.div>
    )
  }

  const ErrorState = () => {
    const errorAnimation = useSpring({
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0px)' },
      config: config.gentle
    })
    
    return (
      <animated.div style={errorAnimation} className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          Search Error
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {error || 'Something went wrong. Please try again.'}
        </p>
        <Button onClick={handleRetry} variant="outline">
          Try Again
        </Button>
      </animated.div>
    )
  }

  const InitialState = () => {
    const initialAnimation = useSpring({
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0px)' },
      config: config.gentle
    })
    
    return (
      <animated.div style={initialAnimation} className="text-center py-12">
        <Search className="h-12 w-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          Search the Knowledge Base
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Enter a search term to find relevant documentation.
        </p>
      </animated.div>
    )
  }

  return (
    <div className="relative min-h-screen premium-bg">
      <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28">
        {/* Header */}
        <animated.div
          style={headerAnimation}
          className="text-center mb-20 relative"
        >
          {/* Theme Toggle - positioned absolutely */}
          <button 
            onClick={toggleTheme}
            className="theme-toggle absolute top-0 right-0 animate-float"
            aria-label="Toggle theme"
            style={{ animationDelay: '2s' }}
          >
            <Sun className="sun-icon text-yellow-500" />
            <Moon className="moon-icon text-blue-400" />
          </button>
          
          <div className="mb-8 animate-float" style={{ animationDelay: '0.5s' }}>
            <h1 className="text-6xl sm:text-7xl font-bold tracking-tight text-center">
              <div className="accent-gradient mb-3">FAE</div>
              <div className="text-4xl sm:text-5xl text-foreground">Knowledge Base</div>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium animate-float" style={{ animationDelay: '1s' }}>
            Search through documentation, guides, and knowledge insights
          </p>
        </animated.div>

        {/* Stats Cards */}
        <animated.div
          style={statsAnimation}
          className="mb-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-effect border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-muted-foreground group-hover:text-foreground transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Database className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground">{stats.count}</span>
                    <p className="text-sm font-medium">Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-effect border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-muted-foreground group-hover:text-foreground transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <File className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground">MD</span>
                    <p className="text-sm font-medium">Support</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-effect border-border/50 hover:border-primary/30 transition-all duration-300 group">
              <CardContent className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-3 text-muted-foreground group-hover:text-foreground transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Zap className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-foreground">FAE</span>
                    <p className="text-sm font-medium">Powered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </animated.div>

        {/* Search Section */}
        <animated.div
          style={searchAnimation}
          className="mb-16"
        >
          <Card className="glass-effect border-border/50 shadow-2xl shadow-primary/5 animate-pulse-border">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-gradient">Search Documentation</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Use natural language or specific terms. Press{' '}
                <kbd className="px-3 py-1.5 bg-muted/50 border border-border rounded-md text-xs font-mono font-medium">
                  Ctrl+K
                </kbd>{' '}
                for quick search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search all documentation..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="text-lg py-7 pl-12 pr-12 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 focus:bg-background transition-all duration-200"
                  />
                  {status === SEARCH_STATUS.LOADING && (
                    <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
                  )}
                </div>
                <Button
                  onClick={handleSearch}
                  size="lg"
                  className="premium-button px-8 py-7 text-base font-medium"
                  disabled={status === SEARCH_STATUS.LOADING || !query.trim()}
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setOpen(true)}
                className="w-full justify-between py-6 border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all duration-200 text-base font-medium"
              >
                <div className="flex items-center">
                  <Search className="h-4 w-4 mr-3" />
                  Open Quick Search
                </div>
                <kbd className="text-xs bg-muted/70 border border-border/50 px-2 py-1 rounded font-mono">
                  Ctrl+K
                </kbd>
              </Button>
            </CardContent>
          </Card>
        </animated.div>

        {/* Results Count */}
        {resultsCountTransition((style, item) =>
          item ? (
            <animated.div style={style} className="mb-6">
              <p className="text-slate-600 dark:text-slate-400 text-center">
                Found <strong>{total}</strong> results
              </p>
            </animated.div>
          ) : null
        )}

        {/* Main Content Area */}
        {status === SEARCH_STATUS.IDLE && <InitialState />}
        {status === SEARCH_STATUS.LOADING && <LoadingState />}
        {status === SEARCH_STATUS.EMPTY && <EmptyState />}
        {status === SEARCH_STATUS.ERROR && <ErrorState />}
        {status === SEARCH_STATUS.SUCCESS && (
          <animated.div
            style={containerAnimation}
            className="space-y-4"
          >
            {results.map((result, index) => (
              <SearchResultItem
                key={`${result.filename}-${index}`}
                result={result}
                onClick={openDocument}
                searchQuery={debouncedQuery}
              />
            ))}
          </animated.div>
        )}

        {/* Custom Quick Search Dialog */}
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            
            {/* Search Dialog */}
            <div className="relative w-full max-w-2xl">
              <Card className="glass-effect border-border/50 shadow-2xl animate-fade-in">
                <CardHeader className="pb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search documentation..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-10 pr-4 py-3 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                      autoFocus
                    />
                    {status === SEARCH_STATUS.LOADING && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 max-h-96 overflow-y-auto">
                  {status === SEARCH_STATUS.LOADING ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-primary" />
                      <p className="text-muted-foreground">Searching...</p>
                    </div>
                  ) : results.length === 0 && query ? (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No results found for "{query}"</p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">Start typing to search documentation...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground mb-3">
                        Found {results.length} result{results.length !== 1 ? 's' : ''}
                      </div>
                      {results.slice(0, 6).map((result, index) => {
                        const title = result.filename.replace('.md', '').replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => 
                          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                        )
                        return (
                          <Card 
                            key={`${result.filename}-${index}`}
                            className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                            onClick={() => {
                              openDocument(result.filename)
                              setOpen(false)
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                  <File className="h-4 w-4 text-primary" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm leading-tight">
                                    {title}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                    {result.content.substring(0, 120)}...
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground">
                                      {result.score.toFixed(2)} relevance
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="text-xs text-primary">View document →</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                      
                      {results.length > 6 && (
                        <Card className="cursor-pointer hover:border-primary/30 transition-colors">
                          <CardContent 
                            className="p-4 text-center"
                            onClick={() => {
                              setOpen(false)
                              // Keep the search query to show full results
                            }}
                          >
                            <p className="text-sm text-primary font-medium">
                              View all {results.length} results
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}