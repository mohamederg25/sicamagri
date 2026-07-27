#!/bin/bash

# ── SICAM AGRI — Start Script (Linux/macOS) ──
# Usage :
#   ./start.sh              → Mode développement (localhost)
#   ./start.sh --dev        → Mode développement (localhost)
#   ./start.sh --prod       → Mode production (www.winicari.tn/sicam)

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
NC='\033[0m'

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

# ──────────────────────────────────────────────
#  Mode PRODUCTION (serveur Apache www.winicari.tn)
# ──────────────────────────────────────────────
if [ "$MODE" = "--prod" ]; then
    echo -e "${YELLOW}Mode Production — www.winicari.tn/sicam${NC}"
    echo ""

    # Vérifier que le .env existe
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        echo -e "${RED}Erreur : backend/.env introuvable !${NC}"
        echo -e "${YELLOW}Créez-le avec : cp backend/.env.example backend/.env${NC}"
        echo -e "${YELLOW}Puis éditez-le avec : nano backend/.env${NC}"
        exit 1
    fi

    # Installer les dépendances si nécessaire
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}Installation des dépendances backend...${NC}"
        cd "$BACKEND_DIR" && npm install --production
    fi
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
        cd "$FRONTEND_DIR" && npm install
    fi

    # Builder le frontend (base=/sicam/ intégré dans Vite config)
    echo -e "${GREEN}[1/3] Build du frontend...${NC}"
    cd "$FRONTEND_DIR"
    npm run build
    echo -e "${GREEN}✓ Frontend build terminé dans frontend/dist/${NC}"
    echo ""

    # Démarrer le backend
    echo -e "${GREEN}[2/3] Démarrage du backend...${NC}"
    cd "$BACKEND_DIR"

    # Vérifier si déjà lancé avec PM2
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "sicamagri-api"; then
            echo -e "${YELLOW}Redémarrage du backend via PM2...${NC}"
            pm2 restart sicamagri-api
        else
            echo -e "${YELLOW}Lancement du backend via PM2...${NC}"
            pm2 start server.js --name sicamagri-api --env production
            pm2 save
        fi
        echo -e "${GREEN}✓ Backend lancé avec PM2 (s'arrête jamais)${NC}"
    else
        # Fallback: npm start en arrière-plan
        echo -e "${YELLOW}PM2 non installé. Lancement avec npm start...${NC}"
        npm start &
        BACKEND_PID=$!
        echo -e "${GREEN}✓ Backend démarré (PID: $BACKEND_PID)${NC}"
    fi
    echo ""

    # Résumé
    echo -e "${GREEN}[3/3] Tout est prêt !${NC}"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}   Site : http://www.winicari.tn/sicam  ${NC}"
    echo -e "${CYAN}   API  : http://www.winicari.tn/sicam/api ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    # Ouvrir le navigateur (si interface graphique disponible)
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://www.winicari.tn/sicam" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        open "http://www.winicari.tn/sicam" 2>/dev/null || true
    fi

    echo -e "${YELLOW}Pour arrêter le backend : pm2 stop sicamagri-api${NC}"
    echo -e "${YELLOW}Pour voir les logs : pm2 logs sicamagri-api${NC}"
    echo ""

# ──────────────────────────────────────────────
#  Mode DÉVELOPPEMENT (localhost)
# ──────────────────────────────────────────────
else
    echo -e "${YELLOW}Mode Développement — localhost${NC}"
    echo ""

    # Installer les dépendances si nécessaire
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}Installation des dépendances backend...${NC}"
        cd "$BACKEND_DIR" && npm install
    fi
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}Installation des dépendances frontend...${NC}"
        cd "$FRONTEND_DIR" && npm install
    fi

    # Backend
    echo -e "${GREEN}[1/2] Démarrage du backend (développement)...${NC}"
    cd "$BACKEND_DIR"
    npm run dev &
    BACKEND_PID=$!
    sleep 3

    # Frontend
    echo -e "${GREEN}[2/2] Démarrage du frontend (développement)...${NC}"
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    sleep 5

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}   Frontend : http://localhost:5173     ${NC}"
    echo -e "${CYAN}   Backend  : http://localhost:5000     ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""

    # Ouvrir le navigateur
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173" 2>/dev/null || true
    elif command -v open &> /dev/null; then
        open "http://localhost:5173" 2>/dev/null || true
    fi

    echo -e "${GREEN}Serveurs démarrés !${NC}"
    echo -e "${YELLOW}Appuyez sur Ctrl+C pour tout arrêter${NC}"
    echo ""

    wait
fi
