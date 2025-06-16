import { visit } from 'unist-util-visit'
import type { Root, Heading } from 'mdast'
import type { Plugin } from 'unified'

export interface TocEntry {
  id: string
  text: string
  depth: number
}

interface TocExtractorOptions {
  onTocExtracted: (toc: TocEntry[]) => void
}

export const remarkTocExtractor: Plugin<[TocExtractorOptions], Root> = (options) => {
  if (!options?.onTocExtracted) {
    console.error('remarkTocExtractor: `onTocExtracted` option is required.')
    return
  }

  return (tree: Root) => {
    const toc: TocEntry[] = []
    
    visit(tree, 'heading', (node: Heading) => {
      const text = node.children
        .filter(child => child.type === 'text')
        .map(child => ('value' in child ? child.value : ''))
        .join('')
        .trim()
      
      if (text && node.depth <= 4) { // Only include H1-H4
        // Generate a slug from the text
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
        
        toc.push({ 
          id, 
          text, 
          depth: node.depth 
        })
      }
    })
    
    // Use setTimeout to defer the state update until after render
    setTimeout(() => {
      options.onTocExtracted(toc)
    }, 0)
  }
}