# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


**KEY LESSON**: Always install npm packages INSIDE Docker container:
```bash
docker.exe exec kb-frontend npm install <package>
docker.exe compose restart frontend
```

## Development Environment Setup

This project uses **Docker Compose** with three services. When working in WSL/Docker environments, use these specific commands:

### Critical File Path Rules

**ALWAYS work from the project root directory:**
```bash
cd /mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base
```

**File editing locations:**
- **Frontend files**: Edit directly in `/mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/frontend/src/`
- **Backend files**: Edit directly in `/mnt/c/Users/cwilliams/Desktop/atOnce/Projects/FAE-Knowledge-Base/`
- **Docker syncs automatically** via volume mounts - changes appear immediately in containers

### Docker Commands (Windows + WSL)
```bash
# Use docker.exe for WSL environments
docker.exe compose up -d --build    # Start all services
docker.exe compose ps               # Check service status
docker.exe compose logs frontend    # View frontend logs
docker.exe compose restart frontend # Restart specific service

# Execute commands in containers
docker.exe exec kb-frontend npm install <package>
docker.exe exec kb-web python ingest.py
```

### Package Management Workflow

**Frontend packages (React/TypeScript):**
```bash
# IMPORTANT: Install packages INSIDE the container, not locally
docker.exe exec kb-frontend npm install <package-name>

# After installing new packages, restart the frontend container
docker.exe compose restart frontend

# Check if packages are properly installed
docker.exe exec kb-frontend npm list <package-name>
```

**NEVER run npm commands locally in WSL** - they won't sync to the container properly.

### Service Access URLs - CRITICAL NETWORKING INFO

**Frontend Access (NEVER use localhost for frontend):**
- ✅ **Correct**: `http://172.20.32.1:5173/` (WSL gateway IP)
- ❌ **Wrong**: `http://localhost:5173/` (will not work in WSL/Docker setup)

**Backend & Database:**
- **Backend (Flask)**: `http://localhost:5000/`
- **Elasticsearch**: `http://localhost:9200/`

**How to find the correct frontend IP:**
```bash
# Check Docker network details
docker.exe network inspect fae-knowledge-base_knowledge-net

# Look for the gateway IP in the IPAM config
# Frontend container IP will be on this network (typically 172.18.0.x)
# Access via WSL gateway: 172.20.32.1:5173
```

## Architecture Overview

**Three-tier containerized application:**

```
Frontend (React) → Backend (Flask) → Database (Elasticsearch)
     ↓                    ↓                     ↓
Port 5173           Port 5000            Port 9200
Vite dev server     Search API           Document index
```

### Key Components

1. **Backend (`app.py`)**: Flask application serving both embedded HTML UI and REST API
2. **Frontend (`frontend/`)**: Modern React app with TypeScript, Tailwind, and markdown rendering
3. **Auto-indexer (`ingest.py`)**: Smart document indexing with MD5 change detection
4. **Document store (`documents/`)**: Markdown files automatically indexed on startup

