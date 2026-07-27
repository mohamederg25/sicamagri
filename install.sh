#!/bin/bash

# ── SICAM AGRI — Install Script ──
# Usage : sudo ./install.sh
# Exécutez avec sudo pour installer Node.js + MongoDB

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}   SICAM AGRI — Installation serveur   ${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

# ── Vérifier qu'on est bien root/sudo ──
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Erreur : veuillez exécuter avec sudo${NC}"
    echo -e "${YELLOW}Utilisez : sudo ./install.sh${NC}"
    exit 1
fi

# ── Détection du système ──
if [ ! -f /etc/os-release ]; then
    echo -e "${RED}Erreur : système d'exploitation non supporté${NC}"
    exit 1
fi
. /etc/os-release
echo -e "${GREEN}Système détecté : $NAME $VERSION${NC}"
echo ""

# ── 1. Mise à jour des paquets ──
echo -e "${YELLOW}[1/4] Mise à jour des paquets...${NC}"
apt-get update -y
echo -e "${GREEN}✓ Paquets mis à jour${NC}"
echo ""

# ── 2. Installation de Node.js 18 ──
echo -e "${YELLOW}[2/4] Installation de Node.js 18...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js déjà installé : $(node --version)${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js $(node --version) installé${NC}"
fi
echo ""

# ── 3. Installation de MongoDB 7.0 ──
echo -e "${YELLOW}[3/4] Installation de MongoDB 7.0...${NC}"
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB déjà installé : $(mongod --version 2>&1 | head -1)${NC}"
else
    # Importer la clé GPG
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor 2>/dev/null || true
    
    # Ajouter le dépôt selon la version d'Ubuntu
    UBUNTU_VERSION=$(lsb_release -cs 2>/dev/null || echo "jammy")
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu ${UBUNTU_VERSION}/mongodb-org/7.0 multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    apt-get update -y
    apt-get install -y mongodb-org
    
    # Démarrer MongoDB
    systemctl start mongod
    systemctl enable mongod
    
    echo -e "${GREEN}✓ MongoDB 7.0 installé et démarré${NC}"
fi
echo ""

# ── 4. Vérification finale ──
echo -e "${YELLOW}[4/4] Vérification...${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}   État des services                  ${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "Node.js  : $(node --version)"
echo -e "npm      : $(npm --version)"
systemctl is-active --quiet mongod && echo -e "MongoDB  : ${GREEN}✓ actif${NC}" || echo -e "MongoDB  : ${RED}✗ inactif${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   Installation terminée avec succès ! ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "Prochaine étape :"
echo -e "   cd /var/www"
echo -e "   git clone https://github.com/mohamederg25/sicamagri.git"
echo -e "   cd sicamagri"
echo -e "   ./start.sh"
echo ""
