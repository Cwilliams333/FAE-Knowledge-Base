import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkSlug from 'remark-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ArrowLeft, FileText, Search, Hash, Sun, Moon, Copy, Check } from 'lucide-react'
import { remarkTocExtractor } from '@/lib/remark-toc-extractor'
import type { TocEntry } from '@/lib/remark-toc-extractor'
import { useTheme } from '@/contexts/ThemeContext'

interface DocumentData {
  filename: string
  content: string
  metadata?: {
    title?: string
    description?: string
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <Copy className="h-4 w-4 text-gray-400" />
      )}
    </button>
  )
}

function TableOfContents({ toc, activeId, onItemClick }: { 
  toc: TocEntry[]
  activeId: string | null
  onItemClick: (id: string) => void 
}) {
  if (toc.length === 0) return null

  return (
    <div className="hidden lg:block w-72 border-r border-border sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto bg-background-surface">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            On this page
          </h2>
        </div>
        <nav className="space-y-1">
          {toc.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => onItemClick(item.id)}
              className={`
                block w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200
                ${item.depth === 1 ? 'font-medium' : ''}
                ${item.depth === 2 ? 'ml-4' : ''}
                ${item.depth === 3 ? 'ml-8' : ''}
                ${item.depth === 4 ? 'ml-12' : ''}
                ${activeId === item.id 
                  ? 'bg-primary/10 text-primary border-l-2 border-primary pl-3' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <span className="truncate block">{item.text}</span>
            </button>
          ))}
        </nav>
      </div>
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
        const response = await fetch(`http://172.20.32.1:5000/api/document/${filename}`)
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

  const codeStyle = theme === 'dark' ? oneDark : oneLight

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-background-surface/80 backdrop-blur-sm sticky top-0 z-50">
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
                <div className="h-6 w-px bg-border" />
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
            
            <div className="flex items-center space-x-3">
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
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-border/80 rounded-md transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
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
        <main className="flex-1 min-w-0">
          <div className="px-6 py-12 max-w-4xl mx-auto">
            <article className="prose prose-neutral dark:prose-invert max-w-none animate-fade-in">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  remarkSlug,
                  [remarkTocExtractor, { onTocExtracted: handleTocExtracted }]
                ]}
                components={{
                  h1: ({ children, id, ...props }) => (
                    <h1 
                      {...props} 
                      id={id}
                      className="text-4xl font-bold mb-8 text-foreground border-b border-border pb-4 scroll-mt-20"
                    >
                      {children}
                    </h1>
                  ),
                  h2: ({ children, id, ...props }) => (
                    <h2 
                      {...props} 
                      id={id}
                      className="text-2xl font-semibold mb-4 mt-8 text-foreground scroll-mt-20"
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children, id, ...props }) => (
                    <h3 
                      {...props} 
                      id={id}
                      className="text-xl font-medium mb-3 mt-6 text-foreground scroll-mt-20"
                    >
                      {children}
                    </h3>
                  ),
                  h4: ({ children, id, ...props }) => (
                    <h4 
                      {...props} 
                      id={id}
                      className="text-lg font-medium mb-2 mt-4 text-foreground scroll-mt-20"
                    >
                      {children}
                    </h4>
                  ),
                  p: ({ children, ...props }) => (
                    <p {...props} className="mb-4 text-foreground-light leading-relaxed text-base">
                      {children}
                    </p>
                  ),
                  code: ({ children, className, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match
                    
                    return isInline ? (
                      <code 
                        {...props} 
                        className="bg-background-inline-code text-primary px-1.5 py-0.5 rounded text-sm font-mono border border-border"
                      >
                        {children}
                      </code>
                    ) : (
                      <div className="code-block-wrapper relative">
                        {match && (
                          <div className="code-block-header">
                            <span className="code-block-language">{match[1]}</span>
                          </div>
                        )}
                        <CopyButton text={String(children).replace(/\n$/, '')} />
                        <SyntaxHighlighter
                          language={match?.[1] || 'text'}
                          style={codeStyle}
                          customStyle={{
                            margin: 0,
                            padding: '1.5rem',
                            background: 'transparent',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily: 'var(--font-mono)',
                            }
                          }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    )
                  },
                  pre: ({ children, ...props }) => (
                    <>{children}</>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote 
                      {...props} 
                      className="border-l-4 border-primary pl-4 my-6 text-muted-foreground italic bg-muted/30 py-3 pr-4 rounded-r-lg"
                    >
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul {...props} className="list-disc list-inside mb-4 text-foreground-light space-y-2 ml-4">
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol {...props} className="list-decimal list-inside mb-4 text-foreground-light space-y-2 ml-4">
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li {...props} className="text-foreground-light">
                      {children}
                    </li>
                  ),
                  a: ({ children, href, ...props }) => (
                    <a 
                      {...props} 
                      href={href}
                      className="text-primary hover:text-primary-hover underline-offset-2 transition-colors font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto mb-6 rounded-lg border border-border">
                      <table {...props} className="min-w-full divide-y divide-border">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children, ...props }) => (
                    <thead {...props} className="bg-muted">
                      {children}
                    </thead>
                  ),
                  th: ({ children, ...props }) => (
                    <th 
                      {...props} 
                      className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider"
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td {...props} className="px-6 py-4 text-sm text-foreground-light whitespace-nowrap">
                      {children}
                    </td>
                  ),
                  hr: ({ ...props }) => (
                    <hr {...props} className="my-8 border-border" />
                  ),
                  strong: ({ children, ...props }) => (
                    <strong {...props} className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  em: ({ children, ...props }) => (
                    <em {...props} className="italic text-foreground">
                      {children}
                    </em>
                  ),
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