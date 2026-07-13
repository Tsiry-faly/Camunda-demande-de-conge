"""
A lancer UNE FOIS depuis la racine du repo (là où se trouve conges.db) :
    python migration_add_auth.py
"""

import sqlite3
from werkzeug.security import generate_password_hash

DB_PATH = "conges.db"


def colonne_existe(cur, table, colonne):
    return colonne in [row[1] for row in cur.execute(f"PRAGMA table_info({table})")]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not colonne_existe(cur, "employes", "email"):
        cur.execute("ALTER TABLE employes ADD COLUMN email TEXT")
    if not colonne_existe(cur, "employes", "password_hash"):
        cur.execute("ALTER TABLE employes ADD COLUMN password_hash TEXT")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)

    # Lien demande <-> process Camunda, pour retrouver la tache d'approbation
    cur.execute("""
        CREATE TABLE IF NOT EXISTS demandes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employe_id INTEGER NOT NULL,
            date_debut TEXT NOT NULL,
            date_fin TEXT NOT NULL,
            motif TEXT,
            process_instance_key TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employe_id) REFERENCES employes(id)
        )
    """)
    conn.commit()

    # Mot de passe par defaut pour les employes existants (nom.prenom / changeme123)
    cur.execute("SELECT id, nom, prenom FROM employes WHERE password_hash IS NULL")
    employes_sans_mdp = cur.fetchall()
    for emp_id, nom, prenom in employes_sans_mdp:
        email = f"{prenom.lower()}.{nom.lower()}@entreprise.com"
        cur.execute(
            "UPDATE employes SET password_hash = ?, email = COALESCE(email, ?) WHERE id = ?",
            (generate_password_hash("changeme123"), email, emp_id),
        )
        print(f"  -> {prenom} {nom} : email={email} / mot de passe=changeme123")

    cur.execute("SELECT COUNT(*) FROM admins")
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
            ("admin", generate_password_hash("admin123")),
        )
        print("Compte admin cree -> username: admin / mot de passe: admin123")

    conn.commit()
    conn.close()
    print("Migration terminee.")


if __name__ == "__main__":
    migrate()
