import { visit } from 'unist-util-visit'
import type { Plugin } from 'unified'
import type { Root, Heading } from 'mdast'

export interface TocEntry {
  id: string
  text: string
  depth: number
}

// Export the type separately for better compatibility

export const remarkTocExtractor: Plugin<[{ onTocExtracted: (toc: TocEntry[]) => void }], Root> = 
  ({ onTocExtracted }) => (tree) => {
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
      onTocExtracted(toc)
    }, 0)
  }