#!/usr/bin/env python3
"""
Microservices Test Orchestrator

This script manages the complete test lifecycle for the microservices architecture:
1. Waits for all services to be ready
2. Verifies test environment setup
3. Runs the test suite
4. Handles cleanup and reporting
"""

import os
import sys
import time
import requests
import subprocess
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MicroservicesTestOrchestrator:
    """Orchestrates testing for microservices architecture."""
    
    def __init__(self):
        self.services = {
            'elasticsearch': 'http://elasticsearch:9200',
            'backend': 'http://backend:5000'
        }
        self.test_index = 'knowledge_base_test'
        self.max_wait_time = 180  # 3 minutes total wait time
        
    def wait_for_service(self, service_name: str, url: str, timeout: int = 60) -> bool:
        """Wait for a service to become healthy."""
        logger.info(f"⏳ Waiting for {service_name} at {url}")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                if service_name == 'elasticsearch':
                    response = requests.get(f"{url}/_cluster/health", timeout=5)
                    if response.status_code == 200:
                        health = response.json()
                        if health.get('status') in ['yellow', 'green']:
                            logger.info(f"✅ {service_name} is healthy")
                            return True
                elif service_name == 'backend':
                    response = requests.get(f"{url}/health", timeout=5)
                    if response.status_code == 200:
                        logger.info(f"✅ {service_name} is healthy")
                        return True
                        
            except Exception as e:
                logger.debug(f"Service {service_name} not ready: {e}")
                
            time.sleep(2)
            
        logger.error(f"❌ {service_name} failed to become healthy within {timeout}s")
        return False
    
    def verify_test_data(self) -> bool:
        """Verify that test documents have been indexed."""
        logger.info("🔍 Verifying test data is indexed")
        
        try:
            # Check document count
            response = requests.get(f"{self.services['backend']}/stats", timeout=10)
            if response.status_code == 200:
                stats = response.json()
                doc_count = stats.get('count', 0)
                logger.info(f"📊 Found {doc_count} documents in test index")
                
                if doc_count > 0:
                    # Test search functionality
                    search_response = requests.post(
                        f"{self.services['backend']}/search",
                        json={'query': 'test'},
                        timeout=10
                    )
                    if search_response.status_code == 200:
                        results = search_response.json().get('results', [])
                        logger.info(f"🔍 Search test returned {len(results)} results")
                        return True
                        
        except Exception as e:
            logger.error(f"❌ Test data verification failed: {e}")
            
        return False
    
    def wait_for_services(self) -> bool:
        """Wait for all required services to be ready."""
        logger.info("🚀 Starting service readiness checks...")
        
        # Wait for Elasticsearch first
        if not self.wait_for_service('elasticsearch', self.services['elasticsearch']):
            return False
            
        # Wait for backend (which depends on ingest completion)
        if not self.wait_for_service('backend', self.services['backend']):
            return False
            
        # Verify test data is available
        if not self.verify_test_data():
            logger.error("❌ Test data verification failed")
            return False
            
        logger.info("✅ All services are ready for testing")
        return True
    
    def run_tests(self) -> int:
        """Run the test suite."""
        logger.info("🧪 Starting test execution...")
        
        # Set environment variables for tests
        env = os.environ.copy()
        env.update({
            'TEST_ENV': 'docker',
            'API_BASE_URL': self.services['backend'],
            'ES_HOST': self.services['elasticsearch'],
            'INDEX_NAME': self.test_index
        })
        
        # Run pytest with appropriate options
        cmd = [
            'python', '-m', 'pytest',
            'tests/',
            '-v',
            '--tb=short',
            '--strict-markers',
            '--disable-warnings',
            '--color=yes'
        ]
        
        # Add coverage if requested
        if os.getenv('WITH_COVERAGE', 'false').lower() == 'true':
            cmd.extend([
                '--cov=app',
                '--cov-report=term-missing',
                '--cov-report=xml'
            ])
        
        logger.info(f"🔧 Running command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, env=env, capture_output=False)
            return result.returncode
        except Exception as e:
            logger.error(f"❌ Test execution failed: {e}")
            return 1
    
    def run(self) -> int:
        """Main orchestrator method."""
        logger.info("🎯 Starting Microservices Test Orchestrator")
        
        # Wait for services to be ready
        if not self.wait_for_services():
            logger.error("❌ Services not ready, aborting tests")
            return 1
        
        # Run the test suite
        exit_code = self.run_tests()
        
        if exit_code == 0:
            logger.info("✅ All tests passed!")
        else:
            logger.error(f"❌ Tests failed with exit code: {exit_code}")
            
        return exit_code

if __name__ == "__main__":
    orchestrator = MicroservicesTestOrchestrator()
    sys.exit(orchestrator.run())