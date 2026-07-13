import { useEffect, useState } from 'react'
import { fetchDemandesEnAttente, approuverDemande, refuserDemande } from './api'
import { useAuth } from './AuthContext'

export default function AdminApprovalPage() {
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionEnCours, setActionEnCours] = useState(null)
  const { user, logout } = useAuth()

  function charger() {
    setLoading(true)
    fetchDemandesEnAttente()
      .then(setDemandes)
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  async function traiter(demande, decision) {
    setActionEnCours(demande.id)
    try {
      if (decision === 'approuve') {
        await approuverDemande(demande.task_id)
      } else {
        await refuserDemande(demande.task_id)
      }
      charger()
    } finally {
      setActionEnCours(null)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Demandes en attente d'approbation</h2>
        <div>
          <span style={{ marginRight: 12 }}>{user?.nom}</span>
          <button onClick={logout}>Déconnexion</button>
        </div>
      </div>

      {loading && <p>Chargement...</p>}
      {!loading && demandes.length === 0 && <p>Aucune demande en attente.</p>}

      {demandes.map((d) => (
        <div key={d.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <p><strong>{d.employe}</strong> — {d.departement}</p>
          <p>Du {d.date_debut} au {d.date_fin}</p>
          {d.motif && <p>{d.motif}</p>}
          <button
            disabled={actionEnCours === d.id}
            onClick={() => traiter(d, 'approuve')}
            style={{ marginRight: 8, padding: '8px 16px', color: 'black' }}
          >
            Approuver
          </button>
          <button
            disabled={actionEnCours === d.id}
            onClick={() => traiter(d, 'refuser')}
            style={{ padding: '8px 16px', color: 'black' }}
          >
            Refuser
          </button>
        </div>
      ))}
    </div>
  )
}
