import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { SearchPage } from '@/components/SearchPage'
import { DocumentViewer } from '@/components/DocumentViewer'
import { ThemeProvider } from '@/contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/document/:filename" element={<DocumentViewer />} />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App