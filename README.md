# FAE Knowledge Base 🔍

A simple, searchable knowledge base for engineering teams using Elasticsearch and Flask with **one-command setup**.

![Knowledge Base Interface](https://github.com/user-attachments/assets/eabb573d-3491-4a1d-809b-91a2aec61091)

## ✨ Features

- 📄 **Markdown Support** - Full rendering of markdown documents with syntax highlighting
- 🔍 **Full-Text Search** - Powerful search across all documentation with highlighting
- 🚀 **One-Command Setup** - Auto-indexing and startup with single Docker command
- 📁 **Auto-Indexing** - Automatically indexes documents on startup
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

## 📖 Usage

### Adding Documents
1. Drop markdown files into the `documents/` folder
2. Restart the service: `docker-compose restart web`
3. Documents are automatically re-indexed and searchable

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

### Adding New Documents
```bash
# Add files to documents folder
cp new-file.md documents/

# Restart to re-index
docker-compose restart web
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

## 🐛 Troubleshooting

### Documents Not Appearing
- Check if files are in `documents/` folder
- Restart web service: `docker-compose restart web`
- Check logs: `docker-compose logs web`

### Search Not Working
- Verify Elasticsearch is running: `curl http://localhost:9200`
- Check index exists: `curl http://localhost:9200/knowledge_base/_stats`
- Restart everything: `docker-compose restart`

### Web Interface Not Loading
- Ensure port 5000 is not in use
- Check container status: `docker-compose ps`
- View logs: `docker-compose logs -f web`

## 🔄 Common Commands

```bash
# Start everything
docker-compose up -d --build

# View logs
docker-compose logs -f

# Restart after adding documents  
docker-compose restart web

# Stop everything
docker-compose down

# Clean restart (removes data)
docker-compose down -v && docker-compose up -d --build

# Check status
docker-compose ps
```

## 📝 What Changed from Original

### Removed Complexity
- ❌ **No Kibana** - Custom Flask UI only
- ❌ **No Authentication** - No passwords or user management  
- ❌ **No Manual Steps** - Everything automated

### Added Simplicity  
- ✅ **One Command Setup** - `docker-compose up -d --build`
- ✅ **Auto-Indexing** - Documents indexed automatically on startup
- ✅ **Simplified Configuration** - Minimal environment variables
- ✅ **Better Error Handling** - Robust connection and search handling

### Developer Experience
- **Before**: Multi-step setup, user creation, manual indexing
- **After**: Single command, automatic everything, instant search

## 🚀 Deployment

For production deployment:

1. Set `FLASK_ENV=production` in `.env`
2. Configure proper resource limits in docker-compose.yml
3. Set up persistent volumes backup
4. Consider reverse proxy for SSL/domain

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.