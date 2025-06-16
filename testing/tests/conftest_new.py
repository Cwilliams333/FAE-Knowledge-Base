"""
Enhanced Test Configuration for Microservices Architecture

This module provides test fixtures designed specifically for the microservices
architecture where tests run inside Docker containers with direct service-to-service
communication.
"""

import pytest
import requests
import os
import time
from typing import Dict, Any
import logging

# Configure test logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test Configuration
class TestConfig:
    """Centralized test configuration for microservices."""
    
    # Environment detection
    TEST_ENV = os.getenv('TEST_ENV', 'local')
    
    # Service endpoints (environment-aware)
    SERVICE_URLS = {
        'docker': {
            'api_base': 'http://backend:5000',
            'elasticsearch': 'http://elasticsearch:9200'
        },
        'local': {
            'api_base': 'http://172.20.32.1:5001',  # Test port
            'elasticsearch': 'http://172.20.32.1:9201'  # Test port
        },
        'ci': {
            'api_base': 'http://localhost:5001',  # Test port
            'elasticsearch': 'http://localhost:9201'  # Test port
        }
    }
    
    # Test settings
    API_BASE_URL = os.getenv('API_BASE_URL', SERVICE_URLS[TEST_ENV]['api_base'])
    ES_HOST = os.getenv('ES_HOST', SERVICE_URLS[TEST_ENV]['elasticsearch'])
    INDEX_NAME = os.getenv('INDEX_NAME', 'knowledge_base_test')
    TIMEOUT = int(os.getenv('TEST_TIMEOUT', '30'))
    
    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """Get current test configuration."""
        return {
            'api_base_url': cls.API_BASE_URL,
            'es_host': cls.ES_HOST,
            'index_name': cls.INDEX_NAME,
            'timeout': cls.TIMEOUT,
            'test_env': cls.TEST_ENV
        }

# Session-level fixtures
@pytest.fixture(scope="session")
def test_config():
    """Provide test configuration."""
    config = TestConfig.get_config()
    logger.info(f"Test configuration: {config}")
    return config

@pytest.fixture(scope="session")
def api_base_url(test_config):
    """Base URL for API endpoints."""
    return test_config['api_base_url']

@pytest.fixture(scope="session")
def elasticsearch_url(test_config):
    """Elasticsearch service URL."""
    return test_config['es_host']

# Enhanced HTTP client
@pytest.fixture(scope="function")
def api_client(api_base_url, test_config):
    """
    Enhanced HTTP client for API testing.
    
    Provides convenience methods and proper timeout handling.
    """
    session = requests.Session()
    session.timeout = test_config['timeout']
    
    # Add convenience methods
    def get_endpoint(endpoint, **kwargs):
        url = f"{api_base_url}{endpoint}"
        logger.debug(f"GET {url}")
        return session.get(url, **kwargs)
    
    def post_endpoint(endpoint, **kwargs):
        url = f"{api_base_url}{endpoint}"
        logger.debug(f"POST {url}")
        return session.post(url, **kwargs)
    
    def put_endpoint(endpoint, **kwargs):
        url = f"{api_base_url}{endpoint}"
        logger.debug(f"PUT {url}")
        return session.put(url, **kwargs)
    
    def delete_endpoint(endpoint, **kwargs):
        url = f"{api_base_url}{endpoint}"
        logger.debug(f"DELETE {url}")
        return session.delete(url, **kwargs)
    
    # Attach methods to session
    session.get_endpoint = get_endpoint
    session.post_endpoint = post_endpoint
    session.put_endpoint = put_endpoint
    session.delete_endpoint = delete_endpoint
    session.base_url = api_base_url
    
    yield session
    session.close()

