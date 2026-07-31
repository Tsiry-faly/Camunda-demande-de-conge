import os
import psycopg2
import psycopg2.extras

DB_CONFIG = {
    "host": os.environ.get("PGHOST", "localhost"),
    "port": os.environ.get("PGPORT", "5432"),
    "dbname": os.environ.get("PGDATABASE", "conges"),
    "user": os.environ.get("PGUSER", "postgres"),
    "password": os.environ.get("PGPASSWORD", "123"),
}


class PGConnection:
    """Wrapper autour de psycopg2 pour retrouver le confort de sqlite3 :
    conn.execute(sql, params).fetchone() / .fetchall() directement sur la
    connexion (comme sqlite3.Connection.execute), plus conn.total_changes
    (utilisé par app.py: reset_soldes)."""

    def __init__(self, conn):
        self._conn = conn
        self._last_cursor = None

    def execute(self, sql, params=()):
        cur = self._conn.cursor()
        cur.execute(sql, params)
        self._last_cursor = cur
        return cur

    def cursor(self):
        return self._conn.cursor()

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()

    @property
    def total_changes(self):
        return self._last_cursor.rowcount if self._last_cursor else 0


def get_connection(dict_rows=True):
    """dict_rows=True  -> accès par nom de colonne, row["nom"] (équivalent
    sqlite3.Row). Utilisé par app.py et auth.py.
    dict_rows=False -> accès positionnel, row[0]. Utilisé par worker.py,
    qui fait uniquement de l'accès par index."""
    cursor_factory = psycopg2.extras.RealDictCursor if dict_rows else None
    conn = psycopg2.connect(**DB_CONFIG, cursor_factory=cursor_factory)
    return PGConnection(conn)
