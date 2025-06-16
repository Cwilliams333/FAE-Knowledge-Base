#!/bin/bash
# Enhanced testing script for microservices architecture

set -e

echo "🧪 FAE Knowledge Base - Microservices Testing"
echo "============================================="

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_COMPOSE_FILE="docker-compose.test.yml"
PROJECT_NAME="fae-kb-test"
WITH_COVERAGE=${WITH_COVERAGE:-false}
CLEANUP=${CLEANUP:-true}
VERBOSE=${VERBOSE:-false}

# Change to project root
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Cleanup function
cleanup() {
    if [ "$CLEANUP" = "true" ]; then
        log_info "Cleaning up test environment..."
        docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" down -v --remove-orphans 2>/dev/null || true
        log_success "Cleanup completed"
    else
        log_warning "Skipping cleanup (CLEANUP=false)"
    fi
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting microservices test environment..."
    
    # Clean up any existing test environment
    log_info "Stopping any existing test containers..."
    docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" down -v --remove-orphans 2>/dev/null || true
    
    # Set environment variables for test
    export COMPOSE_PROJECT_NAME="$PROJECT_NAME"
    export WITH_COVERAGE="$WITH_COVERAGE"
    
    # Build and start the test environment
    log_info "Building and starting test services..."
    if [ "$VERBOSE" = "true" ]; then
        docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" up --build --abort-on-container-exit --exit-code-from test-runner
    else
        docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" up --build --abort-on-container-exit --exit-code-from test-runner 2>&1 | \
            grep -E "(test-runner|ERROR|FAILED|✅|❌|🧪)" || true
    fi
    
    # Get the exit code from the test runner
    TEST_EXIT_CODE=$?
    
    # Show final status
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log_success "All tests passed! 🎉"
    else
        log_error "Tests failed with exit code: $TEST_EXIT_CODE"
        
        # Show recent logs on failure
        log_info "Recent test runner logs:"
        docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" logs --tail=20 test-runner || true
    fi
    
    # Copy test artifacts if available
    if [ "$WITH_COVERAGE" = "true" ]; then
        log_info "Copying test artifacts..."
        docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" cp test-runner:/app/coverage.xml ./coverage.xml 2>/dev/null || true
        docker.exe compose -f "$TEST_COMPOSE_FILE" -p "$PROJECT_NAME" cp test-runner:/app/htmlcov ./htmlcov 2>/dev/null || true
    fi
    
    return $TEST_EXIT_CODE
}

# Usage information
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    --help, -h          Show this help message
    --verbose, -v       Show verbose output from Docker
    --coverage, -c      Enable code coverage reporting
    --no-cleanup        Don't clean up containers after tests
    
Environment Variables:
    WITH_COVERAGE=true  Enable coverage reporting
    CLEANUP=false       Disable cleanup
    VERBOSE=true        Enable verbose output

Examples:
    $0                  # Run tests with default settings
    $0 --coverage       # Run tests with coverage reporting
    $0 --verbose        # Run with verbose Docker output
    $0 --no-cleanup     # Keep containers running after tests

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_usage
            exit 0
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --coverage|-c)
            WITH_COVERAGE=true
            shift
            ;;
        --no-cleanup)
            CLEANUP=false
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check prerequisites
if ! command -v docker.exe &> /dev/null; then
    log_error "docker.exe not found. Please ensure Docker Desktop is installed and running."
    exit 1
fi

if [ ! -f "$TEST_COMPOSE_FILE" ]; then
    log_error "Test compose file '$TEST_COMPOSE_FILE' not found."
    exit 1
fi

# Run main function
main