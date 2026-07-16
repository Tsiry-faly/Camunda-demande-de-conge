import sqlite3

DB_PATH = "conges.db"


def colonne_existe(cur, table, colonne):
    return colonne in [row[1] for row in cur.execute(f"PRAGMA table_info({table})")]


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    if not colonne_existe(cur, "employes", "statut"):
        # Les employes deja presents sont consideres actifs
        cur.execute("ALTER TABLE employes ADD COLUMN statut TEXT NOT NULL DEFAULT 'actif'")

    conn.commit()
    conn.close()
    print("Migration terminee : colonne 'statut' ajoutee a employes.")


if __name__ == "__main__":
    migrate()