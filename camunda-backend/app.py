from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

CAMUNDA_BASE = "http://localhost:8080/v2"


@app.route("/api/start-leave-request", methods=["POST"])
def start_leave_request():
    variables = request.json

    # 1. Démarrer l'instance
    r = requests.post(
        f"{CAMUNDA_BASE}/process-instances",
        json={"processDefinitionId": "Process_0ul30q6"},
    )
    r.raise_for_status()
    instance = r.json()

    # 2. Chercher la tâche associée
    import time

    time.sleep(1)
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/search", json={"filter": {"state": "CREATED"}}
    )
    r.raise_for_status()
    tasks = r.json()["items"]
    task = next(
        (t for t in tasks if t["processInstanceKey"] == instance["processInstanceKey"]),
        None,
    )

    if not task:
        return jsonify({"error": "Tâche introuvable"}), 500

    task_key = task["userTaskKey"]

    # 3. S'assigner la tâche
    requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{task_key}/assignment",
        json={"assignee": f"{variables.get('prenom')} {variables.get('nom')}"},
    )

    # 4. Compléter la tâche
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{task_key}/completion",
        json={"variables": variables},
    )
    r.raise_for_status()

    return jsonify({"processInstanceKey": instance["processInstanceKey"]})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
