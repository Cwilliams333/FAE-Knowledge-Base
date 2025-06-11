import { visit, SKIP } from 'unist-util-visit';

// Rehype plugin to highlight search terms in markdown content
export const rehypeHighlightSearch = (searchTerm?: string) => {
  if (!searchTerm || !searchTerm.trim()) {
    return; // No search term, do nothing
  }

  // This is the "transformer" function that receives the HAST tree
  return (tree: any) => {
    // We use `visit` to find all 'text' nodes in the tree
    visit(tree, 'text', (node: any, index: any, parent: any) => {
      // We only care about text nodes within elements
      if (!parent || typeof index !== 'number') return;

      const nodeValue = node.value.toLowerCase();
      const termLower = searchTerm.toLowerCase();

      // If the text doesn't contain the search term, we're done
      if (!nodeValue.includes(termLower)) {
        return;
      }

      // We found a match. Now we need to split the text node into multiple nodes
      const newChildren: any[] = [];
      let lastIndex = 0;
      let match;

      // Use a regex to find all occurrences of the search term
      const regex = new RegExp(searchTerm, 'gi');

      while ((match = regex.exec(node.value)) !== null) {
        // 1. Add the text *before* the match
        if (match.index > lastIndex) {
          newChildren.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index),
          });
        }

        // 2. Create the <span> element for the match (matching backend format)
        const markElement = {
          type: 'element',
          tagName: 'span',
          properties: { 
            className: ['highlight'] 
          },
          children: [{ type: 'text', value: match[0] }],
        };
        newChildren.push(markElement);

        lastIndex = regex.lastIndex;
      }

      // 3. Add any remaining text *after* the last match
      if (lastIndex < node.value.length) {
        newChildren.push({
          type: 'text',
          value: node.value.slice(lastIndex),
        });
      }

      // Replace the original text node with our new array of nodes
      // The `splice` function modifies the parent's children array in place
      parent.children.splice(index, 1, ...newChildren);

      // Tell `visit` to skip over the new nodes we just added
      // We return `index + newChildren.length` to advance the visitor past our new nodes
      return [SKIP, index + newChildren.length];
    });
  };
};