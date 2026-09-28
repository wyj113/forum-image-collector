#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo 'Install Node.js 22+ first: https://nodejs.org/'; exit 1; }
command -v npm >/dev/null || { echo 'npm is required for development.'; exit 1; }
PYTHON_BIN="${PYTHON_BIN:-python3}"
command -v "$PYTHON_BIN" >/dev/null || { echo 'Install Python 3.11+ first: https://www.python.org/'; exit 1; }
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || { echo 'Node.js 22+ is required.'; exit 1; }
"$PYTHON_BIN" -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ is required"'
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run check
"$PYTHON_BIN" -m unittest discover -s tests -p 'test_*.py'
"$PYTHON_BIN" tools/package.py
echo 'Ready. In Chrome, load the extension/ directory via chrome://extensions.'
