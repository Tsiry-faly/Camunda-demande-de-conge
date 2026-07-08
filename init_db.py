import sqlite3

# Créer la nouvelle base de données
conn = sqlite3.connect("conges.db")
cursor = conn.cursor()

# Créer la table avec la bonne structure
cursor.execute("""
CREATE TABLE employes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    departement TEXT NOT NULL,
    conge INTEGER NOT NULL
)
""")

# Insérer les données de test
employes_test = [
    ("Rakoto", "Tsiry", "si", 15),
    ("Rabe", "Jean", "rh", 3),
    ("Rasoa", "Marie", "fc", 20),
    ("Randria", "Paul", "mc", 0),
    ("Rakoto", "Paul", "po", 30),
]

cursor.executemany(
    "INSERT INTO employes (nom, prenom, departement, conge) VALUES (?, ?, ?, ?)",
    employes_test,
)

# Valider et fermer la connexion
conn.commit()
conn.close()

print("Base de données créée avec succès !")
