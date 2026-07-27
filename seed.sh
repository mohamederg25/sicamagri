#!/bin/bash

# ── SICAM AGRI — Seed la base de données ──
# Usage : ./seed.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

cd "$BACKEND_DIR"

# Vérifier que le .env existe
if [ ! -f ".env" ]; then
    echo "❌ backend/.env introuvable"
    echo "   Créez-le : cp .env.example .env"
    echo "   Puis éditez : nano .env"
    exit 1
fi

# Vérifier node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install --production
fi

echo "🌱 Seed de la base de données..."
node scripts/seed.js
