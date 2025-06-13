import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Search, Sun, Moon, Copy, Check, Loader2, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkSlug from 'remark-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { remarkTocExtractor } from '@/lib/remark-toc-extractor'
import type { TocEntry } from '@/lib/remark-toc-extractor'
import { useTheme } from '@/contexts/ThemeContext'
import { InlineCode, detectCodeType } from '@/components/InlineCode'
import type { Components } from 'react-markdown'

interface DocumentData {
  filename: string
  content: string
  metadata?: {
    title?: string
    description?: string
  }
}

// Type for code component props based on react-markdown
interface CodeProps {
  children?: ReactNode
  className?: string
  inline?: boolean
  node?: any
}

// Type for pre component props
interface PreProps {
  children?: ReactNode
  node?: any
}

// Separate component for code blocks to properly use hooks
function CodeBlock({ language, codeContent, theme }: { language: string | null, codeContent: string, theme: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-6 rounded-xl overflow-hidden border border-border bg-background-code shadow-sm">
      {/* Code block header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background-surface">
        <div className="flex items-center space-x-3">
          {/* Mac-style window controls */}
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md 
                   text-muted-foreground hover:text-foreground hover:bg-muted 
                   transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content */}
      <div className="relative">
        <SyntaxHighlighter
          language={language || 'plaintext'}
          style={theme === 'dark' ? vscDarkPlus : vs}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.7',
            fontFamily: 'var(--font-mono)',
          }}
          showLineNumbers={codeContent.split('\n').length > 5}
          lineNumberStyle={{
            color: theme === 'dark' ? '#4a5568' : '#cbd5e0',
            fontSize: '0.75rem',
            paddingRight: '1rem',
            userSelect: 'none'
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {codeContent}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function TableOfContents({ toc, activeId, onItemClick }: { 
  toc: TocEntry[]
  activeId: string | null
  onItemClick: (id: string) => void 
}) {
  if (toc.length === 0) return null

  return (
    <div className="hidden lg:block w-72 border-r sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto bg-background" style={{ borderColor: 'hsl(var(--color-border))' }}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            On this page
          </h2>
        </div>
        <nav className="space-y-1">
          {toc.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => onItemClick(item.id)}
              className={`
                block w-full text-left py-1.5 text-sm transition-all duration-200 relative
                ${item.depth === 1 ? 'font-semibold' : 'font-normal'}
                ${item.depth === 2 ? 'pl-4' : ''}
                ${item.depth === 3 ? 'pl-8' : ''}
                ${item.depth === 4 ? 'pl-12' : ''}
                ${activeId === item.id 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {activeId === item.id && (
                <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />
              )}
              <span className="truncate block">{item.text}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

interface SearchResult {
  filename: string
  content: string
  highlight?: string
  score: number
}

// Mini search component for the header
function HeaderSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search API call
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'http://172.20.32.1:5000'
        const response = await fetch(`${apiBaseUrl}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        })
        
        if (response.ok) {
          const data = await response.json()
          setResults(data.results.slice(0, 5)) // Show top 5 results
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleResultClick = (filename: string) => {
    navigate(`/document/${encodeURIComponent(filename)}`)
    setIsOpen(false)
    setQuery('')
  }

  const handleSearchFocus = () => {
    setIsOpen(true)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={searchRef} className="relative">
      <div className={`relative transition-all duration-300 ${isOpen ? 'w-80' : 'w-64'}`}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search docs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleSearchFocus}
          className="w-full pl-9 pr-9 py-2 text-sm bg-background border rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
                   transition-all duration-200 placeholder:text-muted-foreground"
          style={{ borderColor: 'hsl(var(--color-border))' }}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
             style={{ borderColor: 'hsl(var(--color-border))' }}>
          {loading && query ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => {
                const title = result.filename.replace('.md', '').replace(/[-_]/g, ' ').replace(/\w\S*/g, (txt) => 
                  txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                )
                return (
                  <button
                    key={`${result.filename}-${index}`}
                    onClick={() => handleResultClick(result.filename)}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                    style={{ borderColor: 'hsl(var(--color-border) / 0.3)' }}
                  >
                    <div className="flex items-start space-x-3">
                      <FileText className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm truncate">{title}</div>
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {result.content.substring(0, 100)}...
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
              <div className="px-4 py-2 border-t text-xs text-muted-foreground">
                <button 
                  onClick={() => navigate(`/?q=${encodeURIComponent(query)}`)}
                  className="text-primary hover:text-primary-hover"
                >
                  See all results for "{query}"
                </button>
              </div>
            </div>
          ) : query && !loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function DocumentViewer() {
  const { filename } = useParams<{ filename: string }>()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [documentData, setDocumentData] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toc, setToc] = useState<TocEntry[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleTocExtracted = useCallback((extractedToc: TocEntry[]) => {
    setToc(extractedToc)
  }, [])

  useEffect(() => {
    if (!filename) return

    const fetchDocument = async () => {
      try {
        setLoading(true)
        // Get the API base URL from the host/environment or use default
        const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'http://172.20.32.1:5000'
        const response = await fetch(`${apiBaseUrl}/api/document/${filename}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`)
        }
        const data = await response.json()
        setDocumentData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [filename])

  // Scroll spy effect
  useEffect(() => {
    if (toc.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { 
        rootMargin: '0px 0px -80% 0px',
        threshold: 0.1
      }
    )

    const elements = window.document.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')
    elements.forEach((el) => observer.observe(el))

    return () => {
      elements.forEach((el) => observer.unobserve(el))
    }
  }, [toc])

  const scrollToHeading = (id: string) => {
    const element = window.document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground text-sm">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error || !documentData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Document not found</h1>
            <p className="text-muted-foreground max-w-md">
              {error || 'The requested document could not be loaded.'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Search</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background-surface backdrop-blur-sm sticky top-0 z-50" style={{ borderColor: 'hsl(var(--color-border))' }}>
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Search</span>
              </button>
              
              <div className="hidden sm:block">
                <div className="h-6 w-px" style={{ backgroundColor: 'hsl(var(--color-border))' }} />
              </div>
              
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {documentData.metadata?.title || filename}
                </h1>
                {documentData.metadata?.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {documentData.metadata.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <HeaderSearch />
              
              <button 
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Toggle theme"
              >
                <Sun className="sun-icon text-yellow-500" />
                <Moon className="moon-icon text-blue-400" />
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 border text-muted-foreground hover:text-foreground rounded-md transition-colors"
                style={{ borderColor: 'hsl(var(--color-border))' }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex max-w-[1440px] mx-auto">
        <TableOfContents 
          toc={toc} 
          activeId={activeId} 
          onItemClick={scrollToHeading} 
        />
        
        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-background">
          <div className="px-6 py-12 max-w-4xl mx-auto">
            <article className="mintlify-content prose prose-lg max-w-none dark:prose-invert 
                               prose-headings:font-semibold prose-headings:tracking-tight 
                               prose-p:text-foreground-light prose-headings:text-foreground 
                               prose-strong:text-foreground prose-strong:font-semibold
                               prose-code:text-foreground prose-code:font-normal
                               prose-pre:bg-transparent prose-pre:p-0
                               prose-img:rounded-lg prose-img:shadow-md
                               prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary-hover 
                               hover:prose-a:underline hover:prose-a:decoration-primary/30
                               prose-blockquote:border-primary prose-blockquote:bg-primary/5 
                               prose-blockquote:rounded-r-lg prose-blockquote:py-1
                               prose-li:marker:text-primary/60
                               animate-fade-in">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkSlug, [remarkTocExtractor, { onTocExtracted: handleTocExtracted }]]}
                components={{
                  h1: ({ children, ...props }) => (
                    <h1 className="text-4xl font-bold mt-12 mb-6 text-foreground tracking-tight" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 className="text-3xl font-semibold mt-10 mb-5 text-foreground tracking-tight" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 className="text-2xl font-semibold mt-8 mb-4 text-foreground tracking-tight" {...props}>
                      {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="mb-6 leading-[1.75] text-foreground-light text-base" {...props}>
                      {children}
                    </p>
                  ),
                  a: ({ children, ...props }) => (
                    <a className="text-primary hover:text-primary-hover underline decoration-primary/30 hover:decoration-primary transition-colors" {...props}>
                      {children}
                    </a>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="my-6 space-y-3 list-disc list-outside ml-6" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="my-6 space-y-3 list-decimal list-outside ml-6" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="text-foreground-light leading-relaxed" {...props}>
                      {children}
                    </li>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote className="border-l-4 border-primary pl-6 pr-4 py-3 my-6 
                                         bg-background rounded-r-lg 
                                         text-foreground-light not-italic" {...props}>
                      {children}
                    </blockquote>
                  ),
                  code: ({ children, className, inline }: CodeProps) => {
                    // Check if it's inline code
                    if (inline || !className) {
                      const codeContent = String(children).trim()
                      const codeType = detectCodeType(codeContent)
                      return <InlineCode type={codeType}>{codeContent}</InlineCode>
                    }

                    // It's a code block
                    const match = /language-(\w+)/.exec(className || '')
                    const language = match ? match[1] : null
                    const codeContent = String(children).replace(/\n$/, '')

                    return <CodeBlock language={language} codeContent={codeContent} theme={theme} />
                  },
                  pre: ({ children }: PreProps) => {
                    // Return children directly since we're handling the wrapper in the code component
                    return <>{children}</>
                  }
                }}
              >
                {documentData.content}
              </ReactMarkdown>
            </article>
          </div>
        </main>
      </div>
    </div>
  )
}