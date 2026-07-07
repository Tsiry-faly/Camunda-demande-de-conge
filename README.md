# Demande de Congé — Workflow Camunda 8

## Description

Ce projet est une implémentation d'un workflow de demande de congé utilisant **Camunda 8**, 
réalisé dans le cadre de mon apprentissage de l'orchestration de processus métier (BPM). 
Il couvre le cycle complet : modélisation BPMN, création de formulaires interactifs, 
logique conditionnelle, déploiement et exécution.

## Objectif

Se familiariser avec les composants clés de Camunda 8 :
- **Modeler** : conception du diagramme BPMN et des formulaires
- **Zeebe** : moteur d'exécution des processus
- **Tasklist** : interface de traitement des tâches humaines
- **Operate** : supervision et débogage des instances de processus

## Fonctionnement du workflow

1. **Soumission de la demande** — l'employé remplit un formulaire (nom, dates de début/fin, motif)
2. **Validation manager** — le manager examine la demande et choisit d'approuver ou de refuser
3. **Passerelle de décision (Exclusive Gateway)** — le processus route automatiquement 
   vers l'issue correspondante selon la décision, via une expression FEEL

## Stack technique

- Camunda 8 (via `c8run`, environnement local de développement)
- BPMN 2.0
- Camunda Forms
- Expressions FEEL pour la logique conditionnelle

## Structure du projet

- diagram_BPMN.bpmn          # Diagramme du processus
- form_1.form                # Formulaire de soumission de la demande
- form_approbation.form      # Formulaire de validation du manager

## Tester le projet

1. Installer et lancer [Camunda 8 Run (c8run)](https://docs.camunda.io/docs/next/self-managed/setup/deploy/local/c8run/)
2. Déployer les fichiers `.bpmn` et `.form` via Camunda Modeler
3. Démarrer une instance depuis Tasklist (`localhost:8080/tasklist`)
4. Suivre l'exécution dans Operate (`localhost:8080/operate`)
