from functools import wraps
import sqlite3
import os
import re

from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash

from camunda_client import (
    start_process_instance,
    find_user_task,
    assign_task,
    complete_task,
    cancel_process_instance,
)

DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "conges.db"
)
auth_bp = Blueprint("auth", __name__)

PROCESS_ID = "Process_0ul30q6"
ELEMENT_INSCRIPTION = "sInscrire"  # anciennement Activity_0hb6w0h
ELEMENT_LOGIN = "login"  # anciennement Activity_1v5sp4g

DEPARTEMENTS_VALIDES = {"si", "rh", "fc", "mc", "po"}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(force=True)
    nom = (data.get("nom") or "").strip()
    prenom = (data.get("prenom") or "").strip()
    departement = (data.get("departement") or "").strip().lower()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not all([nom, prenom, departement, email, password]):
        return jsonify({"error": "Tous les champs sont requis"}), 400
    if departement not in DEPARTEMENTS_VALIDES:
        return jsonify({"error": "Departement invalide"}), 400
    if len(password) < 6:
        return jsonify({"error": "Mot de passe trop court (6 caracteres minimum)"}), 400
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "Email invalide"}), 400

    conn = get_db()
    existant = conn.execute(
        "SELECT id FROM employes WHERE email = ?", (email,)
    ).fetchone()
    conn.close()
    if existant:
        return jsonify({"error": "Un compte existe deja avec cet email"}), 409

    # 1. Demarrer le process avec dansLaBase=false -> passerelle "Dans la base
    #    de donnees ?" route vers la user task "s'inscrire".
    process_instance_key = start_process_instance(PROCESS_ID, {"dansLaBase": False})

    # 2. Recuperer cette tache et la completer avec les donnees du formulaire.
    task = find_user_task(process_instance_key, ELEMENT_INSCRIPTION)
    if not task:
        cancel_process_instance(process_instance_key)
        return jsonify({"error": "Impossible de demarrer l'inscription (Camunda)"}), 500

    task_key = task["userTaskKey"]
    assign_task(task_key, email)
    ok, err = complete_task(
        task_key,
        {
            "nom": nom,
            "prenom": prenom,
            "mail": email,
            "departement": departement,
            "motDePasse": password,
            "confirmeMotDePasse": password,
        },
    )
    if not ok:
        cancel_process_instance(process_instance_key)
        return jsonify({"error": f"Erreur Camunda: {err}"}), 500

    # L'employe n'est PAS encore en base : il n'y sera insere que par le
    # service task "inserer_BD" (worker.py), une fois que l'admin aura
    # complete la tache "Approbation de l'admin" avec select="approuver".
    return (
        jsonify(
            {
                "message": "Inscription enregistree, en attente de validation par un administrateur",
                "processInstanceKey": process_instance_key,
            }
        ),
        201,
    )


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    identifiant = (data.get("identifiant") or "").strip()
    password = data.get("password") or ""

    if not identifiant or not password:
        return jsonify({"error": "Identifiant et mot de passe requis"}), 400

    conn = get_db()

    # 1) Compte admin : verifie directement en base (pas de passage par
    #    Camunda, ce role n'est pas modelise dans le process).
    admin = conn.execute(
        "SELECT * FROM admins WHERE username = ?", (identifiant,)
    ).fetchone()
    if admin and check_password_hash(admin["password_hash"], password):
        conn.close()
        session.clear()
        session["role"] = "admin"
        session["user_id"] = admin["id"]
        session["nom"] = admin["username"]
        return jsonify({"role": "admin", "nom": admin["username"]})

    # 2) Compte employe : on verifie d'abord les identifiants en base (le
    #    process Camunda ne fait pas ce controle, la tache "Login" ne fait
    #    que collecter les champs du formulaire), puis on demarre/complete
    #    la tache Camunda pour respecter le diagramme.
    employe = conn.execute(
        "SELECT * FROM employes WHERE email = ?", (identifiant,)
    ).fetchone()
    conn.close()

    if not (
        employe
        and employe["password_hash"]
        and check_password_hash(employe["password_hash"], password)
    ):
        return jsonify({"error": "Identifiants invalides"}), 401

    if employe["statut"] != "actif":
        return (
            jsonify({"error": "Compte en attente de validation par un administrateur"}),
            403,
        )

    # 3. dansLaBase=true -> passerelle route directement vers la tache "Login".
    process_instance_key = start_process_instance(PROCESS_ID, {"dansLaBase": True})
    task = find_user_task(process_instance_key, ELEMENT_LOGIN)
    if task:
        assign_task(task["userTaskKey"], employe["email"])
        complete_task(
            task["userTaskKey"],
            {
                "nom": employe["nom"],
                "prenom": employe["prenom"],
                "mail": employe["email"],
                "motDePasse": password,
            },
        )
        # Le process avance alors automatiquement (via le service task
        # "authentification" gere par worker.py) vers "Remplir la demande" ;
        # /api/start-leave-request reutilisera cette meme instance.

    session.clear()
    session["role"] = "employe"
    session["user_id"] = employe["id"]
    session["nom"] = employe["nom"]
    session["prenom"] = employe["prenom"]
    session["departement"] = employe["departement"]
    session["process_instance_key"] = process_instance_key
    return jsonify(
        {
            "role": "employe",
            "nom": employe["nom"],
            "prenom": employe["prenom"],
            "departement": employe["departement"],
        }
    )


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@auth_bp.route("/api/me", methods=["GET"])
def me():
    if "role" not in session:
        return jsonify({"authenticated": False}), 401
    return jsonify(
        {
            "authenticated": True,
            "role": session["role"],
            "nom": session.get("nom"),
            "prenom": session.get("prenom"),
            "departement": session.get("departement"),
            "user_id": session.get("user_id"),
        }
    )


def login_required(role=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if "role" not in session:
                return jsonify({"error": "Non authentifie"}), 401
            if role and session["role"] != role:
                return jsonify({"error": "Acces refuse"}), 403
            return f(*args, **kwargs)

        return wrapper

    return decorator
