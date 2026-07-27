#!/bin/bash

# ── SICAM AGRI — Install Script ──
# Usage : sudo ./install.sh
# Installe Node.js 18+ et MongoDB sur Ubuntu

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

# ── Vérifier sudo ──
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
echo -e "${GREEN}Système : $NAME $VERSION${NC}"
echo ""

# ── 1. Prérequis ──
echo -e "${YELLOW}[1/5] Installation des prérequis (curl, gnupg)...${NC}"
apt-get update -y
apt-get install -y curl gnupg
echo -e "${GREEN}✓ Prérequis installés${NC}"
echo ""

# ── 2. Node.js 18+ ──
echo -e "${YELLOW}[2/5] Installation de Node.js 18...${NC}"
NODE_MAJOR=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1 || echo "0")
if [ "$NODE_MAJOR" -ge 18 ]; then
    echo -e "${GREEN}✓ Node.js $(node --version) déjà installé${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js $(node --version) installé${NC}"
fi
echo ""

# ── 3. MongoDB ──
echo -e "${YELLOW}[3/5] Installation de MongoDB...${NC}"
if command -v mongod &> /dev/null && systemctl is-active --quiet mongod; then
    echo -e "${GREEN}✓ MongoDB $(mongod --version 2>&1 | head -1) déjà installé et actif${NC}"
else
    # Déterminer la version MongoDB selon Ubuntu
    UBUNTU_CODENAME="${VERSION_CODENAME:-jammy}"
    MONGO_VERSION="7.0"
    # Ubuntu 24.04+ nécessite MongoDB 8.0
    if [ "$UBUNTU_CODENAME" = "noble" ] || [ "$UBUNTU_CODENAME" = "oracular" ]; then
        MONGO_VERSION="8.0"
    fi

    # Clé GPG
    curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg

    # Dépôt APT
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] http://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/${MONGO_VERSION} multiverse" | \
        tee /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list

    apt-get update -y
    apt-get install -y mongodb-org

    systemctl start mongod
    systemctl enable mongod
    echo -e "${GREEN}✓ MongoDB ${MONGO_VERSION} installé et démarré${NC}"
fi
echo ""

# ── 4. Vérification ──
echo -e "${YELLOW}[4/4] Vérification finale...${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}   État des services                  ${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "Node.js  : $(node --version)"
echo -e "npm      : $(npm --version)"

systemctl is-active --quiet mongod && echo -e "MongoDB  : ${GREEN}✓ actif${NC}" || echo -e "MongoDB  : ${RED}✗ inactif${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   Installation terminée !             ${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "Prochaine étape :"
echo -e "   cd /var/www"
echo -e "   git clone https://github.com/mohamederg25/sicamagri.git"
echo -e "   cd sicamagri"
echo -e "   ./start.sh"
echo ""
