import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, File, Zap, Database, AlertCircle, Loader2, Sun, Moon } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { rehypeHighlightSearch } from '@/lib/rehype-highlight-search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
          p: ({ children, ...props }: any) => <p {...props} className="mb-2 leading-relaxed">{children}</p>,
          h1: ({ children, ...props }: any) => <h1 {...props} className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children, ...props }: any) => <h2 {...props} className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children, ...props }: any) => <h3 {...props} className="text-md font-bold mb-1">{children}</h3>,
          strong: ({ children, ...props }: any) => <strong {...props} className="font-bold">{children}</strong>,
          em: ({ children, ...props }: any) => <em {...props} className="italic">{children}</em>,
          code: ({ children, ...props }: any) => <code {...props} className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
          pre: ({ children, ...props }: any) => <pre {...props} className="bg-muted p-2 rounded overflow-x-auto mb-2">{children}</pre>,
          blockquote: ({ children, ...props }: any) => <blockquote {...props} className="border-l-4 border-muted-foreground/20 pl-4 italic mb-2">{children}</blockquote>,
          ul: ({ children, ...props }: any) => <ul {...props} className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children, ...props }: any) => <ol {...props} className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children, ...props }: any) => <li {...props}>{children}</li>
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
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    whileHover={{ y: -2 }}
  >
    <Card 
      className="group cursor-pointer glass-effect border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 ease-out"
      onClick={() => onClick(result.filename)}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
            <File className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle 
              className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors tracking-tight leading-tight"
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
  </motion.div>
  )
})

SearchResultItem.displayName = 'SearchResultItem'

export function SearchPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
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

    console.log('🔄 Fetching stats from http://172.20.32.1:5000/stats')
    fetch('http://172.20.32.1:5000/stats', { signal: controller.signal })
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
        const response = await fetch('http://172.20.32.1:5000/search', {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const LoadingState = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-12"
    >
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
      <p className="text-slate-600 dark:text-slate-400">Searching...</p>
    </motion.div>
  )

  const EmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center py-12"
    >
      <Search className="h-12 w-12 mx-auto mb-4 text-slate-400" />
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
        No Results for "{debouncedQuery}"
      </h3>
      <p className="text-slate-600 dark:text-slate-400">
        Check the spelling or try a different search term.
      </p>
    </motion.div>
  )

  const ErrorState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center py-12"
    >
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
    </motion.div>
  )

  const InitialState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <Search className="h-12 w-12 mx-auto mb-4 text-slate-400" />
      <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
        Search the Knowledge Base
      </h3>
      <p className="text-slate-600 dark:text-slate-400">
        Enter a search term to find relevant documentation.
      </p>
    </motion.div>
  )

  return (
    <div className="relative min-h-screen premium-bg">
      <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-20 relative"
        >
          {/* Theme Toggle - positioned absolutely */}
          <button 
            onClick={toggleTheme}
            className="theme-toggle absolute top-0 right-0"
            aria-label="Toggle theme"
          >
            <Sun className="sun-icon text-yellow-500" />
            <Moon className="moon-icon text-blue-400" />
          </button>
          
          <div className="mb-6">
            <h1 className="text-6xl sm:text-7xl font-bold tracking-tight text-center">
              <div className="accent-gradient mb-2">FAE</div>
              <div className="text-4xl sm:text-5xl text-foreground">Knowledge Base</div>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            Search through documentation, guides, and knowledge with powerful AI-driven insights
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
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
                    <span className="text-2xl font-bold text-foreground">AI</span>
                    <p className="text-sm font-medium">Powered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          <Card className="glass-effect border-border/50 shadow-2xl shadow-primary/5">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-gradient">Search Documentation</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                Use natural language or specific terms. Press{' '}
                <kbd className="px-3 py-1.5 bg-muted/50 border border-border rounded-md text-xs font-mono font-medium">
                  ⌘K
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
                  ⌘K
                </kbd>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Count */}
        <AnimatePresence>
          {status === SEARCH_STATUS.SUCCESS && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <p className="text-slate-600 dark:text-slate-400 text-center">
                Found <strong>{total}</strong> results
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {status === SEARCH_STATUS.IDLE && <InitialState key="initial" />}
          {status === SEARCH_STATUS.LOADING && <LoadingState key="loading" />}
          {status === SEARCH_STATUS.EMPTY && <EmptyState key="empty" />}
          {status === SEARCH_STATUS.ERROR && <ErrorState key="error" />}
          {status === SEARCH_STATUS.SUCCESS && (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Dialog */}
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput 
            placeholder="Search documentation..." 
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Recent Documents">
              {results.slice(0, 5).map((result) => (
                <CommandItem
                  key={result.filename}
                  onSelect={() => {
                    openDocument(result.filename)
                    setOpen(false)
                  }}
                >
                  <File className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {result.filename.replace('.md', '')}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </div>
  )
}