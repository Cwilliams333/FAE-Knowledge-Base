#!/bin/bash

echo "🚀 Starting FAE Knowledge Base..."

# Wait for Elasticsearch to be ready
echo "⏳ Waiting for Elasticsearch..."
python -c "
import os
import time
from elasticsearch import Elasticsearch
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

ES_HOST = os.getenv('ES_HOST', 'http://elasticsearch:9200')
for i in range(30):
    try:
        es = Elasticsearch([ES_HOST], verify_certs=False, ssl_show_warn=False)
        if es.ping():
            print('✓ Elasticsearch is ready!')
            break
    except Exception as e:
        print(f'Attempt {i+1}/30: Waiting...')
        time.sleep(2)
else:
    print('❌ Elasticsearch failed to start')
    exit(1)
"

# Auto-index documents
echo "📄 Auto-indexing documents..."
python ingest.py

# Start the web application
echo "🌐 Starting web server..."
echo "📍 Access your knowledge base at: http://localhost:5000"
python app.py