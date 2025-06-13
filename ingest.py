import os
import time
import argparse
from datetime import datetime
from elasticsearch import Elasticsearch
import urllib3
from pathlib import Path
import hashlib

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Global variables (will be set by parse_args or environment)
ES_HOST = None
ES_USER = None  
ES_PASSWORD = None
INDEX_NAME = None
DOCUMENTS_DIR = None

def connect_elasticsearch():
    """Connect to Elasticsearch with retry logic"""
    for i in range(30):
        try:
            # Check if we need authentication
            if ES_USER and ES_PASSWORD:
                es = Elasticsearch(
                    [ES_HOST],
                    basic_auth=(ES_USER, ES_PASSWORD),
                    verify_certs=False,
                    ssl_show_warn=False
                )
            else:
                # No authentication needed
                es = Elasticsearch(
                    [ES_HOST],
                    verify_certs=False,
                    ssl_show_warn=False
                )
            
            if es.ping():
                print("✓ Connected to Elasticsearch")
                return es
        except Exception as e:
            print(f"Waiting for Elasticsearch... ({i+1}/30): {str(e)[:50]}")
            time.sleep(2)
    raise Exception("Failed to connect to Elasticsearch")

def get_file_hash(filepath):
    """Generate hash of file contents"""
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def create_index(es):
    """Create index if it doesn't exist"""
    if not es.indices.exists(index=INDEX_NAME):
        es.indices.create(
            index=INDEX_NAME,
            mappings={
                "properties": {
                    "filename": {"type": "keyword"},
                    "content": {"type": "text"},
                    "file_path": {"type": "keyword"},
                    "file_hash": {"type": "keyword"},
                    "file_size": {"type": "long"},
                    "timestamp": {"type": "date"},
                    "last_modified": {"type": "date"}
                }
            }
        )
        print(f"✓ Created index '{INDEX_NAME}'")
    else:
        print(f"! Index '{INDEX_NAME}' already exists")

def should_reindex(es, filepath, file_hash):
    """Check if file needs to be reindexed"""
    filename = os.path.basename(filepath)
    
    try:
        # Check if file exists in index with same hash
        result = es.search(
            index=INDEX_NAME,
            query={
                "bool": {
                    "must": [
                        {"term": {"filename": filename}},
                        {"term": {"file_hash": file_hash}}
                    ]
                }
            }
        )
        
        return result['hits']['total']['value'] == 0
    except Exception as e:
        print(f"Error checking if file should be reindexed: {e}")
        return True  # Reindex on error

def index_documents(es):
    """Index all documents in the documents directory"""
    if not os.path.exists(DOCUMENTS_DIR):
        os.makedirs(DOCUMENTS_DIR)
        print(f"Created documents directory: {DOCUMENTS_DIR}")
        return
    
    # Supported file extensions
    extensions = ['.md', '.txt', '.csv', '.json']
    
    indexed = 0
    skipped = 0
    errors = 0
    
    for root, dirs, files in os.walk(DOCUMENTS_DIR):
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                filepath = os.path.join(root, file)
                
                try:
                    # Get file info
                    file_stats = os.stat(filepath)
                    file_hash = get_file_hash(filepath)
                    
                    # Check if needs reindexing
                    if not should_reindex(es, filepath, file_hash):
                        print(f"⏭️  Skipping {file} (unchanged)")
                        skipped += 1
                        continue
                    
                    # Read file content
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Prepare document
                    doc = {
                        "filename": file,
                        "content": content,
                        "file_path": filepath.replace(DOCUMENTS_DIR, ''),
                        "file_hash": file_hash,
                        "file_size": file_stats.st_size,
                        "timestamp": datetime.now().isoformat(),
                        "last_modified": datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                    }
                    
                    # Index document
                    es.index(index=INDEX_NAME, document=doc)
                    print(f"✓ Indexed: {file}")
                    indexed += 1
                    
                except Exception as e:
                    print(f"✗ Error indexing {file}: {e}")
                    errors += 1
    
    # Refresh index
    if indexed > 0:
        try:
            es.indices.refresh(index=INDEX_NAME)
        except Exception as e:
            print(f"Warning: Could not refresh index: {e}")
    
    print(f"\n{'='*50}")
    print(f"Indexing complete!")
    print(f"✓ Indexed: {indexed} documents")
    print(f"⏭️  Skipped: {skipped} unchanged documents")
    if errors > 0:
        print(f"✗ Errors: {errors}")

def watch_mode(es):
    """Continuously watch for changes and reindex"""
    print("\n👁️  Watching for changes...")
    
    while True:
        try:
            index_documents(es)
            time.sleep(30)  # Check every 30 seconds
        except KeyboardInterrupt:
            print("\nStopping watch mode...")
            break
        except Exception as e:
            print(f"Error in watch mode: {e}")
            time.sleep(30)

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Index documents into Elasticsearch')
    parser.add_argument('--path', default=None, help='Directory containing documents to index')
    parser.add_argument('--index', default=None, help='Elasticsearch index name')
    parser.add_argument('--es-host', default=None, help='Elasticsearch host URL')
    parser.add_argument('--watch', action='store_true', help='Watch for changes and continuously reindex')
    return parser.parse_args()

def configure_globals(args):
    """Configure global variables from args and environment"""
    global ES_HOST, ES_USER, ES_PASSWORD, INDEX_NAME, DOCUMENTS_DIR
    
    # Configuration from args first, then environment defaults
    ES_HOST = args.es_host or os.getenv('ES_HOST', 'http://localhost:9200')
    ES_USER = os.getenv('ES_USER', '')  # Only from environment
    ES_PASSWORD = os.getenv('ES_PASSWORD', '')  # Only from environment  
    INDEX_NAME = args.index or os.getenv('INDEX_NAME', 'knowledge_base')
    DOCUMENTS_DIR = args.path or os.getenv('DOCUMENTS_DIR', '/app/documents')

if __name__ == "__main__":
    # Parse command line arguments
    args = parse_args()
    configure_globals(args)
    
    # Connect to Elasticsearch
    es = connect_elasticsearch()
    
    # Create index
    create_index(es)
    
    # Initial indexing
    index_documents(es)
    
    # Watch for changes if requested or in Docker with WATCH_MODE
    if args.watch or os.getenv('WATCH_MODE', 'false').lower() == 'true':
        watch_mode(es)