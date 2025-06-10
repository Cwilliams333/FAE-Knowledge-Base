import os
from flask import Flask, render_template_string, jsonify, request, Response
from flask_cors import CORS
from elasticsearch import Elasticsearch
import urllib3
import markdown
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app)

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

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>FAE Knowledge Base</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .search-box {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        input[type="text"] {
            width: 70%;
            padding: 15px;
            font-size: 18px;
            border: 2px solid #ddd;
            border-radius: 5px;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #4CAF50;
        }
        button {
            padding: 15px 30px;
            font-size: 18px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-left: 10px;
        }
        button:hover { background: #45a049; }
        .results {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .result-item {
            border-bottom: 1px solid #eee;
            padding: 15px 0;
            transition: background 0.2s;
        }
        .result-item:hover {
            background: #f9f9f9;
        }
        .result-title {
            font-size: 20px;
            color: #1976d2;
            margin-bottom: 5px;
            cursor: pointer;
            text-decoration: none;
            display: block;
        }
        .result-title:hover {
            text-decoration: underline;
        }
        .result-preview {
            color: #666;
            margin: 10px 0;
            line-height: 1.5;
        }
        .highlight { 
            background: #ffeb3b; 
            padding: 2px 4px;
            border-radius: 3px;
        }
        .stats { 
            text-align: center; 
            margin: 20px 0; 
            color: #666;
        }
        .result-meta {
            font-size: 14px;
            color: #999;
        }
        .loading {
            text-align: center;
            color: #666;
            padding: 40px;
        }
        .upload-section {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>🔍 FAE Knowledge Base</h1>
    
    <div class="search-box">
        <div class="upload-section">
            <p>📁 Place your markdown files in the <code>documents</code> folder to index them</p>
        </div>
        
        <input type="text" id="query" placeholder="Search all documentation..." onkeypress="if(event.key==='Enter') search()">
        <button onclick="search()">Search</button>
    </div>
    
    <div id="stats" class="stats"></div>
    <div id="results" class="results"></div>
    
    <script>
        async function search() {
            const query = document.getElementById('query').value;
            if (!query) return;
            
            document.getElementById('results').innerHTML = '<div class="loading">Searching...</div>';
            
            try {
                const response = await fetch('/search', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({query: query})
                });
                
                const data = await response.json();
                displayResults(data);
            } catch (error) {
                document.getElementById('results').innerHTML = 'Error: ' + error;
            }
        }
        
        function displayResults(data) {
            const total = data.total;
            const hits = data.results;
            
            document.getElementById('stats').innerHTML = 
                `Found <strong>${total}</strong> results`;
            
            if (hits.length === 0) {
                document.getElementById('results').innerHTML = '<p style="text-align: center; color: #999;">No results found</p>';
                return;
            }
            
            let html = '';
            hits.forEach(hit => {
                html += `
                    <div class="result-item">
                        <a href="/document/${encodeURIComponent(hit.filename)}" class="result-title">
                            📄 ${hit.filename}
                        </a>
                        <div class="result-preview">
                            ${hit.highlight || hit.content.substring(0, 300) + '...'}
                        </div>
                        <div class="result-meta">
                            Score: ${hit.score.toFixed(2)} | Size: ${(hit.content.length / 1024).toFixed(1)} KB
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('results').innerHTML = html;
        }
        
        // Get initial count
        fetch('/stats').then(r => r.json()).then(data => {
            document.getElementById('stats').innerHTML = 
                `📚 Total documents indexed: <strong>${data.count}</strong>`;
        });
    </script>
</body>
</html>
'''

DOC_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }} - Knowledge Base</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .back-link {
            display: inline-block;
            color: #1976d2;
            text-decoration: none;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .back-link:hover {
            text-decoration: underline;
        }
        h1 {
            color: #333;
            margin: 10px 0;
        }
        .meta {
            color: #666;
            font-size: 14px;
        }
        .content h1, .content h2, .content h3 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .content h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .content h2 { border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .content code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
        }
        .content pre {
            background: #282c34;
            color: #abb2bf;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
        }
        .content pre code {
            background: none;
            padding: 0;
            color: #abb2bf;
        }
        .content blockquote {
            border-left: 4px solid #ddd;
            margin-left: 0;
            padding-left: 20px;
            color: #666;
            font-style: italic;
        }
        .content table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        .content table th, .content table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .content table th {
            background: #f5f5f5;
            font-weight: bold;
        }
        .content table tr:nth-child(even) {
            background: #f9f9f9;
        }
        .content a {
            color: #1976d2;
        }
        .content ul, .content ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        .content li {
            margin: 5px 0;
        }
        .actions {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
        }
        .action-btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 0 10px;
            background: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 14px;
        }
        .action-btn:hover {
            background: #45a049;
        }
        .action-btn.secondary {
            background: #757575;
        }
        .action-btn.secondary:hover {
            background: #616161;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="/" class="back-link">← Back to Search</a>
            <h1>{{ title }}</h1>
            <div class="meta">
                Size: {{ size }} KB | Last indexed: {{ timestamp }}
            </div>
        </div>
        
        <div class="content">
            {{ content|safe }}
        </div>
        
        <div class="actions">
            <a href="/raw/{{ filename }}" class="action-btn secondary">View Raw</a>
            <a href="/" class="action-btn">New Search</a>
        </div>
    </div>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/search', methods=['POST'])
def search():
    try:
        query = request.json.get('query', '')
        
        result = es.search(
            index=INDEX_NAME,
            query={
                "multi_match": {
                    "query": query,
                    "fields": ["content", "filename^2"],
                    "fuzziness": "AUTO"
                }
            },
            highlight={
                "fields": {
                    "content": {
                        "fragment_size": 150,
                        "number_of_fragments": 3,
                        "pre_tags": ["<span class='highlight'>"],
                        "post_tags": ["</span>"]
                    }
                }
            },
            size=20
        )
        
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
    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/document/<filename>')
def view_document(filename):
    """View a specific document with rendered markdown"""
    try:
        result = es.search(
            index=INDEX_NAME,
            query={
                "term": {
                    "filename": filename
                }
            }
        )
        
        if result['hits']['total']['value'] == 0:
            result = es.search(
                index=INDEX_NAME,
                query={
                    "match": {
                        "filename": filename
                    }
                }
            )
            
            if result['hits']['total']['value'] == 0:
                return "Document not found", 404
        
        doc = result['hits']['hits'][0]['_source']
        
        md = markdown.Markdown(extensions=[
            'extra',
            'codehilite',
            'toc',
            'nl2br',
            'sane_lists'
        ])
        
        html_content = md.convert(doc['content'])
        
        return render_template_string(DOC_TEMPLATE,
            title=filename.replace('.md', ''),
            filename=filename,
            content=html_content,
            size=f"{len(doc['content']) / 1024:.1f}",
            timestamp=doc.get('timestamp', 'Unknown')
        )
        
    except Exception as e:
        print(f"Document view error: {e}")
        return f"Error loading document: {str(e)}", 500

@app.route('/raw/<filename>')
def view_raw(filename):
    """View raw markdown content"""
    try:
        result = es.search(
            index=INDEX_NAME,
            query={
                "term": {
                    "filename": filename
                }
            }
        )
        
        if result['hits']['total']['value'] == 0:
            return "Document not found", 404
        
        doc = result['hits']['hits'][0]['_source']
        
        return Response(doc['content'], mimetype='text/plain; charset=utf-8')
        
    except Exception as e:
        print(f"Raw view error: {e}")
        return f"Error: {str(e)}", 500

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

if __name__ == '__main__':
    # Run with debug=False to avoid issues in production
    port = int(os.getenv('PORT', 5000))
    print(f"🚀 Starting Knowledge Base Server on port {port}...")
    print(f"📍 Access at: http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)