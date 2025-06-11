# 🚨 TROUBLESHOOTING GUIDE - Frontend Issues & Fixes

## 🎯 ORIGINAL GOAL
Create a **Mintlify-style document viewer** with:
- **Same dark theme** as SearchPage (black background, blue accents)
- **Auto-indexing sidebar** that extracts H1-H4 headings from markdown
- **Smooth scrolling navigation** with active section highlighting
- **Clean, premium design** matching the existing search interface
- Support for **markdown, CSV, JSON, and PDF** rendering

## ❌ CURRENT ISSUES

### 1. **Main Page CSS Broken**
- SearchPage styling is off/broken
- Likely due to Tailwind CSS import issues after shadcn/ui installation

### 2. **Document Viewer Blank Screen**
Error: `The requested module '/src/lib/remark-toc-extractor.ts' does not provide an export named 'TocEntry'`
- TypeScript export/import mismatch
- Module not properly exporting the interface

### 3. **White Screen Root Cause**
- shadcn/ui components using wrong import syntax: `VariantProps` error
- Docker volume mount conflicts with node_modules
- Vite pre-bundling cache issues

## 🔧 IMMEDIATE FIX COMMANDS

### Step 1: Fix the Export Error
```bash
# Check the current export in remark-toc-extractor.ts
cat /mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/frontend/src/lib/remark-toc-extractor.ts

# The file should export both the interface AND the plugin
# If missing, add: export type { TocEntry }
```

### Step 2: Fix CSS/Tailwind Issues
```bash
# Check if Tailwind is properly imported
cat /mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/frontend/src/index.css

# Should contain:
@import "tailwindcss";
```

### Step 3: Clean Rebuild Process
```bash
# 1. Stop everything
docker.exe compose down

# 2. Remove node_modules from host (IMPORTANT!)
rm -rf /mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/frontend/node_modules

# 3. Rebuild without cache
docker.exe compose build --no-cache frontend

# 4. Start services
docker.exe compose up -d

# 5. Check logs
docker.exe logs kb-frontend --tail 20
```

### Step 4: Test Access Points
```bash
# Frontend (React) - Use WSL Gateway IP
curl -I http://172.20.32.1:5173/

# Backend API (Flask)
curl http://172.20.32.1:5000/health

# Test document API
curl "http://172.20.32.1:5000/api/document/test.md"
```

## 📁 KEY FILES TO CHECK

### 1. **Frontend Structure**
```
frontend/
├── src/
│   ├── components/
│   │   ├── SearchPage.tsx          # Main search interface
│   │   ├── DocumentViewer.tsx      # Complex viewer (broken)
│   │   ├── SimpleDocumentViewer.tsx # Simplified working version
│   │   └── ui/                     # shadcn components (import issues)
│   ├── lib/
│   │   ├── utils.ts                # cn() utility function
│   │   ├── rehype-highlight-search.ts
│   │   └── remark-toc-extractor.ts # EXPORT ERROR HERE
│   └── index.css                   # Must import Tailwind
├── components.json                 # shadcn config (check aliases)
├── package.json                    # Dependencies
└── vite.config.ts                  # Path aliases (@/ resolution)
```

### 2. **Docker Setup**
```yaml
# docker-compose.yml key sections:
frontend:
  volumes:
    - ./frontend:/app              # Source code mount
    - /app/node_modules           # CRITICAL: Isolates node_modules
```

## 🚀 QUICK RECOVERY PLAN

### Option 1: Use SimpleDocumentViewer (Working)
```typescript
// In App.tsx, already switched to:
import { SimpleDocumentViewer } from '@/components/SimpleDocumentViewer'
// This version works without shadcn/ui sidebar
```

### Option 2: Fix DocumentViewer Exports
```typescript
// frontend/src/lib/remark-toc-extractor.ts
// Add this line if missing:
export type { TocEntry }

// Or change import in DocumentViewer.tsx to:
import { remarkTocExtractor } from '@/lib/remark-toc-extractor'
import type { TocEntry } from '@/lib/remark-toc-extractor'
```

### Option 3: Fix Tailwind CSS
```css
/* frontend/src/index.css - Should start with: */
@import "tailwindcss";

/* If using old format, update to: */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 🎨 DESIGN SPECIFICATIONS (What We're Building)

### Color Scheme (Matching SearchPage)
- **Background**: `#0a0a0a` (near black)
- **Card backgrounds**: Glass effect with opacity
- **Primary blue**: `#3b82f6` (for accents, links)
- **Text colors**: 
  - Primary: `white`
  - Secondary: `#9ca3af` (gray-400)
  - Muted: `#6b7280` (gray-500)

### Layout Structure
```
┌─────────────────────────────────────┐
│ Header (sticky)                     │
│ [← Back] | Document Title           │
├─────────────┬───────────────────────┤
│   Sidebar   │                       │
│   (TOC)     │   Markdown Content    │
│             │                       │
│ • Section 1 │   Beautiful styled    │
│ • Section 2 │   markdown with      │
│   └ Sub 2.1 │   syntax highlight   │
│             │                       │
└─────────────┴───────────────────────┘
```

## 🔍 DEBUGGING CHECKLIST

1. **Check current component being used**:
   ```bash
   grep "DocumentViewer" /mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/frontend/src/App.tsx
   ```

2. **Verify backend is serving API**:
   ```bash
   curl http://172.20.32.1:5000/api/document/Futuredial_SMART_ProcessingPlatform.md | head -5
   ```

3. **Check for import errors in logs**:
   ```bash
   docker.exe logs kb-frontend 2>&1 | grep -i "error\|failed"
   ```

4. **Verify all UI component imports use @/ alias**:
   ```bash
   grep -r "src/lib/utils" /mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/frontend/src/components/ui/
   # Should return nothing - all should be "@/lib/utils"
   ```

## 💡 LESSONS LEARNED

1. **Always install packages in Docker container**:
   ```bash
   docker.exe exec kb-frontend npm install <package>
   docker.exe compose restart frontend
   ```

2. **Docker volume mounts need isolation**:
   ```yaml
   volumes:
     - ./frontend:/app
     - /app/node_modules  # Prevents host conflicts
   ```

3. **After structural changes, rebuild the image**:
   ```bash
   docker.exe compose build frontend
   docker.exe compose up -d
   ```

4. **Use correct IPs in WSL**:
   - Frontend: `http://172.20.32.1:5173/`
   - Backend: `http://172.20.32.1:5000/`
   - NOT localhost!

## ✅ SUCCESS CRITERIA

When everything is working:
1. SearchPage loads with proper dark theme styling
2. Clicking search results navigates to `/document/:filename`
3. Document viewer shows:
   - Sticky header with back navigation
   - Sidebar with auto-generated TOC (if using full version)
   - Styled markdown content
   - Smooth scrolling between sections
4. No console errors about imports or missing exports