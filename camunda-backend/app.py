from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sqlite3
import time

from auth import auth_bp, login_required, DB_PATH

app = Flask(__name__)

# Genere une vraie cle depuis secrets
app.secret_key = "49d5989bc5d4044f599cf4c07b0702400ab1fcedf93a8334b83e69a4becf1f57"
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # True en HTTPS/prod
)

# supports_credentials=True est indispensable pour que le cookie de session
# voyage entre React (5173) et Flask (5000)
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])
app.register_blueprint(auth_bp)

CAMUNDA_BASE = "http://localhost:8080/v2"
TASK_APPROBATION_ELEMENT_ID = "Activity_156jd4g"  # id BPMN de "Approuver / refuser"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/api/start-leave-request", methods=["POST"])
@login_required(role="employe")
def start_leave_request():
    from flask import session

    body = request.json or {}

    # L'identite vient de la session (pas du formulaire) : un employe ne peut
    # plus soumettre une demande au nom d'un autre.
    variables = {
        "nom": session["nom"],
        "prenom": session["prenom"],
        "departement": session["departement"],
        "dateDebut": body.get("dateDebut"),
        "dateFin": body.get("dateFin"),
        "motif": body.get("motif", ""),
    }

    # 1. Demarrer l'instance
    r = requests.post(
        f"{CAMUNDA_BASE}/process-instances",
        json={"processDefinitionId": "Process_0ul30q6"},
    )
    r.raise_for_status()
    instance = r.json()
    process_instance_key = instance["processInstanceKey"]

    # 2. Chercher la tache "Remplir la demande" associee
    time.sleep(1)
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/search", json={"filter": {"state": "CREATED"}}
    )
    r.raise_for_status()
    tasks = r.json()["items"]
    task = next(
        (t for t in tasks if t["processInstanceKey"] == process_instance_key),
        None,
    )

    if not task:
        return jsonify({"error": "Tache introuvable"}), 500

    task_key = task["userTaskKey"]

    # 3. S'assigner la tache
    requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{task_key}/assignment",
        json={"assignee": f"{variables['prenom']} {variables['nom']}"},
    )

    # 4. Completer la tache avec les variables du formulaire
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{task_key}/completion",
        json={"variables": variables},
    )
    r.raise_for_status()

    # 5. Garder le lien demande <-> process pour le panneau admin
    conn = get_db()
    conn.execute(
        """INSERT INTO demandes
           (employe_id, date_debut, date_fin, motif, process_instance_key)
           VALUES (?, ?, ?, ?, ?)""",
        (
            session["user_id"],
            variables["dateDebut"],
            variables["dateFin"],
            variables["motif"],
            process_instance_key,
        ),
    )
    conn.commit()
    conn.close()

    return jsonify({"processInstanceKey": process_instance_key})


@app.route("/api/demandes-en-attente", methods=["GET"])
@login_required(role="admin")
def demandes_en_attente():
    """Demandes dont la verification automatique est passee et qui
    attendent une decision admin (tache 'Approuver / refuser' encore CREATED)."""
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/search",
        json={"filter": {"state": "CREATED", "elementId": TASK_APPROBATION_ELEMENT_ID}},
    )
    r.raise_for_status()
    tasks = r.json().get("items", [])

    conn = get_db()
    resultats = []
    for t in tasks:
        row = conn.execute(
            """SELECT d.*, e.nom, e.prenom, e.departement
               FROM demandes d
               JOIN employes e ON e.id = d.employe_id
               WHERE d.process_instance_key = ?""",
            (t["processInstanceKey"],),
        ).fetchone()
        if row:
            resultats.append(
                {
                    "id": row["id"],
                    "employe": f"{row['prenom']} {row['nom']}",
                    "departement": row["departement"],
                    "date_debut": row["date_debut"],
                    "date_fin": row["date_fin"],
                    "motif": row["motif"],
                    "task_id": t["userTaskKey"],
                }
            )
    conn.close()
    return jsonify(resultats)


def _traiter_demande(task_id, decision):
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{task_id}/completion",
        json={"variables": {"decision": decision}},
    )
    return r.ok, r.text


@app.route("/api/demandes/<task_id>/approuver", methods=["POST"])
@login_required(role="admin")
def approuver(task_id):
    ok, err = _traiter_demande(
        task_id, "approuve"
    )  # valeur exacte attendue par le gateway
    return (jsonify({"ok": True}), 200) if ok else (jsonify({"error": err}), 500)


@app.route("/api/demandes/<task_id>/refuser", methods=["POST"])
@login_required(role="admin")
def refuser(task_id):
    ok, err = _traiter_demande(
        task_id, "refuser"
    )  # valeur exacte attendue par le gateway
    return (jsonify({"ok": True}), 200) if ok else (jsonify({"error": err}), 500)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
