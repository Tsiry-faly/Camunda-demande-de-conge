import sqlite3

DB_PATH = "conges.db"


def colonne_existe(cur, table, colonne):
    return colonne in [row[1] for row in cur.execute(f"PRAGMA table_info({table})")]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Statut final de la demande, mis a jour par le worker (refus solde) ou
    # par l'admin (approbation/refus) une fois le processus termine.
    if not colonne_existe(cur, "demandes", "statut"):
        cur.execute(
            "ALTER TABLE demandes ADD COLUMN statut TEXT NOT NULL DEFAULT 'en_attente'"
        )

    # Solde restant au moment d'un refus automatique, pour l'afficher dans
    # la notification employe.
    if not colonne_existe(cur, "demandes", "solde_restant"):
        cur.execute("ALTER TABLE demandes ADD COLUMN solde_restant INTEGER")

    # 0 tant que l'employe n'a pas vu la notification de resultat, 1 une
    # fois qu'il l'a fermee cote frontend.
    if not colonne_existe(cur, "demandes", "vu"):
        cur.execute("ALTER TABLE demandes ADD COLUMN vu INTEGER NOT NULL DEFAULT 1")
        # Les demandes deja existantes (avant cette migration) sont
        # considerees comme deja vues pour ne pas spammer les employes.

    if not colonne_existe(cur, "demandes", "updated_at"):
        cur.execute("ALTER TABLE demandes ADD COLUMN updated_at TEXT")

    conn.commit()
    conn.close()
    print(
        "Migration terminee : statut / solde_restant / vu / updated_at ajoutes a demandes."
    )


if __name__ == "__main__":
    migrate()
