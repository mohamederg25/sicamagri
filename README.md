# 🌱 SICAM AGRI — Système de Gestion de Pépinière

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?logo=mongodb)](https://www.mongodb.com)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Application web complète pour la gestion des pépinières agricoles : suivi des semis, lots de production, tests de germination, stocks de semences et traçabilité complète de la production.

> **Développé avec :** Node.js / Express 5 • React 19 • MongoDB • Socket.IO

---

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Stack technique](#-stack-technique)
- [Prérequis](#-prérequis)
- [Installation rapide](#-installation-rapide)
- [Variables d'environnement](#-variables-denvironnement)
- [Scripts disponibles](#-scripts-disponibles)
- [Structure du projet](#-structure-du-projet)
- [API & Authentification](#-api--authentification)
- [Déploiement](#-déploiement)
- [Captures d'écran](#-captures-décran)
- [Licence](#-licence)

---

## 🖼️ Aperçu

SICAM AGRI permet de gérer l'ensemble du cycle de production d'une pépinière :

1. **Réception des semis** → Enregistrement des entrées de plants
2. **Tests de germination** → Création de lots test et suivi du taux de germination
3. **Production** → Lots de production avec règles de durée, suivi croissance
4. **Récolte & Livraison** → Suivi des quantités livrées et dates
5. **Stock** → Gestion des stocks de semences avec mouvements
6. **Supervision** → Alertes et anomalies en temps réel

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| **Dashboard** | Tableau de bord adapté au rôle (Admin, Ingénieur, Employé, Visiteur) |
| **Pépinières** | Gestion des sites avec affectation des ingénieurs |
| **Variétés** | Catalogue des variétés végétales |
| **Semis** | Réception et suivi des entrées de plants |
| **Lots** | Lots de test (germination) et de production |
| **Tests Germination** | Tests avec calcul automatique du taux |
| **Production** | Suivi cycle : en_cours → terminé → livré |
| **Règles Production** | Durées de cycle par variété |
| **Stocks** | Stock de semences avec mouvements (entrée/sortie) |
| **Sorties Externes** | Traçabilité des sorties vers l'extérieur |
| **Fournisseurs** | Gestion des fournisseurs |
| **Utilisateurs** | Gestion des comptes et rôles |
| **Historique** | Cycle complet tracé : semis → test → production → livraison |
| **Supervision** | Alertes, anomalies et surveillance |
| **Export** | Export PDF et Excel des données |
| **Temps réel** | Notifications et mises à jour via Socket.IO |

### Rôles utilisateur

| Rôle | Permissions |
|------|-------------|
| **Admin** | Accès complet à toutes les fonctionnalités |
| **Ingénieur** | Gère les pépinières assignées, lots et semis |
| **Employé** | Vue opérationnelle (semis, pépinières) |
| **Visiteur** | Accès lecture seule |

---

## 🛠️ Stack technique

### Backend
- **Runtime :** Node.js 18+
- **Framework :** Express 5
- **Base de données :** MongoDB + Mongoose ODM
- **Authentification :** JWT (httpOnly cookies)
- **Sécurité :** bcrypt, helmet, CORS, rate limiting
- **WebSocket :** Socket.IO (temps réel)
- **Compression :** compression middleware

### Frontend
- **Framework :** React 19
- **Build tool :** Vite 6
- **Styling :** Tailwind CSS 4
- **Router :** React Router v7
- **Charts :** Recharts
- **Export :** ExcelJS, jsPDF, html2canvas
- **WebSocket :** Socket.IO Client
- **HTTP :** Axios

---

## 📦 Prérequis

- **Node.js** v18 ou supérieur
- **MongoDB** (local ou [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** (inclus avec Node.js)

---

## 🚀 Installation rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri

# 2. Installer les dépendances backend
cd backend
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres (voir section ci-dessous)

# 4. Installer les dépendances frontend
cd ../frontend
npm install

# 5. Configurer le frontend (optionnel, valeurs par défaut fonctionnelles)
cp .env.example .env

# 6. Initialiser la base de données (optionnel)
cd ../backend
npm run seed    # Crée un admin par défaut et des données de démo

# 7. Lancer l'application
npm run dev     # Backend sur http://localhost:5000

# Dans un autre terminal :
cd frontend
npm run dev     # Frontend sur http://localhost:5173
```

### Compte admin par défaut (après seed)

| Email | Mot de passe |
|-------|-------------|
| `admin@pep.com` | `admin123` |

---

## 🔐 Variables d'environnement

### Backend (`backend/.env`)

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `PORT` | Port du serveur Express | `5000` |
| `NODE_ENV` | Environnement (`development`, `production`) | `development` |
| `MONGO_URI` | URI de connexion MongoDB | `mongodb://localhost:27017/pepiniere` |
| `JWT_SECRET` | Clé secrète pour les tokens JWT | *(obligatoire)* |
| `JWT_EXPIRE` | Durée de validité du token | `7d` |

### Frontend (`frontend/.env`)

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL de l'API backend | `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | URL WebSocket | `http://localhost:5000` |

---

## 📜 Scripts disponibles

### Backend
```bash
npm run dev      # Lance le serveur en mode développement (nodemon)
npm start        # Lance le serveur en mode production
npm run seed     # Peuple la base de données avec des données initiales
npm run clear    # Vide la base de données
```

### Frontend
```bash
npm run dev      # Lance le serveur de développement Vite
npm run build    # Compile l'application pour la production
npm run preview  # Prévisualise le build de production
npm run lint     # Vérifie le code avec ESLint
```

---

## 📁 Structure du projet

```
sicamagri/
├── backend/
│   ├── config/          # Configuration (db, etc.)
│   ├── controllers/     # Handlers des routes API
│   ├── middleware/      # Auth, error handler
│   ├── models/          # Modèles Mongoose (schemas)
│   ├── routes/          # Définitions des routes Express
│   ├── scripts/         # Utilitaires (seed, clear-db)
│   ├── services/        # Logique métier
│   ├── utils/           # Fonctions utilitaires
│   ├── server.js        # Point d'entrée du serveur
│   └── .env.example     # Exemple de configuration
│
├── frontend/
│   ├── src/
│   │   ├── api/         # Client Axios
│   │   ├── components/  # Composants réutilisables
│   │   ├── constants/   # Constantes (couleurs, statuts)
│   │   ├── context/     # Contextes React (Auth)
│   │   ├── hooks/       # Hooks personnalisés
│   │   ├── pages/       # Pages de l'application
│   │   ├── services/    # Appels API par module
│   │   └── utils/       # Utilitaires
│   ├── index.html
│   └── .env.example     # Exemple de configuration
│
├── Start-Project.bat    # Script de démarrage Windows
├── Start-Project.ps1    # Script de démarrage PowerShell
└── WORKFLOW.md          # Documentation détaillée du workflow
```

---

## 🔌 API & Authentification

### Principe
- Authentification par **JWT stocké dans un cookie httpOnly**
- Le token est automatiquement envoyé avec chaque requête
- Les rôles sont vérifiés côté serveur pour chaque endpoint

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Profil utilisateur |
| GET/POST | `/api/pepinieres` | Gestion des pépinières |
| GET/POST | `/api/varietes` | Gestion des variétés |
| GET/POST | `/api/lots` | Gestion des lots |
| GET/POST | `/api/semis` | Gestion des semis |
| GET/POST | `/api/production-records` | Suivi production |
| GET/POST | `/api/cycles-de-semis` | Règles de production |
| GET/POST | `/api/stock` | Gestion des stocks |
| GET/POST | `/api/fournisseurs` | Gestion des fournisseurs |
| GET/POST | `/api/users` | Gestion des utilisateurs (admin) |

> Voir `WORKFLOW.md` pour la documentation complète de l'API.

---

## ☁️ Déploiement

### Option 1 : Apache / Serveur Ubuntu — Sous-dossier `/sicam`

Ce guide est optimisé pour votre serveur **Apache/2.4.58 (Ubuntu)** où l'application sera accessible via `www.winicari.tn/sicam`.

#### Architecture

```
Utilisateur ──► Apache (port 80)
                   │
                   ├───► www.winicari.tn/ (site existant)
                   │
                   └───► /sicam/ (fichiers statiques React depuis frontend/dist/)
                   └───► /sicam/api/* ──► Reverse Proxy ──► Node.js (port 5000)
                   └───► /sicam/socket.io/* ──► WebSocket Proxy ──► Node.js (port 5000)
                                                              │
                                                              └───► MongoDB
```

#### 1. Installer Node.js et PM2 sur le serveur

```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 (gestionnaire de processus)
sudo npm install -g pm2
```

#### 2. Cloner le projet et builder le frontend

```bash
cd /var/www
sudo git clone https://github.com/mohamederg25/sicamagri.git
cd sicamagri

# Backend - installer les dépendances
cd backend
npm install --production
cp .env.example .env
nano .env   # Configurer MONGO_URI, JWT_SECRET, NODE_ENV=production

# Frontend - build (base=/sicam/ automatiquement)
cd ../frontend
npm install
npm run build    # Génère frontend/dist/ avec chemins /sicam/
```

#### 3. Ajouter la configuration Apache pour `/sicam`

Éditez le fichier VirtualHost existant de `www.winicari.tn` :

```bash
# Trouver le fichier de configuration actuel
sudo apache2ctl -S | grep winicari
sudo nano /etc/apache2/sites-available/winicari.tn.conf  # ou le chemin trouvé
```

**Ajoutez ces directives DANS le `<VirtualHost *:80>` existant :**

```apache
    # ── SICAM AGRI - sous-dossier /sicam ──
    Alias /sicam /var/www/sicamagri/frontend/dist
    <Directory /var/www/sicamagri/frontend/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # ── React Router - toutes les routes internes → index.html ──
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^/sicam/ /sicam/index.html [L]

    # ── Reverse Proxy vers l'API Node.js ──
    ProxyRequests Off
    ProxyVia On
    ProxyPreserveHost On
    ProxyPass /sicam/api/ http://localhost:5000/api/
    ProxyPassReverse /sicam/api/ http://localhost:5000/api/

    # ── WebSocket (Socket.IO) ──
    ProxyPass /sicam/socket.io/ ws://localhost:5000/socket.io/
    ProxyPassReverse /sicam/socket.io/ ws://localhost:5000/socket.io/
```

Activez les modules nécessaires si pas déjà fait :

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite alias
sudo systemctl reload apache2
```

#### 4. Lancer le backend avec PM2

```bash
cd /var/www/sicamagri/backend
npm install -g pm2  # si pas déjà installé
pm2 start server.js --name sicamagri-api
pm2 save
pm2 startup   # Redémarrage automatique au boot
```

#### 5. Configurer MongoDB

**Option A : MongoDB local**
```bash
# Installer MongoDB sur Ubuntu
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**Option B : MongoDB Atlas (cloud, gratuit)**
- Créez un cluster gratuit sur [MongoDB Atlas](https://www.mongodb.com/atlas)
- Ajoutez l'adresse IP de votre serveur dans Network Access
- Utilisez l'URI de connexion dans votre `.env`

#### 6. Ajouter HTTPS (Let's Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-apache
sudo certbot --apache -d www.winicari.tn
```

---

### Option 2 : Render (alternative simplifiée)

1. Créez un compte sur [Render](https://render.com)
2. Connectez votre dépôt GitHub
3. Créez un **Web Service** pour le backend :
   - Build Command : `cd backend && npm install`
   - Start Command : `cd backend && npm start`
   - Ajoutez les variables d'environnement
4. Créez un **Static Site** pour le frontend :
   - Build Command : `cd frontend && npm install && npm run build`
   - Publish Directory : `frontend/dist`
5. Créez une base de données **MongoDB Atlas** (gratuit) et utilisez l'URI dans `MONGO_URI`

### Option 3 : VPS / Serveur dédié simple

```bash
# Installer les dépendances
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# Lancer avec PM2 (recommandé)
npm install -g pm2
cd ../backend
pm2 start server.js --name sicamagri-api
pm2 save
pm2 startup
```

---

## 📸 Captures d'écran

<!-- Ajoutez vos captures d'écran ici -->
| Dashboard | Gestion des Semis |
|-----------|-------------------|
| ![Dashboard](screenshots/dashboard.png) | ![Semis](screenshots/semis.png) |

> *(Créez un dossier `screenshots/` et ajoutez vos images)*

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus d'informations.

---

## 🙏 Remerciements

Développé avec ❤️ pour la gestion agricole moderne.

---

<p align="center">
  <sub>Fait avec ❤️ par l'équipe SICAM AGRI</sub>
</p>
