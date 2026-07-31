"""
Crée le schéma complet sur Postgres (remplace init_db.py + migration_add_auth.py
de la version SQLite : comme on repart d'une base neuve, pas besoin de migration
incrémentale, tout le schéma final est créé en une fois).
"""

from werkzeug.security import generate_password_hash
from db import get_connection

conn = get_connection()

conn.execute("""
CREATE TABLE IF NOT EXISTS employes (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    departement TEXT NOT NULL,
    conge INTEGER NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT,
    statut TEXT NOT NULL DEFAULT 'actif'
)
""")

conn.execute("""
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
)
""")

conn.execute("""
CREATE TABLE IF NOT EXISTS demandes (
    id SERIAL PRIMARY KEY,
    employe_id INTEGER NOT NULL REFERENCES employes(id),
    date_debut TEXT NOT NULL,
    date_fin TEXT NOT NULL,
    motif TEXT,
    process_instance_key TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    solde_restant INTEGER,
    vu INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")
conn.commit()

# Employés de test (email + mot de passe par défaut, comme dans
# migration_add_auth.py)
employes_test = [
    ("Rakoto", "Tsiry", "si", 15),
    ("Rabe", "Jean", "rh", 3),
    ("Rasoa", "Marie", "fc", 20),
    ("Randria", "Paul", "mc", 0),
    ("Rakoto", "Paul", "po", 30),
]

for nom, prenom, departement, conge in employes_test:
    email = f"{prenom.lower()}.{nom.lower()}@entreprise.com"
    conn.execute(
        """INSERT INTO employes (nom, prenom, departement, conge, email, password_hash, statut)
           VALUES (%s, %s, %s, %s, %s, %s, 'actif')
           ON CONFLICT (email) DO NOTHING""",
        (nom, prenom, departement, conge, email, generate_password_hash("changeme123")),
    )
    print(f"  -> {prenom} {nom} : email={email} / mot de passe=changeme123")

conn.execute(
    """INSERT INTO admins (username, password_hash) VALUES (%s, %s)
       ON CONFLICT (username) DO NOTHING""",
    ("admin", generate_password_hash("admin123")),
)

conn.commit()
conn.close()
print("Base de données Postgres créée avec succès !")
