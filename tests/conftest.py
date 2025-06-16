"""
Test configuration and fixtures for FAE Knowledge Base API tests.

This module provides centralized fixtures for testing the Flask API,
following modern pytest best practices with proper isolation and cleanup.

Architecture Note: Tests work with the microservices architecture where:
- elasticsearch: Provides the search backend
- ingest: Indexes test documents from test_documents/ directory  
- backend: Runs the Flask API server
- Tests wait for ingest completion before running via service dependencies
"""

import pytest
import requests
from unittest.mock import Mock, patch
import time
import os


# Test Configuration - Use localhost in CI, WSL gateway locally
TEST_API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")
TEST_TIMEOUT = 30  # seconds
TEST_INDEX = "knowledge_base_test"  # Test-specific index name


@pytest.fixture(scope="session")
def api_base_url():
    """Base URL for the API under test."""
    return TEST_API_BASE_URL


@pytest.fixture(scope="function")
def api_client(api_base_url):
    """
    HTTP client for making API requests.
    
    Returns a session configured for the test API with appropriate timeouts
    and error handling. New session for each test to ensure isolation.
    """
    session = requests.Session()
    session.timeout = TEST_TIMEOUT
    
    # Set base URL for convenience methods
    session.base_url = api_base_url
    
    # Add convenience methods to session
    def get_endpoint(endpoint, **kwargs):
        return session.get(f"{api_base_url}{endpoint}", **kwargs)
    
    def post_endpoint(endpoint, **kwargs):
        return session.post(f"{api_base_url}{endpoint}", **kwargs)
    
    session.get_endpoint = get_endpoint
    session.post_endpoint = post_endpoint
    
    yield session
    session.close()


@pytest.fixture(scope="function")
def wait_for_api(api_client):
    """
    Ensure the API is ready before running tests.
    
    This fixture attempts to connect to the health endpoint and waits
    for a successful response before allowing tests to proceed.
    Works with the microservices architecture where backend depends on ingest completion.
    """
    max_retries = 15  # Increased for microservices startup time
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            response = api_client.get_endpoint("/health")
            if response.status_code in [200, 503]:  # API is responsive
                return True
        except requests.RequestException:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                pytest.fail(f"Backend API not ready after {max_retries} attempts. "
                          f"Check that elasticsearch, ingest, and backend services are running.")
    
    return True


@pytest.fixture(scope="function")
def mock_elasticsearch():
    """
    Mock Elasticsearch client for unit tests.
    
    Provides a mock ES client with common methods stubbed out.
    Useful for testing API logic without requiring a real ES instance.
    """
    mock_es = Mock()
    
    # Default ping response
    mock_es.ping.return_value = True
    
    # Default search response
    mock_es.search.return_value = {
        'hits': {
            'total': {'value': 0},
            'hits': []
        }
    }
    
    # Default count response
    mock_es.count.return_value = {'count': 0}
    
    return mock_es


@pytest.fixture(scope="function")
def sample_search_response():
    """
    Sample Elasticsearch search response for testing.
    
    Provides realistic test data that matches the expected structure
    from the actual Elasticsearch API.
    """
    return {
        'hits': {
            'total': {'value': 2},
            'hits': [
                {
                    '_source': {
                        'filename': 'API_Documentation.md',
                        'content': 'This is a sample API documentation with test content.',
                        'timestamp': '2025-01-01T00:00:00Z'
                    },
                    '_score': 1.5,
                    'highlight': {
                        'content': ['This is a <span class="highlight">sample</span> API documentation']
                    }
                },
                {
                    '_source': {
                        'filename': 'test-document.md',
                        'content': 'Another test document with different content.',
                        'timestamp': '2025-01-01T01:00:00Z'
                    },
                    '_score': 1.2,
                    'highlight': {
                        'content': ['Another <span class="highlight">test</span> document']
                    }
                }
            ]
        }
    }


@pytest.fixture(scope="function")
def sample_document_response():
    """
    Sample single document response for testing document retrieval.
    """
    return {
        'hits': {
            'total': {'value': 1},
            'hits': [
                {
                    '_source': {
                        'filename': 'API_Documentation.md',
                        'content': '# API Documentation\n\nThis is comprehensive API documentation.\n\n## Getting Started\n\nFollow these steps...',
                        'timestamp': '2025-01-01T00:00:00Z'
                    }
                }
            ]
        }
    }


# Test data seeding
@pytest.fixture(scope="session", autouse=True) 
def seed_elasticsearch():
    """
    Wait for the ingest service to complete and backend to be ready.
    
    In the new microservices architecture, the ingest service handles
    document indexing automatically before the backend starts.
    This fixture ensures both services are ready for testing.
    """
    import time
    from elasticsearch import Elasticsearch
    
    # Wait for backend API to be ready (it depends on ingest completion)
    max_retries = 60  # Increased timeout for microservices startup
    retry_delay = 2
    
    print("Waiting for backend API to be ready...")
    
    for i in range(max_retries):
        try:
            response = requests.get(f"{TEST_API_BASE_URL}/health", timeout=5)
            if response.status_code in [200, 503]:
                print(f"✓ Backend API is ready (attempt {i + 1})")
                break
        except requests.RequestException as e:
            if i < max_retries - 1:
                print(f"Attempt {i + 1}/{max_retries}: Backend not ready yet ({e})")
                time.sleep(retry_delay)
            else:
                pytest.fail(f"Backend API not ready after {max_retries} attempts")
    
    # Verify test documents were indexed by checking document count
    try:
        stats_response = requests.get(f"{TEST_API_BASE_URL}/stats", timeout=10)
        if stats_response.status_code == 200:
            doc_count = stats_response.json().get("count", 0)
            print(f"✓ Test index contains {doc_count} documents")
            if doc_count == 0:
                print("⚠ Warning: No documents found in test index")
        else:
            print(f"⚠ Warning: Could not verify document count (status: {stats_response.status_code})")
    except Exception as e:
        print(f"⚠ Warning: Could not verify document count: {e}")
    
    yield  # Run tests
    
    # Cleanup: Delete test index (handled by docker-compose down in CI/CD)
    # In the microservices architecture, cleanup is handled by container lifecycle
    print("✓ Test session complete")

# Auto-use fixtures  
@pytest.fixture(autouse=True)
def setup_test_environment(wait_for_api):
    """
    Automatically ensure API is ready for each test.
    
    This fixture runs before every test to ensure the API is responsive.
    It's marked as autouse so it applies to all tests automatically.
    """
    pass