from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import sqlite3
import time
from datetime import datetime

from auth import auth_bp, login_required, DB_PATH
from camunda_client import (
    find_user_task,
    assign_task,
    complete_task,
    search_user_tasks,
    get_task_variables,
)

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
TASK_APPROBATION_ELEMENT_ID = "approuverRefuser"  # anciennement Activity_156jd4g


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

    # Depuis le nouveau diagramme, la tache "Remplir la demande" fait deja
    # partie de l'instance ouverte au login (Login -> Remplir la demande) :
    # on ne demarre plus de nouvelle instance ici, on reutilise celle-la.
    process_instance_key = session.get("process_instance_key")
    if not process_instance_key:
        return jsonify({"error": "Session Camunda introuvable, reconnectez-vous"}), 400

    task = find_user_task(process_instance_key, "remplirDemande")
    if not task:
        return jsonify({"error": "Tache 'Remplir la demande' introuvable"}), 500

    task_key = task["userTaskKey"]
    assign_task(task_key, f"{variables['prenom']} {variables['nom']}")
    ok, err = complete_task(task_key, variables)
    if not ok:
        return jsonify({"error": err}), 500

    # Garder le lien demande <-> process pour le panneau admin
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
                    "process_instance_key": row["process_instance_key"],
                }
            )
    conn.close()
    return jsonify(resultats)


TASK_APPROBATION_INSCRIPTION_ELEMENT_ID = (
    "approbationAdmin"  # anciennement Activity_11muvfx
)


@app.route("/api/inscriptions-en-attente", methods=["GET"])
@login_required(role="admin")
def inscriptions_en_attente():
    """L'employe n'existe pas encore en base a ce stade (il n'est insere
    qu'apres validation, via le service task 'inserer_BD') : les donnees
    du formulaire d'inscription sont lues directement depuis les variables
    de la tache Camunda 'Approbation de l'admin'."""
    tasks = search_user_tasks(TASK_APPROBATION_INSCRIPTION_ELEMENT_ID)
    resultats = []
    for t in tasks:
        variables = get_task_variables(t["userTaskKey"])
        resultats.append(
            {
                "id": t["userTaskKey"],
                "nom": variables.get("nom"),
                "prenom": variables.get("prenom"),
                "departement": variables.get("departement"),
                "email": variables.get("mail"),
            }
        )
    return jsonify(resultats)


@app.route("/api/inscriptions/<task_id>/valider", methods=["POST"])
@login_required(role="admin")
def valider_inscription(task_id):
    # select="approuver" -> la passerelle declenche en parallele la tache
    # "Login" et le service task "inserer_BD" qui cree reellement l'employe.
    ok, err = complete_task(task_id, {"select": "approuver"})
    return (jsonify({"ok": True}), 200) if ok else (jsonify({"error": err}), 500)


@app.route("/api/inscriptions/<task_id>/refuser", methods=["POST"])
@login_required(role="admin")
def refuser_inscription(task_id):
    # select="refuser" -> la passerelle "Accepter?" route maintenant vers le
    # service task "notification_refus_inscription" (worker.py) puis un End
    # Event dedie : le process se termine proprement, plus de tache orpheline.
    ok, err = complete_task(task_id, {"select": "refuser"})
    return (jsonify({"ok": True}), 200) if ok else (jsonify({"error": err}), 500)


def _traiter_demande(task_id, decision):
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{task_id}/completion",
        json={"variables": {"decision": decision}},
    )
    return r.ok, r.text


def _marquer_statut(process_instance_key, statut):
    """Enregistre l'issue de la decision admin pour la notification employe."""
    if not process_instance_key:
        return
    conn = get_db()
    conn.execute(
        """UPDATE demandes
           SET statut = ?, vu = 0, updated_at = CURRENT_TIMESTAMP
           WHERE process_instance_key = ?""",
        (statut, str(process_instance_key)),
    )
    conn.commit()
    conn.close()


def _decrementer_solde(process_instance_key):
    """Décrémente le solde de congés de l'employé une fois la demande approuvée."""
    if not process_instance_key:
        return
    conn = get_db()
    row = conn.execute(
        "SELECT employe_id, date_debut, date_fin FROM demandes WHERE process_instance_key = ?",
        (str(process_instance_key),),
    ).fetchone()
    if row:
        d1 = datetime.strptime(row["date_debut"], "%Y-%m-%d")
        d2 = datetime.strptime(row["date_fin"], "%Y-%m-%d")
        jours = (d2 - d1).days + 1
        conn.execute(
            "UPDATE employes SET conge = conge - ? WHERE id = ?",
            (jours, row["employe_id"]),
        )
        conn.commit()
    conn.close()


@app.route("/api/demandes/<task_id>/approuver", methods=["POST"])
@login_required(role="admin")
def approuver(task_id):
    process_instance_key = (request.json or {}).get("process_instance_key")
    ok, err = _traiter_demande(
        task_id, "approuve"
    )  # valeur exacte attendue par le gateway
    if ok:
        _marquer_statut(process_instance_key, "approuve")
        _decrementer_solde(process_instance_key)
    return (jsonify({"ok": True}), 200) if ok else (jsonify({"error": err}), 500)


@app.route("/api/demandes/<task_id>/refuser", methods=["POST"])
@login_required(role="admin")
def refuser(task_id):
    process_instance_key = (request.json or {}).get("process_instance_key")
    ok, err = _traiter_demande(
        task_id, "refuser"
    )  # valeur exacte attendue par le gateway
    if ok:
        _marquer_statut(process_instance_key, "refuse_admin")
    return (jsonify({"ok": True}), 200) if ok else (jsonify({"error": err}), 500)


@app.route("/api/mes-notifications", methods=["GET"])
@login_required(role="employe")
def mes_notifications():
    """Demandes de l'employe connecte dont l'issue est connue et pas encore vue :
    refus automatique (solde), refus admin, ou approbation."""
    from flask import session

    conn = get_db()
    rows = conn.execute(
        """SELECT id, date_debut, date_fin, statut, solde_restant, updated_at
           FROM demandes
           WHERE employe_id = ? AND statut != 'en_attente' AND vu = 0
           ORDER BY updated_at DESC""",
        (session["user_id"],),
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/notifications/<int:demande_id>/vu", methods=["POST"])
@login_required(role="employe")
def marquer_notification_vue(demande_id):
    from flask import session

    conn = get_db()
    conn.execute(
        "UPDATE demandes SET vu = 1 WHERE id = ? AND employe_id = ?",
        (demande_id, session["user_id"]),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/employes", methods=["GET"])
@login_required(role="admin")
def liste_employes():
    """Vue d'ensemble des employes actifs et de leur solde de conges restant."""
    conn = get_db()
    rows = conn.execute("""SELECT id, nom, prenom, departement, conge
           FROM employes
           WHERE statut = 'actif'
           ORDER BY departement, nom, prenom""").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/reset-soldes", methods=["POST"])
@login_required(role="admin")
def reset_soldes():
    conn = get_db()
    conn.execute("UPDATE employes SET conge = 25 WHERE statut = 'actif'")
    nb = conn.total_changes
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "nb_employes": nb})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
