#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Kova ERP Setup ==="
echo ""

echo "[1/6] Installing root dependencies..."
cd "$ROOT_DIR"
npm install

echo ""
echo "[2/6] Installing kova-contracts dependencies..."
cd "$ROOT_DIR/kova-contracts"
npm install

echo ""
echo "[3/6] Installing kova-auth dependencies..."
cd "$ROOT_DIR/kova-auth"
npm install

echo ""
echo "[4/6] Installing kova-sync dependencies..."
cd "$ROOT_DIR/kova-sync"
npm install

echo ""
echo "[5/6] Installing kova-sale dependencies..."
cd "$ROOT_DIR/kova-sale"
npm install

echo ""
echo "[6/6] Installing kova-inventory and kova-accounting dependencies..."
cd "$ROOT_DIR/kova-inventory"
npm install
cd "$ROOT_DIR/kova-accounting"
npm install

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Start the dev stack:   npm run infra:up"
echo "  2. Bootstrap NATS:        bash kova-infra/nats/init-jetstream.sh"
echo "  3. Run migrations against each service database"
echo "  4. Build all services:    npm run build:all"
echo "  5. Typecheck all:         npm run typecheck:all"
