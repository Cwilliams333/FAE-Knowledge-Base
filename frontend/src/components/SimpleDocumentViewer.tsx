import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft } from 'lucide-react'

interface DocumentData {
  filename: string
  content: string
  metadata?: {
    title?: string
    description?: string
  }
}

export function SimpleDocumentViewer() {
  const { filename } = useParams<{ filename: string }>()
  const navigate = useNavigate()
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setDocument(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [filename])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-semibold">Document not found</h1>
        <p className="text-gray-400">{error || 'The requested document could not be loaded.'}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Search</span>
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Search</span>
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div>
              <h1 className="text-lg font-semibold text-white">
                {document.metadata?.title || filename}
              </h1>
              {document.metadata?.description && (
                <p className="text-sm text-gray-400">{document.metadata.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose prose-invert prose-blue max-w-none markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children, ...props }) => (
                <h1 {...props} className="text-3xl font-bold mb-6 text-white border-b border-gray-700 pb-3">
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2 {...props} className="text-2xl font-semibold mb-4 mt-8 text-white">
                  {children}
                </h2>
              ),
              p: ({ children, ...props }) => (
                <p {...props} className="mb-4 text-gray-300 leading-relaxed">
                  {children}
                </p>
              ),
              code: ({ children, className, ...props }) => {
                const isInline = !className
                return isInline ? (
                  <code {...props} className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code {...props} className={className}>
                    {children}
                  </code>
                )
              },
              pre: ({ children, ...props }) => (
                <pre {...props} className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto mb-4">
                  {children}
                </pre>
              ),
            }}
          >
            {document.content}
          </ReactMarkdown>
        </div>
      </main>
    </div>
  )
}