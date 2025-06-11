import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Search, Hash, Sun, Moon, Copy, Check } from 'lucide-react'
import { MDXClient } from '@mintlify/mdx'
import '@mintlify/mdx/dist/styles.css'
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

function TableOfContents({ toc, activeId, onItemClick }: { 
  toc: TocEntry[]
  activeId: string | null
  onItemClick: (id: string) => void 
}) {
  if (toc.length === 0) return null

  return (
    <div className="hidden lg:block w-72 border-r sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto bg-background-surface" style={{ borderColor: 'hsl(var(--color-border))' }}>
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

export function MintlifyDocumentViewer() {
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

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark mintlify-dark' : 'mintlify-light'}`}>
      {/* Header */}
      <div className="border-b bg-background-surface/80 backdrop-blur-sm sticky top-0 z-50" style={{ borderColor: 'hsl(var(--color-border))' }}>
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
                className="hidden sm:flex items-center space-x-2 px-3 py-1.5 border text-muted-foreground hover:text-foreground rounded-md transition-colors"
                style={{ borderColor: 'hsl(var(--color-border))', ':hover': { borderColor: 'hsl(var(--color-border) / 0.8)' } }}
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
        <main className="flex-1 min-w-0 bg-background">
          <div className="px-6 py-12 max-w-4xl mx-auto">
            <article className="mintlify-content animate-fade-in">
              <MDXClient 
                source={documentData.content}
                onTocExtracted={handleTocExtracted}
              />
            </article>
          </div>
        </main>
      </div>
    </div>
  )
}