# Service health verification
@pytest.fixture(scope="function")
def verify_services_healthy(api_client, elasticsearch_url):
    """
    Verify all services are healthy before running tests.
    
    This runs before each test to ensure the environment is stable.
    """
    logger.info("🔍 Verifying service health...")
    
    # Check Elasticsearch
    try:
        es_response = requests.get(f"{elasticsearch_url}/_cluster/health", timeout=10)
        if es_response.status_code != 200:
            pytest.fail("Elasticsearch is not healthy")
        es_health = es_response.json()
        if es_health.get('status') not in ['yellow', 'green']:
            pytest.fail(f"Elasticsearch status is {es_health.get('status')}")
        logger.info("✅ Elasticsearch is healthy")
    except Exception as e:
        pytest.fail(f"Cannot connect to Elasticsearch: {e}")
    
    # Check Backend API
    try:
        api_response = api_client.get_endpoint("/health")
        if api_response.status_code != 200:
            pytest.fail("Backend API is not healthy")
        logger.info("✅ Backend API is healthy")
    except Exception as e:
        pytest.fail(f"Cannot connect to Backend API: {e}")
    
    # Verify test data exists
    try:
        stats_response = api_client.get_endpoint("/stats")
        if stats_response.status_code == 200:
            stats = stats_response.json()
            doc_count = stats.get('count', 0)
            if doc_count == 0:
                pytest.fail("No test documents found in index")
            logger.info(f"✅ Found {doc_count} test documents")
    except Exception as e:
        logger.warning(f"Could not verify test data: {e}")

# Test data fixtures
@pytest.fixture(scope="function")
def sample_search_response():
    """Sample search response structure for testing."""
    return {
        'results': [
            {
                'filename': 'API_Documentation.md',
                'content': 'Sample API documentation content...',
                'highlight': 'Sample API <span class="highlight">documentation</span> content...',
                'score': 1.5
            },
            {
                'filename': 'RemoteSetupGuide.md',
                'content': 'Remote setup guide content...',
                'highlight': 'Remote setup guide <span class="highlight">content</span>...',
                'score': 1.2
            }
        ]
    }

@pytest.fixture(scope="function")
def sample_document_response():
    """Sample document response structure for testing."""
    return {
        'filename': 'API_Documentation.md',
        'content': '# API Documentation\n\nThis is comprehensive API documentation.\n\n## Getting Started\n\nFollow these steps...',
        'metadata': {
            'timestamp': '2025-01-01T00:00:00Z',
            'size': 1024
        }
    }

# Mock fixtures for unit tests
@pytest.fixture(scope="function")
def mock_elasticsearch():
    """Mock Elasticsearch client for unit tests."""
    from unittest.mock import Mock
    
    mock_es = Mock()
    mock_es.ping.return_value = True
    mock_es.search.return_value = {
        'hits': {
            'total': {'value': 0},
            'hits': []
        }
    }
    mock_es.count.return_value = {'count': 0}
    
    return mock_es

# Test markers and auto-use fixtures
@pytest.fixture(autouse=True)
def setup_test_environment(verify_services_healthy):
    """
    Automatically ensure test environment is ready for each test.
    
    This fixture runs automatically before every test to verify
    that all services are healthy and ready.
    """
    logger.info(f"🧪 Setting up test environment (TEST_ENV: {TestConfig.TEST_ENV})")
    # verify_services_healthy already ran, so we're good to go
    
    yield
    
    # Cleanup after test if needed
    logger.debug("🧹 Test cleanup completed")

# Performance testing fixtures
@pytest.fixture(scope="function")
def performance_thresholds():
    """Performance thresholds for API endpoints."""
    return {
        'health_check': 1.0,  # seconds
        'search_query': 2.0,  # seconds
        'document_retrieval': 1.5,  # seconds
        'stats_endpoint': 0.5  # seconds
    }

# Test isolation helpers
@pytest.fixture(scope="function")
def isolated_test_query():
    """Generate unique test query to avoid cache hits."""
    import uuid
    return f"test_query_{uuid.uuid4().hex[:8]}"

# Configuration validation
def pytest_configure(config):
    """Pytest configuration hook."""
    logger.info(f"🔧 Configuring tests for environment: {TestConfig.TEST_ENV}")
    logger.info(f"🔧 API Base URL: {TestConfig.API_BASE_URL}")
    logger.info(f"🔧 Elasticsearch URL: {TestConfig.ES_HOST}")

def pytest_sessionstart(session):
    """Called after the Session object has been created."""
    logger.info("🚀 Starting test session...")
    
def pytest_sessionfinish(session, exitstatus):
    """Called after whole test run finished."""
    if exitstatus == 0:
        logger.info("✅ All tests completed successfully!")
    else:
        logger.error(f"❌ Tests failed with exit status: {exitstatus}")

# Custom markers
pytest_markers = [
    "unit: marks tests as unit tests (no external dependencies)",
    "integration: marks tests as integration tests (requires services)",
    "slow: marks tests as slow running",
    "api: marks tests as API endpoint tests",
    "search: marks tests as search functionality tests",
    "performance: marks tests as performance tests"
]