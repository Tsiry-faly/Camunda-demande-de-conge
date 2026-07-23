"""Petites fonctions utilitaires pour piloter Camunda 8 (REST API v2)
depuis Flask : demarrer un process, retrouver/assigner/completer une
user task, lire ses variables, annuler une instance.

Centralise ici pour eviter de dupliquer ces appels entre auth.py et app.py.
"""

import json
import time

import requests

CAMUNDA_BASE = "http://localhost:8080/v2"


def start_process_instance(process_definition_id, variables=None):
    r = requests.post(
        f"{CAMUNDA_BASE}/process-instances",
        json={
            "processDefinitionId": process_definition_id,
            "variables": variables or {},
        },
    )
    r.raise_for_status()
    return r.json()["processInstanceKey"]


def find_user_task(process_instance_key, element_id=None, retries=8, delay=0.5):
    """Attend que la tache CREATED liee a cette instance (et cet elementId
    BPMN si precise) apparaisse dans l'index de recherche Camunda."""
    payload = {"filter": {"state": "CREATED"}}
    if element_id:
        payload["filter"]["elementId"] = element_id

    for _ in range(retries):
        r = requests.post(f"{CAMUNDA_BASE}/user-tasks/search", json=payload)
        r.raise_for_status()
        tasks = r.json().get("items", [])
        task = next(
            (
                t
                for t in tasks
                if str(t["processInstanceKey"]) == str(process_instance_key)
            ),
            None,
        )
        if task:
            return task
        time.sleep(delay)
    return None


def search_user_tasks(element_id):
    """Toutes les taches CREATED pour un elementId BPMN donne."""
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/search",
        json={"filter": {"state": "CREATED", "elementId": element_id}},
    )
    r.raise_for_status()
    return r.json().get("items", [])


def get_task_variables(user_task_key):
    """Retourne un dict {nom_variable: valeur_python} pour une user task."""
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{user_task_key}/variables/search", json={}
    )
    r.raise_for_status()
    result = {}
    for item in r.json().get("items", []):
        raw = item.get("value")
        try:
            result[item["name"]] = json.loads(raw)
        except (TypeError, ValueError):
            result[item["name"]] = raw
    return result


def assign_task(user_task_key, assignee):
    requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{user_task_key}/assignment",
        json={"assignee": assignee},
    )


def complete_task(user_task_key, variables):
    r = requests.post(
        f"{CAMUNDA_BASE}/user-tasks/{user_task_key}/completion",
        json={"variables": variables},
    )
    return r.ok, r.text


def cancel_process_instance(process_instance_key):
    try:
        requests.post(
            f"{CAMUNDA_BASE}/process-instances/{process_instance_key}/cancellation"
        )
    except requests.RequestException:
        pass
