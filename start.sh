#!/bin/bash

# ── SICAM AGRI — Start Script (Linux/macOS) ──
# Usage : chmod +x start.sh && ./start.sh
#         ./start.sh --dev    (mode développement)
#         ./start.sh --prod   (mode production)

set -e

MODE="${1:---dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Couleurs
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cleanup() {
    echo ""
    echo -e "${YELLOW}Arrêt des serveurs...${NC}"
    if [ -n "$BACKEND_PID" ]; then kill "$BACKEND_PID" 2>/dev/null; fi
    if [ -n "$FRONTEND_PID" ]; then kill "$FRONTEND_PID" 2>/dev/null; fi
    echo -e "${GREEN}Serveurs arrêtés.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}   SICAM AGRI — Système de Pépinière   ${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances backend...${NC}"
    cd "$BACKEND_DIR" && npm install
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
    cd "$FRONTEND_DIR" && npm install
fi

if [ "$MODE" = "--prod" ]; then
    # ── Mode Production ──
    echo -e "${GREEN}[1/2] Démarrage du backend (production)...${NC}"
    cd "$BACKEND_DIR"
    npm start &
    BACKEND_PID=$!

    echo -e "${GREEN}[2/2] Build du frontend...${NC}"
    cd "$FRONTEND_DIR"
    npm run build
    echo -e "${YELLOW}Frontend build terminé. Servir le dossier frontend/dist/ avec Apache ou Nginx.${NC}"

    echo ""
    echo -e "${GREEN}Backend démarré sur http://localhost:5000 ${NC}"
    echo -e "${GREEN}Frontend build dans frontend/dist/ ${NC}"
    echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter${NC}"

else
    # ── Mode Développement ──
    echo -e "${GREEN}[1/2] Démarrage du backend (développement)...${NC}"
    cd "$BACKEND_DIR"
    npm run dev &
    BACKEND_PID=$!

    sleep 3

    echo -e "${GREEN}[2/2] Démarrage du frontend (développement)...${NC}"
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!

    sleep 5

    echo ""
    echo -e "${GREEN}Backend :  http://localhost:5000${NC}"
    echo -e "${GREEN}Frontend : http://localhost:5173${NC}"
    echo ""

    # Ouvrir le navigateur si disponible
    if command -v xdg-open &> /dev/null; then
        echo -e "${CYAN}Ouverture du navigateur...${NC}"
        xdg-open "http://localhost:5173" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        echo -e "${CYAN}Ouverture du navigateur...${NC}"
        open "http://localhost:5173" 2>/dev/null || true
    fi

    echo -e "${GREEN}Serveurs démarrés !${NC}"
    echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter les deux serveurs${NC}"
fi

# Attendre que les processus se terminent
wait
