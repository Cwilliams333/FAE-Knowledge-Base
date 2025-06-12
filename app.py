import os
from flask import Flask, jsonify, request, Response, abort
from flask_cors import CORS
from elasticsearch import Elasticsearch, NotFoundError
from elasticsearch import NotFoundError as ESNotFoundError
from werkzeug.exceptions import HTTPException, BadRequest, NotFound, UnsupportedMediaType
from functools import wraps
import urllib3
import markdown
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://172.20.32.1:5173", "http://localhost:5173"]}})
# Allow specific origins for CORS (WSL gateway IP and localhost)

# Configuration from environment variables
ES_HOST = os.getenv('ES_HOST', 'http://localhost:9200')
ES_USER = os.getenv('ES_USER', '')  # Empty string if not set
ES_PASSWORD = os.getenv('ES_PASSWORD', '')  # Empty string if not set
INDEX_NAME = os.getenv('INDEX_NAME', 'knowledge_base')

# Wait for Elasticsearch to be ready
def wait_for_elasticsearch(max_retries=30):
    """Wait for Elasticsearch to be available"""
    print(f"Waiting for Elasticsearch at {ES_HOST}...")
    
    for i in range(max_retries):
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
                print("✓ Elasticsearch is ready!")
                return es
        except Exception as e:
            print(f"Attempt {i+1}/{max_retries}: {str(e)[:50]}...")
            time.sleep(2)
    
    raise Exception("Elasticsearch failed to start")

# Initialize Elasticsearch connection
es = wait_for_elasticsearch()

# Global error handlers using Werkzeug exceptions
# --- DECORATORS ---

def require_json_content_type(f):
    """Decorator to ensure request Content-Type is application/json."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            abort(415, description="Unsupported Media Type. Request must be 'application/json'.")
        return f(*args, **kwargs)
    return decorated_function

# --- APP-LEVEL ERROR HANDLERS ---

@app.errorhandler(HTTPException)
def handle_http_exception(e):
    """
    Handles all standard HTTP exceptions (4xx and 5xx) raised by abort() 
    or Flask/Werkzeug. Formats them into a consistent JSON response.
    """
    response = e.get_response()
    response.data = jsonify({
        "error": {
            "code": e.code,
            "name": e.name,
            "message": e.description,
        }
    }).data
    response.content_type = "application/json"
    app.logger.warning(f"HTTP Exception: {e.code} {e.name} - {e.description}")
    return response

@app.errorhandler(ESNotFoundError)
def handle_es_not_found(e):
    """
    Specifically handles Elasticsearch's NotFoundError and translates it
    to a standard HTTP 404 Not Found response.
    """
    app.logger.info(f"Elasticsearch document/index not found: {e.info}")
    abort(404, description="The requested resource or its underlying index was not found.")

@app.errorhandler(Exception)
def handle_unexpected_error(e):
    """
    The final safety net. Catches any exception not handled above and
    returns a generic 500 Internal Server Error.
    """
    app.logger.error(f"UNEXPECTED ERROR: {e}", exc_info=True)
    return jsonify({
        "error": {
            "code": 500,
            "name": "Internal Server Error",
            "message": "An unexpected error occurred on the server."
        }
    }), 500

@app.route('/')
def api_info():
    """Return API information"""
    return {
        "name": "FAE Knowledge Base API",
        "version": "1.0.0",
        "endpoints": {
            "search": "POST /search",
            "document": "GET /api/document/<filename>",
            "stats": "GET /stats",
            "health": "GET /health"
        }
    }

@app.route('/search', methods=['POST'])
@require_json_content_type  # DECORATOR: Handles the Content-Type check
def search():
    # CLEANUP: No more manual content-type checks or try/except for parsing.
    # request.get_json() will raise a BadRequest (HTTPException) on malformed JSON,
    # which our app-level handler will catch and format into a 400 response.
    payload = request.get_json()
    
    if payload is None:
        abort(400, description="Request body cannot be empty.")
    
    query = (payload.get('query') or '').strip()
    
    es_body = {}
    if not query:
        # Empty query returns all documents (match_all)
        es_body = {
            "query": {"match_all": {}},
            "size": 20
        }
    else:
        es_body = {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["content", "filename^2"],
                    "fuzziness": "AUTO"
                }
            },
            "highlight": {
                "fields": {
                    "content": {
                        "fragment_size": 150,
                        "number_of_fragments": 3,
                        "pre_tags": ["<span class='highlight'>"],
                        "post_tags": ["</span>"]
                    }
                }
            },
            "size": 20
        }
    
    result = es.search(index=INDEX_NAME, body=es_body)
    
    hits = []
    for hit in result['hits']['hits']:
        doc = hit['_source']
        highlights = hit.get('highlight', {}).get('content', [])
        
        hits.append({
            'filename': doc['filename'],
            'content': doc['content'],
            'highlight': ' ... '.join(highlights) if highlights else None,
            'score': hit['_score']
        })
    
    return jsonify({
        'total': result['hits']['total']['value'],
        'results': hits
    })

# Note: HTML-serving routes have been removed.
# Use the React frontend for viewing documents.

@app.route('/api/document/<filename>')
def get_document_api(filename):
    """Get document content as JSON for React frontend"""
    # BEST PRACTICE: Use a 'term' query on a '.keyword' field for exact, non-analyzed matches.
    # This is more efficient and reliable than a 'match' query for filenames.
    # Assumes your Elasticsearch mapping for 'filename' includes a 'keyword' sub-field.
    result = es.search(
        index=INDEX_NAME,
        query={
            "term": {
                "filename": filename
            }
        }
    )
    
    # REFACTOR: Instead of raising a custom exception, check the result and
    # use abort(404), which our app-level handler will catch and format.
    if result['hits']['total']['value'] == 0:
        abort(404, description=f"Document with filename '{filename}' not found.")
    
    doc = result['hits']['hits'][0]['_source']
    
    # The rest of your business logic remains the same
    title = filename.replace('.md', '').replace('-', ' ').replace('_', ' ').title()
    
    content_lines = doc['content'].split('\n')
    description = None
    for line in content_lines:
        line = line.strip()
        if line and not line.startswith('#') and not line.startswith('```'):
            description = line[:150] + '...' if len(line) > 150 else line
            break
    
    return jsonify({
        'filename': doc['filename'],
        'title': title,
        'content': doc['content'],
        'description': description,
        'last_modified': doc.get('last_modified'),
        'file_size': doc.get('file_size'),
        'metadata': {
            'title': title,
            'size': doc.get('file_size', 0)
        }
    })

@app.route('/stats')
def stats():
    try:
        count = es.count(index=INDEX_NAME)
        return jsonify({'count': count['count']})
    except Exception as e:
        print(f"Stats error: {e}")
        return jsonify({'count': 0})

@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        if es.ping():
            return jsonify({'status': 'healthy', 'elasticsearch': 'connected'})
    except Exception as e:
        print(f"Health check error: {e}")
    return jsonify({'status': 'unhealthy', 'elasticsearch': 'disconnected'}), 503

# Note: This application should be run with a production WSGI server like Gunicorn.
# Do not use app.run() in production.
# Example: gunicorn --bind 0.0.0.0:5000 app:app