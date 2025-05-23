# FAE Knowledge Base 🔍

A simple, searchable knowledge base for engineering teams using Elasticsearch and Flask.

## Features

- 📄 **Markdown Support** - Beautiful rendering of markdown documents
- 🔍 **Full-Text Search** - Powerful search across all your documentation
- 🐳 **Docker Ready** - Easy deployment with Docker Compose
- 📁 **Auto-Indexing** - Automatically indexes new documents
- 🎨 **Clean UI** - Simple, Google-like search interface

## Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/engineering-knowledge-base.git
cd engineering-knowledge-base
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Add your documents
Place your markdown files in the `documents/` folder:
```bash
mkdir documents
cp your-docs/*.md documents/
```

### 4. Start with Docker Compose
```bash
docker-compose up -d
```

### 5. Access the UI
Open http://localhost:5000 in your browser

## Project Structure
```
engineering-knowledge-base/
├── docker-compose.yml      # Docker orchestration
├── Dockerfile             # Web app container
├── app.py                # Flask web application
├── ingest.py             # Document indexer
├── requirements.txt      # Python dependencies
├── .env.example         # Environment template
├── documents/           # Your markdown files go here
└── README.md           # This file
```

## Configuration

### Environment Variables
- `ELASTIC_PASSWORD` - Password for Elasticsearch
- `ES_HOST` - Elasticsearch host (default: https://elasticsearch:9200)
- `INDEX_NAME` - Name of the Elasticsearch index
- `DOCUMENTS_DIR` - Directory containing documents
- `WATCH_MODE` - Enable auto-reindexing (true/false)

## Usage

### Adding Documents
1. Drop markdown files into the `documents/` folder
2. Files are automatically indexed within 30 seconds
3. Search for them immediately

### Searching
- Type keywords in the search box
- Click on results to view formatted documents
- Use "View Raw" to see original markdown

### Supported File Types
- `.md` - Markdown files
- `.txt` - Plain text files
- `.csv` - CSV files (coming soon)
- `.json` - JSON files (coming soon)

## Development

### Run locally without Docker
```bash
# Install dependencies
pip install -r requirements.txt

# Start Elasticsearch (if not running)
docker run -d -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.9.0

# Run the app
python app.py
```

### Run indexer manually
```bash
python ingest.py
```

## Deployment

### Using Docker Compose (Recommended)
```bash
docker-compose up -d
```

### Manual deployment
1. Set up Elasticsearch cluster
2. Configure environment variables
3. Run app with gunicorn:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

## Monitoring

- Health check: http://localhost:5000/health
- Elasticsearch: http://localhost:9200
- Logs: `docker-compose logs -f`

## Troubleshooting

### Documents not appearing
- Check `documents/` folder permissions
- View indexer logs: `docker-compose logs web`
- Verify Elasticsearch is running: `docker-compose ps`

### Search not working
- Ensure Elasticsearch is healthy
- Check index exists: `curl -k https://elastic:password@localhost:9200/_cat/indices`
- Rebuild index: `docker-compose restart web`

