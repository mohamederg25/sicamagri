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

    # Installer les dépendances
    [ ! -d "$BACKEND_DIR/node_modules" ] && cd "$BACKEND_DIR" && npm install
    [ ! -d "$FRONTEND_DIR/node_modules" ] && cd "$FRONTEND_DIR" && npm install

    # Backend
    echo -e "${GREEN}[1/2] Backend...${NC}"
    cd "$BACKEND_DIR" && npm run dev &
    sleep 3

    # Frontend
    echo -e "${GREEN}[2/2] Frontend...${NC}"
    cd "$FRONTEND_DIR" && npm run dev &
    sleep 5

    echo ""
    echo -e "${CYAN}   Frontend : http://localhost:5173${NC}"
    echo -e "${CYAN}   Backend  : http://localhost:5000${NC}"
    echo ""
    command -v xdg-open &>/dev/null && xdg-open "http://localhost:5173" 2>/dev/null || true
    command -v open &>/dev/null && open "http://localhost:5173" 2>/dev/null || true

    echo -e "${GREEN}✓ Serveurs démarrés — Ctrl+C pour arrêter${NC}"
    wait

# ── Mode PRODUCTION (winicari.tn/sicam) — PAR DÉFAUT ──
else
    echo -e "${YELLOW}Mode Production — winicari.tn/sicam${NC}"
    echo ""

    # Vérifier .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        echo -e "${RED}Erreur : backend/.env introuvable${NC}"
        echo -e "${YELLOW}Créez-le : cp backend/.env.example backend/.env${NC}"
        echo -e "${YELLOW}Puis : nano backend/.env${NC}"
        exit 1
    fi

    # Installer dépendances + PM2
    echo -e "${GREEN}[1/3] Installation...${NC}"
    [ ! -d "$BACKEND_DIR/node_modules" ] && cd "$BACKEND_DIR" && npm install --production
    [ ! -d "$FRONTEND_DIR/node_modules" ] && cd "$FRONTEND_DIR" && npm install
    command -v pm2 &>/dev/null || npm install -g pm2

    # Build frontend
    echo -e "${GREEN}[2/3] Build du frontend...${NC}"
    cd "$FRONTEND_DIR" && npm run build
    echo -e "${GREEN}✓ Frontend build OK — dossier frontend/dist/${NC}"
    echo ""

    # Démarrer backend avec PM2
    echo -e "${GREEN}[3/3] Démarrage du backend...${NC}"
    cd "$BACKEND_DIR"
    if pm2 list 2>/dev/null | grep -q "sicamagri-api"; then
        pm2 restart sicamagri-api --env production
    else
        pm2 start server.js --name sicamagri-api --env production
        pm2 save && pm2 startup
    fi
    echo -e "${GREEN}✓ Backend lancé avec PM2${NC}"
    echo ""

    # Résumé
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}   Site : http://winicari.tn/sicam     ${NC}"
    echo -e "${CYAN}   API  : http://winicari.tn/sicam/api ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Commande admin : pm2 stop sicamagri-api${NC}"
    echo -e "${YELLOW}Logs          : pm2 logs sicamagri-api${NC}"
    echo ""

    # Ouvrir le navigateur si possible
    command -v xdg-open &>/dev/null && xdg-open "http://winicari.tn/sicam" 2>/dev/null || true
    command -v open &>/dev/null && open "http://winicari.tn/sicam" 2>/dev/null || true
fi
