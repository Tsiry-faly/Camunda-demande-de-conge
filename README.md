# Demande de Congé - Workflow Camunda 8

## Description

Ce projet est une implémentation full-stack d'un workflow de demande de congé utilisant
**Camunda 8**, réalisée dans le cadre de mon apprentissage de l'orchestration de processus
métier (BPM). Il couvre le cycle complet : modélisation BPMN, formulaires interactifs,
logique conditionnelle, worker Python, backend Flask, frontend React avec authentification
par rôle, et déploiement/exécution du processus.

## Objectif

Se familiariser avec les composants clés de Camunda 8 :
- **Modeler** : conception du diagramme BPMN et des formulaires
- **Zeebe** : moteur d'exécution des processus
- **Tasklist / Operate** : supervision et débogage des instances de processus
- Intégration d'un moteur BPM dans une application web réelle (React + Flask + worker Python)

## Architecture

```
Frontend React (Vite, :5173)  --axios-->  Backend Flask (:5000)  --REST-->  Camunda 8 (:8080)
                                                  |                              |
                                             conges.db (SQLite)          gRPC (:26500)
                                                                                 |
                                                                        Worker Python (pyzeebe)
```

Le frontend ne parle jamais directement à Camunda (CSRF bloqué côté navigateur) : toutes
les requêtes passent par le backend Flask, qui fait le pont vers l'API REST de Camunda.

## Fonctionnement du workflow

1. **Connexion** : chaque employé se connecte avec son propre compte (email + mot de
   passe) ; un compte admin séparé donne accès au panneau d'approbation
2. **Soumission de la demande** : l'employé remplit uniquement les dates et le motif —
   son identité (nom, prénom, département) est reprise automatiquement de son compte
3. **Vérification automatique du solde** : un service task interroge `conges.db` pour
   vérifier que l'employé a assez de jours disponibles
   - solde insuffisant → refus automatique, notification, fin du processus
   - solde suffisant → la demande passe à l'étape d'approbation
4. **Approbation admin** : l'admin voit, dans un panneau React dédié, la liste des
   demandes ayant passé la vérification, et clique Approuver/Refuser
5. **Passerelle de décision (Exclusive Gateway)** : le processus route vers l'issue
   correspondante selon la variable `decision`, via une expression FEEL

## Stack technique

- **Process engine** : Camunda 8 (via `c8run`, environnement local de développement)
- **BPMN 2.0** + Camunda Forms + expressions FEEL
- **Worker** : Python (`pyzeebe`), connecté en gRPC
- **Backend** : Flask (proxy REST vers Camunda, authentification par session, SQLite)
- **Frontend** : React (Vite), `react-router-dom`, `axios`
- **Base de données** : SQLite (`conges.db`)

## Structure du projet

```
├── diagram_BPMN.bpmn          # Diagramme du processus
├── form_1.form                # Formulaire de soumission de la demande
├── form_approbation.form      # Formulaire de validation du manager
├── init_db.py                 # Création initiale de la base (table employes)
├── migration_add_auth.py      # Ajoute l'authentification (email/mdp, table admins, demandes)
├── worker.py                  # Worker pyzeebe (vérification solde, notification refus)
├── conges.db                  # Base SQLite
│
├── camunda-backend/
│   ├── app.py                 # API Flask : demande de congé + panneau admin
│   └── auth.py                # Login/logout/session (employé et admin)
│
└── camunda-frontend/
    └── src/
        ├── App.jsx             # Routage (/login, /employe, /admin)
        ├── AuthContext.jsx     # Contexte React pour l'état de connexion
        ├── ProtectedRoute.jsx  # Garde d'accès par rôle
        ├── LoginPage.jsx       # Page de connexion
        ├── leaveRequestForm.jsx  # Formulaire employé
        ├── AdminApprovalPage.jsx # Panneau d'approbation admin
        └── api.js              # Appels axios vers le backend
```

## Installer et lancer le projet

Quatre terminaux sont nécessaires :

1. **Camunda 8** : lancer [c8run](https://docs.camunda.io/docs/next/self-managed/setup/deploy/local/c8run/)
   et déployer `diagram_BPMN.bpmn` + les fichiers `.form` via Camunda Modeler
2. **Worker** : `python worker.py` (à la racine)
3. **Backend** :
   ```bash
   cd camunda-backend
   pip install flask flask-cors requests werkzeug
   python app.py
   ```
4. **Frontend** :
   ```bash
   cd camunda-frontend
   npm install
   npm run dev
   ```

Avant le premier lancement, initialiser la base et l'authentification (une seule fois,
depuis la racine du projet) :

```bash
python init_db.py           # crée conges.db avec des employés de test
python migration_add_auth.py  # ajoute email/mot de passe, comptes admin, table demandes
```

Le script affiche les identifiants générés (mot de passe par défaut `changeme123` pour
chaque employé, `admin` / `admin123` pour l'admin).

## Tester le projet

1. Ouvrir `http://localhost:5173/login`
2. Se connecter avec un compte employé pour soumettre une demande
3. Se connecter avec le compte admin pour approuver ou refuser les demandes en attente
4. Suivre l'exécution des instances de processus dans Operate (`localhost:8080/operate`)
