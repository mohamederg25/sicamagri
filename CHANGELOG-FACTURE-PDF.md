# 📄 Mise à jour — Facture PDF pour les sorties de stock

**Date :** 29 juillet 2026  
**Auteur :** Développement SICAM AGRI  
**Version :** 1.0.0

---

## ✨ Nouveautés

Un bouton **"Facture PDF"** a été ajouté pour générer automatiquement une facture professionnelle au format PDF à chaque sortie de stock :

- **Sortie pépinière** → génère un **Bon de sortie pépinière** (code, variété, pépinière destination, quantité, taux germination, etc.)
- **Bon de passage / Sortie externe** → génère une **Facture / Bon de passage** (référence, variété, motif, quantité, etc.)

---

## 📁 Fichiers modifiés

| Fichier | Type | Description |
|---------|------|-------------|
| `frontend/src/utils/invoicePDF.js` | **Nouveau** | Moteur de génération PDF (jsPDF) — fonctions `generateSemisInvoice()` et `generateBonPassageInvoice()` |
| `frontend/src/pages/StockSemenceDetail.jsx` | Modifié | Bouton "Facture PDF" sur chaque mouvement dans l'historique |
| `frontend/src/pages/SemisDetail.jsx` | Modifié | Bouton "Télécharger la facture PDF" dans les actions |
| `frontend/src/pages/SortiesExternes.jsx` | Modifié | Colonne "Facture" avec bouton PDF par ligne |

---

## 🚀 Instructions de déploiement

### Étape 1 — Récupérer la mise à jour sur le serveur

```bash
# Aller dans le dossier du projet
cd /chemin/vers/sicam-agri

# Récupérer les dernières modifications depuis GitHub
git pull origin master
```

### Étape 2 — Installer les dépendances (si pas déjà fait)

```bash
# Frontend
cd frontend
npm install
```

**Note :** Les packages `jspdf` et `jspdf-autotable` sont déjà dans `package.json`.  
Si ce n'est pas le cas, exécutez :

```bash
npm install jspdf jspdf-autotable
```

### Étape 3 — Reconstruire le frontend

```bash
# Depuis le dossier frontend
npm run build
```

Ou si vous utilisez Vite directement :

```bash
npx vite build
```

### Étape 4 — Redémarrer le backend

```bash
# Depuis la racine du projet
pm2 restart all
# OU
systemctl restart sicam-agri
# OU
# Redémarrage manuel du serveur Node.js
```

### Étape 5 — Vérification

1. Ouvrir l'application dans le navigateur
2. Aller dans **Stock de semences** → cliquer sur un stock → dans l'historique des mouvements, cliquer sur **"Facture PDF"**
3. Aller dans un **Semis** → cliquer sur **"Télécharger la facture PDF"**
4. Aller dans **Sorties externes** → cliquer sur le bouton **PDF** dans la colonne Facture

Un PDF professionnel doit se télécharger automatiquement.

---

## 🔧 Dépannage

**Problème :** Le PDF ne se génère pas  
**Solution :** Vérifiez que `jspdf` est installé : `npm list jspdf` depuis le dossier `frontend/`

**Problème :** Erreur "jsPDF is not a constructor"  
**Solution :** Mettez à jour jspdf : `npm install jspdf@latest jspdf-autotable@latest`

**Problème :** Les modifications n'apparaissent pas  
**Solution :** Vider le cache du navigateur (Ctrl+F5) et re-build le frontend

---

## 📊 Structure du PDF généré

Le PDF généré contient :

```
┌─────────────────────────────────────────────┐
│  ██████ SICAM AGRI                          │
│  Production Agricole — Suivi & Gestion      │
│                                    BON DE   │
│                               SORTIE PÉPINIÈRE│
│─────────────────────────────────────────────│
│  N° Facture : S042                          │
│  Date       : 29 juil. 2026, 14:30          │
│  Émis par   : Mohamed Erguez               │
│  Destination: Pépinière Sud                 │
│─────────────────────────────────────────────│
│  Variété             │ Tomate Cœur de Bœuf  │
│  Quantité            │ 5 000 graines        │
│  Taux germination    │ 85%                  │
│  Plants estimés      │ 4 250 plants         │
│  Lot semence source  │ 250715SE             │
│  Fournisseur         │ Semco                │
│─────────────────────────────────────────────│
│  █████ RÉCAPITULATIF █████                  │
│  Total graines sorties :           5 000    │
│─────────────────────────────────────────────│
│  Document confidentiel — SICAM AGRI         │
└─────────────────────────────────────────────┘
```

---

*Document généré automatiquement — SICAM AGRI*
