"""
Test configuration and fixtures for FAE Knowledge Base API tests.

This module provides centralized fixtures for testing the Flask API,
following modern pytest best practices with proper isolation and cleanup.
"""

import pytest
import requests
from unittest.mock import Mock, patch
import time
import os


# Test Configuration - Use localhost in CI, WSL gateway locally
TEST_API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000")
TEST_TIMEOUT = 30  # seconds


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
    """
    max_retries = 10
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
                pytest.fail(f"API not ready after {max_retries} attempts")
    
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


# Auto-use fixtures
@pytest.fixture(autouse=True)
def setup_test_environment(wait_for_api):
    """
    Automatically ensure API is ready for each test.
    
    This fixture runs before every test to ensure the API is responsive.
    It's marked as autouse so it applies to all tests automatically.
    """
    pass