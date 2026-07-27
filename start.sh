#!/bin/bash

# ── SICAM AGRI — Démarrer le projet ──
# Usage : ./start.sh
#         ./start.sh --dev   (localhost pour développement)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Couleurs
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}   SICAM AGRI — Système de Pépinière   ${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

# ── Mode DÉVELOPPEMENT (localhost) ──
if [ "${1:-}" = "--dev" ]; then
    echo -e "${YELLOW}Mode Développement — localhost${NC}"

    [ ! -d "$BACKEND_DIR/node_modules" ] && cd "$BACKEND_DIR" && npm install
    [ ! -d "$FRONTEND_DIR/node_modules" ] && cd "$FRONTEND_DIR" && npm install

    echo -e "${GREEN}[1/2] Backend...${NC}"
    cd "$BACKEND_DIR" && npm run dev &
    sleep 3

    echo -e "${GREEN}[2/2] Frontend...${NC}"
    cd "$FRONTEND_DIR" && npm run dev &
    sleep 5

    echo ""
    echo -e "${CYAN}   Frontend : http://localhost:5173${NC}"
    echo -e "${CYAN}   Backend  : http://localhost:3000${NC}"
    echo ""
    command -v xdg-open &>/dev/null && xdg-open "http://localhost:5173" 2>/dev/null || true
    command -v open &>/dev/null && open "http://localhost:5173" 2>/dev/null || true

    echo -e "${GREEN}✓ Serveurs démarrés — Ctrl+C pour arrêter${NC}"
    wait

# ── Mode PRODUCTION (winicari.tn:3000) — PAR DÉFAUT ──
else
    echo -e "${YELLOW}Mode Production — http://winicari.tn:3000${NC}"
    echo ""

    if [ ! -f "$BACKEND_DIR/.env" ]; then
        echo -e "${RED}Erreur : backend/.env introuvable${NC}"
        echo -e "${YELLOW}Créez-le : cp backend/.env.example backend/.env${NC}"
        echo -e "${YELLOW}Puis : nano backend/.env${NC}"
        exit 1
    fi

    echo -e "${GREEN}[1/3] Installation...${NC}"
    [ ! -d "$BACKEND_DIR/node_modules" ] && cd "$BACKEND_DIR" && npm install --production
    [ ! -d "$FRONTEND_DIR/node_modules" ] && cd "$FRONTEND_DIR" && npm install

    echo -e "${GREEN}[2/4] Seed de la base de données...${NC}"
    cd "$BACKEND_DIR"
    node -e "
      const mongoose = require('mongoose');
      require('dotenv').config();
      mongoose.connect(process.env.MONGO_URI).then(async () => {
        const User = require('./models/User');
        const admin = await User.findOne({ email: 'admin@test.com' });
        process.exit(admin ? 0 : 42);
      });
    "
    SEED_EXIT_CODE=$?
    if [ $SEED_EXIT_CODE -eq 42 ]; then
        echo -e "${YELLOW}Création des données initiales...${NC}"
        cd "$BACKEND_DIR" && node scripts/seed.js
        echo -e "${GREEN}✓ Base de données initialisée${NC}"
    fi
    echo ""

    echo -e "${GREEN}[3/4] Build du frontend...${NC}"
    cd "$FRONTEND_DIR" && npm run build
    echo -e "${GREEN}✓ Frontend build OK${NC}"
    echo ""

    echo -e "${GREEN}[4/4] Démarrage du backend (port 3000)...${NC}"
    cd "$BACKEND_DIR"
    npm start &
    BACKEND_PID=$!
    sleep 2
    echo -e "${GREEN}✓ Backend démarré (PID: $BACKEND_PID)${NC}"
    echo ""

    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}   Site : http://winicari.tn:3000      ${NC}"
    echo -e "${CYAN}   API  : http://winicari.tn:3000/api  ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Arrêter  : kill $BACKEND_PID${NC}"
    echo -e "${YELLOW}Logs     : les logs sont dans le terminal${NC}"
    echo ""

    command -v xdg-open &>/dev/null && xdg-open "http://winicari.tn:3000" 2>/dev/null || true
    command -v open &>/dev/null && open "http://winicari.tn:3000" 2>/dev/null || true

    # Garder le script en vie
    wait $BACKEND_PID

    command -v xdg-open &>/dev/null && xdg-open "http://winicari.tn:3000" 2>/dev/null || true
    command -v open &>/dev/null && open "http://winicari.tn:3000" 2>/dev/null || true
fi
