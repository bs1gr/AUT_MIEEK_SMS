#!/bin/bash
# Test script to verify E2E test fixes

set -euo pipefail

echo "=========================================="
echo "E2E TEST FIXES VERIFICATION"
echo "=========================================="
echo ""

# Set up environment
export DATABASE_URL="sqlite:///./data/test_e2e.db"
export PYTHONPATH="${PYTHONPATH:-.}"

# Clean up any old test database
if [ -f "data/test_e2e.db" ]; then
    echo "Removing old test database..."
    rm -f data/test_e2e.db
fi

mkdir -p data

echo ""
echo "1. Running diagnostics..."
python backend/diagnose_e2e_setup.py || echo "Diagnostics encountered issues"

echo ""
echo "2. Seeding test data..."
python backend/seed_e2e_data.py || {
    echo "Initial seed failed, retrying with force..."
    python -c "import sys; sys.path.insert(0, '.'); from backend.seed_e2e_data import seed_e2e_data; seed_e2e_data(force=True)"
}

echo ""
echo "3. Validating seed data..."
python backend/validate_e2e_data.py

echo ""
echo "4. Checking login health..."
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
sleep 3

python backend/check_login_health.py || {
    echo "Login health check failed"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
}

echo ""
echo "5. Killing backend..."
kill $BACKEND_PID 2>/dev/null || true
sleep 1

echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED"
echo "=========================================="
