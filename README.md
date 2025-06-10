# FAE Knowledge Base 🔍

A simple, searchable knowledge base for engineering teams using Elasticsearch and Flask with **one-command setup**.

![Knowledge Base Interface](https://github.com/user-attachments/assets/eabb573d-3491-4a1d-809b-91a2aec61091)

## ✨ Features

- 📄 **Markdown Support** - Full rendering of markdown documents with syntax highlighting
- 🔍 **Full-Text Search** - Powerful search across all documentation with highlighting
- 🚀 **One-Command Setup** - Auto-indexing and startup with single Docker command
- 📁 **Auto-Indexing** - Automatically indexes documents on container startup
- 🎨 **Clean UI** - Modern, responsive search interface
- 🐳 **Docker Ready** - Complete containerized deployment
- 🔓 **No Authentication** - Simple, frictionless setup for internal teams

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/Cwilliams333/FAE-knowledge-base.git
cd FAE-knowledge-base
```

### 2. Add Your Documents
```bash
# Place your markdown files in the documents folder
mkdir -p documents
cp your-docs/*.md documents/
```

### 3. One Command to Start Everything
```bash
docker-compose up -d --build
```

**That's it!** 🎉

- ⏳ Elasticsearch will start
- 📄 All documents will be auto-indexed  
- 🌐 Web interface will be available at http://localhost:5000

## 📁 Project Structure
```
FAE-knowledge-base/
├── docker-compose.yml      # Container orchestration
├── Dockerfile             # Web app container config
├── startup.sh             # Auto-ingest + web startup script
├── app.py                 # Flask web application
├── ingest.py              # Document indexer
├── requirements.txt       # Python dependencies
├── .env                   # Environment configuration
├── documents/             # Your markdown files go here
└── README.md              # This file
```

## 📖 Usage

### Adding New Documents

After the initial setup, you can add new documents using either method:

#### Method 1: Manual Indexing (Recommended) ⚡
```bash
# Add files to documents folder
cp new-file.md documents/

# Index new documents immediately
docker exec kb-web python ingest.py
```
✅ **Fast & reliable** - New documents appear in search immediately

#### Method 2: Full Rebuild (Complete Auto-Indexing Test) 🔄
```bash
# Add files to documents folder  
cp new-file.md documents/

# Rebuild containers to trigger auto-indexing
docker-compose down && docker-compose up -d --build
```
✅ **Tests full auto-indexing** - Takes 60 seconds but validates entire system

#### ⚠️ Why `docker-compose restart web` doesn't work
- **Restart** = stops and starts existing container
- **Auto-indexing only runs on container creation**, not restart
- Use **Method 1** (manual) for daily use or **Method 2** (rebuild) for testing

### Searching
- Type keywords in the search box
- Click results to view formatted documents  
- Use "View Raw" to see original markdown
- Search supports fuzzy matching and highlighting

### Supported File Types
- `.md` - Markdown files (primary)
- `.txt` - Plain text files
- `.csv` - CSV files 
- `.json` - JSON files

## ⚙️ Configuration

### Environment Variables (.env)
```bash
# Elasticsearch Configuration (no auth needed)
ES_HOST=http://elasticsearch:9200
ES_USER=
ES_PASSWORD=

# Application Configuration  
INDEX_NAME=knowledge_base
FLASK_ENV=development
PORT=5000

# Indexing Configuration
DOCUMENTS_DIR=/app/documents
WATCH_MODE=false
```

## 🛠️ Development

### Local Development (without Docker)
```bash
# Install dependencies
pip install -r requirements.txt

# Start Elasticsearch
docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.9.0

# Index documents
python ingest.py

# Run the app
python app.py
```

### Development Workflow
```bash
# Add new documents
cp new-docs/*.md documents/

# Quick indexing for development
docker exec kb-web python ingest.py

# View immediately at http://localhost:5000
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Documents/    │───▶│   Elasticsearch  │◀───│   Flask Web     │
│   (markdown)    │    │   (search index) │    │   (UI + API)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                         │
                              │                         │
                       ┌──────▼──────┐         ┌────────▼────────┐
                       │   Auto-     │         │   Search UI     │
                       │   Indexing  │         │   localhost:5000│
                       └─────────────┘         └─────────────────┘
```

## 🔧 Monitoring & Health

- **Health Check**: http://localhost:5000/health
- **Elasticsearch**: http://localhost:9200
- **Document Stats**: http://localhost:5000/stats
- **Logs**: `docker-compose logs -f web`

## 🔄 Common Commands

### Startup & Management
```bash
# Initial setup - starts everything with auto-indexing
docker-compose up -d --build

# Check running status
docker-compose ps

# View real-time logs
docker-compose logs -f web

# Stop everything
docker-compose down
```

### Document Management
```bash
# Add new documents (recommended method)
cp new-file.md documents/
docker exec kb-web python ingest.py

# Check document count
curl http://localhost:5000/stats

# Test search
curl -X POST http://localhost:5000/search \
  -H "Content-Type: application/json" \
  -d '{"query":"your search term"}'
```

### Troubleshooting
```bash
# Clean restart (removes all data)
docker-compose down -v && docker-compose up -d --build

# Force rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check Elasticsearch directly
curl http://localhost:9200
curl http://localhost:9200/knowledge_base/_stats
```

## 🐛 Troubleshooting

### Documents Not Appearing
1. **Check documents folder**: Ensure `.md` files are in `documents/` directory
2. **Manual re-index**: Run `docker exec kb-web python ingest.py`
3. **Check logs**: `docker-compose logs web | grep -i "index\|document"`
4. **Verify stats**: Visit http://localhost:5000/stats

### Search Not Working
1. **Test Elasticsearch**: `curl http://localhost:9200` (should return cluster info)
2. **Check index**: `curl http://localhost:9200/knowledge_base/_stats`
3. **Restart services**: `docker-compose restart`
4. **Check browser console**: Look for JavaScript errors

### Web Interface Not Loading
1. **Port conflict**: Ensure port 5000 is available (`netstat -an | grep 5000`)
2. **Container status**: `docker-compose ps` (web should show "Up")
3. **Container logs**: `docker-compose logs web`
4. **Health check**: `curl http://localhost:5000/health`

### Auto-Indexing Not Working
1. **Check startup.sh**: `docker exec kb-web cat startup.sh`
2. **Container startup logs**: `docker logs kb-web | head -20`
3. **Manual test**: `docker exec kb-web bash startup.sh`
4. **Use manual indexing**: `docker exec kb-web python ingest.py`

## 📝 What Changed from Original

### Removed Complexity
- ❌ **No Kibana** - Custom Flask UI only
- ❌ **No Authentication** - No passwords or user management  
- ❌ **No Manual Multi-Step Setup** - Everything automated

### Added Simplicity  
- ✅ **One Command Setup** - `docker-compose up -d --build`
- ✅ **Auto-Indexing on Startup** - Documents indexed automatically on container creation
- ✅ **Manual Indexing Option** - `docker exec kb-web python ingest.py` for quick updates
- ✅ **Simplified Configuration** - Minimal environment variables
- ✅ **Better Error Handling** - Robust connection and search handling

### Developer Experience
- **Before**: Multi-step setup, user creation, manual indexing, complex authentication
- **After**: Single command, automatic indexing, instant search, zero authentication

## 🚀 Deployment

### Production Setup
1. **Update environment**: Set `FLASK_ENV=production` in `.env`
2. **Resource limits**: Configure memory/CPU limits in docker-compose.yml
3. **Persistent storage**: Ensure `es_data` volume is properly backed up
4. **Reverse proxy**: Use nginx/Apache for SSL termination and domain routing
5. **Monitoring**: Set up log aggregation and health monitoring

### Production Commands
```bash
# Production startup
FLASK_ENV=production docker-compose up -d --build

# Monitor in production
docker-compose logs -f --tail=100

# Backup data volume
docker run --rm -v fae-knowledge-base_es_data:/data -v $(pwd):/backup ubuntu tar czf /backup/es-backup.tar.gz /data
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Test your changes: `docker-compose up -d --build`
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 🔍 API Reference

### Search API
```bash
# Search documents
POST /search
Content-Type: application/json
{
  "query": "search terms"
}

# Response
{
  "total": 5,
  "results": [
    {
      "filename": "document.md",
      "content": "...",
      "highlight": "highlighted content...",
      "score": 1.234
    }
  ]
}
```

### Health & Stats
```bash
# Health check
GET /health
# Returns: {"status": "healthy", "elasticsearch": "connected"}

# Document statistics  
GET /stats
# Returns: {"count": 42}
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**🎯 Ready to get started?** Run `docker-compose up -d --build` and visit http://localhost:5000!