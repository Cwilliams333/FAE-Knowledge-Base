"""
Comprehensive test suite for FAE Knowledge Base API.

This module tests all API endpoints using modern pytest patterns,
focusing on both success and error cases with proper isolation.

Note: Tests use documents from test_documents/ directory which are
indexed by the separate ingest microservice before tests run.
"""

import pytest
import requests
from unittest.mock import patch


class TestHealthEndpoint:
    """Tests for the /health endpoint."""
    
    def test_health_check(self, api_client):
        """
        GIVEN a running API
        WHEN the /health endpoint is requested
        THEN it should return 200 and status information
        """
        response = api_client.get_endpoint("/health")
        
        assert response.status_code == 200
        json_data = response.json()
        assert "status" in json_data
        assert json_data["status"] in ["healthy", "unhealthy"]
    
    def test_health_check_structure(self, api_client):
        """
        GIVEN a running API
        WHEN the /health endpoint is requested
        THEN the response should have the expected structure
        """
        response = api_client.get_endpoint("/health")
        
        json_data = response.json()
        assert isinstance(json_data, dict)
        assert "status" in json_data
        
        # When healthy, should include elasticsearch status
        if json_data["status"] == "healthy":
            assert "elasticsearch" in json_data
            assert json_data["elasticsearch"] == "connected"


class TestStatsEndpoint:
    """Tests for the /stats endpoint."""
    
    def test_stats_endpoint(self, api_client):
        """
        GIVEN a running API
        WHEN the /stats endpoint is requested
        THEN it should return 200 and document count
        """
        response = api_client.get_endpoint("/stats")
        
        assert response.status_code == 200
        json_data = response.json()
        assert "count" in json_data
        assert isinstance(json_data["count"], int)
        assert json_data["count"] >= 0
    
    def test_stats_endpoint_structure(self, api_client):
        """
        GIVEN a running API
        WHEN the /stats endpoint is requested
        THEN the response should have the expected JSON structure
        """
        response = api_client.get_endpoint("/stats")
        
        json_data = response.json()
        assert isinstance(json_data, dict)
        assert len(json_data) >= 1  # Should have at least 'count'


