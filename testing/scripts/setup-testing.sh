#!/bin/bash
# Setup script for team members to get testing environment ready

set -e

echo "🔧 Setting up FAE Knowledge Base Testing Environment"
echo "=================================================="

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "📁 Project root: $PROJECT_ROOT"

# Check if test_env exists
if [ -d "test_env" ]; then
    echo "✅ test_env directory already exists"
    
    # Check if it's activated
    if [ -f "test_env/bin/activate" ]; then
        echo "✅ Virtual environment found"
        
        # Activate and check for pytest
        source test_env/bin/activate
        if python -c "import pytest" 2>/dev/null; then
            echo "✅ pytest is already installed"
            echo "🎯 Testing environment is ready!"
            echo ""
            echo "To run tests:"
            echo "  ./scripts/quick-test.sh"
            echo "  ./scripts/test-new.sh"
            exit 0
        else
            echo "⚠️  pytest not found in test_env, installing..."
            pip install -r requirements-dev.txt
        fi
    else
        echo "❌ test_env exists but no virtual environment found"
        echo "🔄 Recreating test_env..."
        rm -rf test_env
    fi
fi

# Create new test environment
if [ ! -d "test_env" ]; then
    echo "🆕 Creating new test environment..."
    
    # Try different python commands
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        echo "❌ No python found. Please install Python 3.11+"
        exit 1
    fi
    
    echo "🐍 Using: $PYTHON_CMD"
    
    # Create virtual environment
    $PYTHON_CMD -m venv test_env
    
    # Activate and install dependencies
    source test_env/bin/activate
    
    echo "📦 Installing test dependencies..."
    pip install --upgrade pip
    
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    
    if [ -f "requirements-dev.txt" ]; then
        pip install -r requirements-dev.txt
    else
        echo "⚠️  requirements-dev.txt not found, installing basic testing packages..."
        pip install pytest pytest-mock requests
    fi
fi

# Verify installation
echo "🔍 Verifying installation..."
source test_env/bin/activate

if python -c "import pytest; print('✅ pytest version:', pytest.__version__)" 2>/dev/null; then
    echo "✅ Testing environment setup complete!"
else
    echo "❌ Failed to install pytest"
    exit 1
fi

echo ""
echo "🎯 Ready to test! Try these commands:"
echo "  ./scripts/quick-test.sh      # Quick API test"
echo "  ./scripts/test-new.sh        # Full test suite"
echo "  ./scripts/test-new.sh --help # See all options"
echo ""
echo "💡 The test environment is in: test_env/"
echo "💡 Activate it with: source test_env/bin/activate"