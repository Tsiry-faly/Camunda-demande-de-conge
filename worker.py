import sqlite3
import asyncio
from datetime import datetime
from pyzeebe import ZeebeWorker, create_insecure_channel, Job
from werkzeug.security import generate_password_hash


def verification_BD(
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

    if not dateDebut or not dateFin:
        raise ValueError("Les dates ne peuvent pas être vides")
    d1 = datetime.strptime(dateDebut, "%Y-%m-%d")
    d2 = datetime.strptime(dateFin, "%Y-%m-%d")
    jours_demandes = (d2 - d1).days + 1

    solde_suffisant = solde >= jours_demandes

    return {"soldeSuffisant": solde_suffisant, "soldeRestant": solde}


def notify_refusal(job: Job, nom: str, prenom: str, soldeRestant: int):
    print(f"EMAIL envoyé à {prenom} {nom} :", flush=True)
    print(f"Objet : Votre demande de congé a été refusée", flush=True)
    print(
        f"Corps : Bonjour {prenom}, votre demande n'a pas pu être approuvée.",
        flush=True,
    )
    print(f"Solde de congés restant : {soldeRestant} jours.", flush=True)

    # Enregistre le refus automatique pour que la page employe puisse
    # afficher une notification (voir /api/mes-notifications cote Flask).
    conn = sqlite3.connect("conges.db")
    conn.execute(
        """UPDATE demandes
           SET statut = 'refuse_solde', solde_restant = ?, vu = 0,
               updated_at = CURRENT_TIMESTAMP
           WHERE process_instance_key = ?""",
        (soldeRestant, str(job.process_instance_key)),
    )
    conn.commit()
    conn.close()

    return {"notificationEnvoyee": True}


def inserer_BD(nom: str, prenom: str, departement: str, mail: str, motDePasse: str):
    """Cree l'employe une fois que l'admin a approuve son inscription
    (branche 'approuver' de la passerelle parallele Gateway_0f5x8ra)."""
    conn = sqlite3.connect("conges.db")
    existant = conn.execute(
        "SELECT id FROM employes WHERE email = ?", (mail,)
    ).fetchone()
    if existant:
        conn.close()
        return {"insertionOk": False, "raisonEchec": "email_deja_utilise"}

    conn.execute(
        """INSERT INTO employes
           (nom, prenom, departement, conge, email, password_hash, statut)
           VALUES (?, ?, ?, 25, ?, ?, 'actif')""",
        (nom, prenom, departement, mail, generate_password_hash(motDePasse)),
    )
    conn.commit()
    conn.close()
    return {"insertionOk": True}


def authentification(mail: str, motDePasse: str):
    """Service task entre 'Login' et 'Remplir la demande'. Flask a deja
    valide les identifiants avant de completer la tache Login (voir
    auth.py), donc en pratique ce controle echoue rarement. On le fait
    quand meme ici pour que le diagramme reste fidele a ce qu'il annonce :
    en cas d'incoherence, on leve une erreur -> Zeebe cree un incident et
    bloque l'instance plutot que de laisser passer une authentification
    invalide silencieusement."""
    conn = sqlite3.connect("conges.db")
    row = conn.execute(
        "SELECT password_hash FROM employes WHERE email = ? AND statut = 'actif'",
        (mail,),
    ).fetchone()
    conn.close()

    from werkzeug.security import check_password_hash

    if not row or not check_password_hash(row[0], motDePasse):
        raise ValueError(f"Authentification invalide pour {mail}")

    return {"authentifie": True}


def notification_refus_inscription(job: Job, nom: str, prenom: str, mail: str):
    print(f"EMAIL envoyé à {prenom} {nom} ({mail}) :", flush=True)
    print("Objet : Votre inscription a été refusée", flush=True)
    print(
        f"Corps : Bonjour {prenom}, votre demande d'inscription n'a pas été validée par l'administrateur.",
        flush=True,
    )
    return {"notificationEnvoyee": True}


async def main():
    channel = create_insecure_channel(grpc_address="localhost:26500")
    worker = ZeebeWorker(channel)
    worker.task(task_type="verification_BD")(verification_BD)
    worker.task(task_type="notification_refus")(notify_refusal)
    worker.task(task_type="inserer_BD")(inserer_BD)
    worker.task(task_type="authentification")(authentification)
    worker.task(task_type="notification_refus_inscription")(
        notification_refus_inscription
    )
    print("Worker démarré, en attente de tâches...", flush=True)

    await worker.work()


if __name__ == "__main__":
    asyncio.run(main())