class TestSearchEndpoint:
    """Tests for the /search endpoint."""
    
    def test_search_endpoint_success(self, api_client):
        """
        GIVEN a running API
        WHEN the /search endpoint is called with a valid query
        THEN it should return 200 with search results structure
        """
        payload = {"query": "API"}
        response = api_client.post_endpoint("/search", json=payload)
        
        assert response.status_code == 200
        json_data = response.json()
        assert "total" in json_data
        assert "results" in json_data
        assert isinstance(json_data["total"], int)
        assert isinstance(json_data["results"], list)
    
    def test_search_endpoint_empty_query(self, api_client):
        """
        GIVEN a running API
        WHEN the /search endpoint is called with an empty query
        THEN it should return 200 with all available documents
        """
        payload = {"query": ""}
        response = api_client.post_endpoint("/search", json=payload)
        
        assert response.status_code == 200
        json_data = response.json()
        assert json_data["total"] >= 0  # Should return count of all documents
        assert isinstance(json_data["results"], list)
    
    @pytest.mark.parametrize(
        "query_payload,expected_status",
        [
            ({"query": "test"}, 200),
            ({"query": "nonexistent-unique-term-12345"}, 200),  # Valid but no results
            ({}, 200),  # Missing query key should default to empty
        ]
    )
    def test_search_various_queries(self, api_client, query_payload, expected_status):
        """
        GIVEN a running API
        WHEN the /search endpoint is called with various query formats
        THEN it should handle them appropriately
        """
        response = api_client.post_endpoint("/search", json=query_payload)
        
        assert response.status_code == expected_status
        if expected_status == 200:
            json_data = response.json()
            assert "total" in json_data
            assert "results" in json_data
    
    def test_search_result_structure(self, api_client):
        """
        GIVEN a running API with indexed documents
        WHEN the /search endpoint returns results
        THEN each result should have the expected structure
        """
        payload = {"query": "documentation"}  # Likely to find results
        response = api_client.post_endpoint("/search", json=payload)
        
        assert response.status_code == 200
        json_data = response.json()
        
        # If we have results, check their structure
        if json_data["total"] > 0:
            for result in json_data["results"]:
                assert "filename" in result
                assert "content" in result
                assert "score" in result
                assert isinstance(result["filename"], str)
                assert isinstance(result["content"], str)
                assert isinstance(result["score"], (int, float))
    
    def test_search_malformed_json(self, api_client):
        """
        GIVEN a running API
        WHEN the /search endpoint is called with malformed JSON
        THEN it should return an appropriate error status
        """
        response = api_client.post_endpoint(
            "/search", 
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 or 500 for malformed JSON
        assert response.status_code in [400, 500]


class TestDocumentEndpoint:
    """Tests for the /api/document/<path> endpoint."""
    
    def test_get_document_success(self, api_client):
        """
        GIVEN a running API with indexed documents
        WHEN a document is requested by filename
        THEN it should return 200 with document content
        """
        # Use a known document from the documents folder
        document_name = "API_Documentation.md"
        response = api_client.get_endpoint(f"/api/document/{document_name}")
        
        assert response.status_code == 200
        json_data = response.json()
        assert "filename" in json_data
        assert "content" in json_data
        assert "metadata" in json_data
        assert json_data["filename"] == document_name
        assert isinstance(json_data["content"], str)
        assert len(json_data["content"]) > 0
    
    def test_get_document_not_found(self, api_client):
        """
        GIVEN a running API
        WHEN a non-existent document is requested
        THEN it should return 404
        """
        response = api_client.get_endpoint("/api/document/a-file-that-does-not-exist.md")
        
        assert response.status_code == 404
        json_data = response.json()
        assert "error" in json_data
    
    def test_get_document_metadata_structure(self, api_client):
        """
        GIVEN a running API with indexed documents
        WHEN a document is successfully retrieved
        THEN the metadata should have the expected structure
        """
        document_name = "API_Documentation.md"
        response = api_client.get_endpoint(f"/api/document/{document_name}")
        
        if response.status_code == 200:
            json_data = response.json()
            metadata = json_data["metadata"]
            
            assert isinstance(metadata, dict)
            assert "title" in metadata
            assert "size" in metadata
            assert isinstance(metadata["size"], int)
            assert metadata["size"] > 0
    
    @pytest.mark.parametrize(
        "document_name,expected_status",
        [
            ("API_Documentation.md", 200),  # Known to exist
            ("RemoteSetupGuide.md", 200),   # Another known document
            ("nonexistent.md", 404),        # Should not exist
            ("", 404),                      # Empty filename
            ("../../../etc/passwd", 404),   # Path traversal attempt
        ]
    )
    def test_get_document_various_names(self, api_client, document_name, expected_status):
        """
        GIVEN a running API
        WHEN various document names are requested
        THEN appropriate status codes should be returned
        """
        response = api_client.get_endpoint(f"/api/document/{document_name}")
        assert response.status_code == expected_status


class TestAPIRootEndpoint:
    """Tests for the root API endpoint."""
    
    def test_api_info(self, api_client):
        """
        GIVEN a running API
        WHEN the root endpoint is requested
        THEN it should return API information
        """
        response = api_client.get_endpoint("/")
        
        assert response.status_code == 200
        json_data = response.json()
        assert "name" in json_data
        assert "version" in json_data
        assert "endpoints" in json_data
        assert isinstance(json_data["endpoints"], dict)


class TestAPIErrorHandling:
    """Tests for API error handling and edge cases."""
    
    def test_invalid_endpoint(self, api_client):
        """
        GIVEN a running API
        WHEN an invalid endpoint is requested
        THEN it should return 404
        """
        response = api_client.get_endpoint("/invalid/endpoint")
        assert response.status_code == 404
    
    def test_method_not_allowed(self, api_client):
        """
        GIVEN a running API
        WHEN a POST-only endpoint is accessed with GET
        THEN it should return 405 Method Not Allowed
        """
        # The /search endpoint only accepts POST
        response = api_client.get_endpoint("/search")
        assert response.status_code == 405
    
    def test_search_without_content_type(self, api_client):
        """
        GIVEN a running API
        WHEN the /search endpoint is called without JSON content type
        THEN it should handle the request appropriately
        """
        response = requests.post(
            f"{api_client.base_url}/search",
            data='{"query": "test"}',
            timeout=api_client.timeout
        )
        
        # Should either accept it or return a clear error
        assert response.status_code in [200, 400, 415]


# Integration test markers
@pytest.mark.integration
class TestAPIIntegration:
    """Integration tests that require the full stack to be running."""
    
    def test_full_search_workflow(self, api_client):
        """
        GIVEN a running API with indexed documents
        WHEN performing a complete search workflow
        THEN all steps should work together
        """
        # 1. Check system health
        health_response = api_client.get_endpoint("/health")
        assert health_response.status_code == 200
        
        # 2. Get document count
        stats_response = api_client.get_endpoint("/stats")
        assert stats_response.status_code == 200
        document_count = stats_response.json()["count"]
        
        # 3. Search for documents
        search_response = api_client.post_endpoint("/search", json={"query": "API"})
        assert search_response.status_code == 200
        
        # 4. If we have results, try to retrieve the first document
        search_data = search_response.json()
        if search_data["total"] > 0:
            first_result = search_data["results"][0]
            doc_response = api_client.get_endpoint(f"/api/document/{first_result['filename']}")
            assert doc_response.status_code == 200
    
    def test_api_consistency(self, api_client):
        """
        GIVEN a running API
        WHEN checking document count consistency
        THEN search results should align with stats
        """
        # Get total document count
        stats_response = api_client.get_endpoint("/stats")
        total_docs = stats_response.json()["count"]
        
        # Search with empty query should return all documents
        if total_docs > 0:
            search_response = api_client.post_endpoint("/search", json={"query": ""})
            search_total = search_response.json()["total"]
            
            # The totals should match (empty query returns all)
            assert search_total == total_docs