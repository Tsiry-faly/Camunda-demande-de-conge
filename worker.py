import sqlite3
import asyncio
from datetime import datetime
from pyzeebe import ZeebeWorker, create_insecure_channel


def check_leave_balance(
    nom: str, prenom: str, departement: str, dateDebut: str, dateFin: str
):
    conn = sqlite3.connect("conges.db")
    cursor = conn.cursor()
    cursor.execute(
        "SELECT conge FROM employes WHERE nom = ? AND prenom = ? AND departement = ?",
        (nom, prenom, departement),
    )
    row = cursor.fetchone()
    conn.close()

    solde = row[0] if row else 0

    d1 = datetime.strptime(dateDebut, "%Y-%m-%d")
    d2 = datetime.strptime(dateFin, "%Y-%m-%d")
    jours_demandes = (d2 - d1).days + 1

    solde_suffisant = solde >= jours_demandes

    return {"soldeSuffisant": solde_suffisant, "soldeRestant": solde}


def notify_refusal(nom: str, prenom: str, soldeRestant: int):
    print(f"EMAIL envoyé à {prenom} {nom} :", flush=True)
    print(f"Objet : Votre demande de congé a été refusée", flush=True)
    print(
        f"Corps : Bonjour {prenom}, votre demande n'a pas pu être approuvée.",
        flush=True,
    )
    print(f"Solde de congés restant : {soldeRestant} jours.", flush=True)
    return {"notificationEnvoyee": True}


async def main():
    channel = create_insecure_channel(grpc_address="localhost:26500")
    worker = ZeebeWorker(channel)
    worker.task(task_type="check_leave_balance")(check_leave_balance)
    worker.task(task_type="notify-refusal")(notify_refusal)
    print("Worker démarré, en attente de tâches...", flush=True)

    await worker.work()


if __name__ == "__main__":
    asyncio.run(main())
