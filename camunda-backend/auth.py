from functools import wraps
import sqlite3
import os

from flask import Blueprint, request, jsonify, session
from werkzeug.security import check_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "conges.db")
auth_bp = Blueprint("auth", __name__)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    identifiant = (data.get("identifiant") or "").strip()
    password = data.get("password") or ""

    if not identifiant or not password:
        return jsonify({"error": "Identifiant et mot de passe requis"}), 400

    conn = get_db()

    # 1) Compte admin
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

    # 2) Compte employe (login par email)
    employe = conn.execute(
        "SELECT * FROM employes WHERE email = ?", (identifiant,)
    ).fetchone()
    conn.close()

    if (
        employe
        and employe["password_hash"]
        and check_password_hash(employe["password_hash"], password)
    ):
        session.clear()
        session["role"] = "employe"
        session["user_id"] = employe["id"]
        session["nom"] = employe["nom"]
        session["prenom"] = employe["prenom"]
        session["departement"] = employe["departement"]
        return jsonify(
            {
                "role": "employe",
                "nom": employe["nom"],
                "prenom": employe["prenom"],
                "departement": employe["departement"],
            }
        )

    return jsonify({"error": "Identifiants invalides"}), 401


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
