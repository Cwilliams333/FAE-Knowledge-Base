import React from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface InlineCodeProps {
  children: string
  type?: 'string' | 'property' | 'function' | 'keyword' | 'number' | 'variable' | 'path' | 'command' | 'default'
}

const codeStyles = {
  light: {
    string: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    property: 'bg-sky-50 text-sky-700 border-sky-300',
    function: 'bg-violet-50 text-violet-700 border-violet-300',
    keyword: 'bg-pink-50 text-pink-700 border-pink-300',
    number: 'bg-amber-50 text-amber-700 border-amber-300',
    variable: 'bg-purple-50 text-purple-700 border-purple-300',
    path: 'bg-orange-50 text-orange-700 border-orange-300',
    command: 'bg-slate-100 text-slate-700 border-slate-300',
    default: 'bg-gray-100 text-gray-700 border-gray-300'
  },
  dark: {
    string: 'bg-emerald-900 text-emerald-400 border-emerald-800',
    property: 'bg-cyan-900 text-cyan-400 border-cyan-800',
    function: 'bg-purple-900 text-purple-400 border-purple-800',
    keyword: 'bg-pink-900 text-pink-400 border-pink-800',
    number: 'bg-orange-900 text-orange-400 border-orange-800',
    variable: 'bg-violet-900 text-violet-400 border-violet-800',
    path: 'bg-amber-900 text-amber-400 border-amber-800',
    command: 'bg-blue-900 text-blue-400 border-blue-800',
    default: 'bg-slate-800 text-slate-300 border-slate-700'
  }
}

export function InlineCode({ children, type = 'default' }: InlineCodeProps) {
  const { theme } = useTheme()
  const styles = codeStyles[theme][type]
  
  return (
    <code className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border ${styles} transition-colors duration-200 hover:brightness-110 cursor-pointer select-all`}>
      {children}
    </code>
  )
}

// Helper function to detect code type from content
export function detectCodeType(code: string): InlineCodeProps['type'] {
  // String detection (quotes)
  if (/^["'`].*["'`]$/.test(code)) return 'string'
  
  // Number detection
  if (/^\d+(\.\d+)?$/.test(code)) return 'number'
  
  // Path detection
  if (code.includes('/') || code.includes('\\') || code.includes('.')) return 'path'
  
  // Common keywords
  const keywords = ['const', 'let', 'var', 'function', 'class', 'if', 'else', 'return', 'import', 'export', 'async', 'await']
  if (keywords.includes(code.toLowerCase())) return 'keyword'
  
  // Function detection (parentheses)
  if (code.includes('()') || code.endsWith(')')) return 'function'
  
  // Property detection (dot notation)
  if (code.includes('.') && !code.includes('/')) return 'property'
  
  // Command detection (common commands)
  const commands = ['npm', 'yarn', 'git', 'docker', 'cd', 'ls', 'mkdir', 'rm']
  if (commands.some(cmd => code.toLowerCase().startsWith(cmd))) return 'command'
  
  return 'default'
}