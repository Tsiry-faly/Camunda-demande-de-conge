import { useEffect, useState } from 'react'
import {
  fetchDemandesEnAttente, approuverDemande, refuserDemande,
  fetchInscriptionsEnAttente, validerInscription, refuserInscription,
  fetchEmployes, resetSoldes,
} from './api'
import { useAuth } from './AuthContext'
import { departementLabel } from './departements'

const ONGLETS = [
  { id: 'inscriptions', label: 'Inscriptions en attente' },
  { id: 'demandes', label: 'Demandes de congé en attente' },
  { id: 'employes', label: 'Liste des employés' },
]

export default function AdminApprovalPage() {
  const [demandes, setDemandes] = useState([])
  const [inscriptions, setInscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionEnCours, setActionEnCours] = useState(null)
  const [employes, setEmployes] = useState([])
  const [loadingEmployes, setLoadingEmployes] = useState(false)
  const [ongletActif, setOngletActif] = useState('inscriptions')
  const [resetEnCours, setResetEnCours] = useState(false)
  const { user, logout } = useAuth()

  function charger() {
    setLoading(true)
    Promise.all([fetchDemandesEnAttente(), fetchInscriptionsEnAttente()])
      .then(([d, i]) => {
        setDemandes(d)
        setInscriptions(i)
      })
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  function chargerEmployes() {
    setLoadingEmployes(true)
    fetchEmployes()
      .then(setEmployes)
      .catch((err) => console.error(err))
      .finally(() => setLoadingEmployes(false))
  }

  async function handleResetSoldes() {
    if (!window.confirm('Réinitialiser le solde de tous les employés actifs à 25 jours ?')) {
      return
    }
    setResetEnCours(true)
    try {
      await resetSoldes()
      chargerEmployes()
    } finally {
      setResetEnCours(false)
    }
  }   

  useEffect(() => {
    if (ongletActif === 'employes' && employes.length === 0) {
      chargerEmployes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongletActif])

  async function traiter(demande, decision) {
    setActionEnCours(`demande-${demande.id}`)
    try {
      if (decision === 'approuve') {
        await approuverDemande(demande.task_id, demande.process_instance_key)
      } else {
        await refuserDemande(demande.task_id, demande.process_instance_key)
      }
      charger()
    } finally {
      setActionEnCours(null)
    }
  }

  async function traiterInscription(inscription, decision) {
    setActionEnCours(`inscription-${inscription.id}`)
    try {
      if (decision === 'valider') {
        await validerInscription(inscription.id)
      } else {
        await refuserInscription(inscription.id)
      }
      charger()
    } finally {
      setActionEnCours(null)
    }
  }

  return (
    <div className="page">
      <div className="workspace" style={{ maxWidth: 760 }}>
        <div className="topbar">
          <div>
            <span className="card-eyebrow">Panneau admin</span>
            <h2>Gestion des congés</h2>
          </div>
          <div className="topbar-identity">
            <span className="topbar-avatar">{(user?.nom || '?')[0]?.toUpperCase()}</span>
            <span>{user?.nom}</span>
            <button onClick={logout} className="btn btn-ghost btn-sm">Déconnexion</button>
          </div>
        </div>

        <div className="tabs">
          {ONGLETS.map((onglet) => {
            const actif = ongletActif === onglet.id
            let compteur = null
            if (onglet.id === 'inscriptions') compteur = inscriptions.length
            if (onglet.id === 'demandes') compteur = demandes.length
            return (
              <button
                key={onglet.id}
                onClick={() => setOngletActif(onglet.id)}
                className={`tab${actif ? ' is-active' : ''}`}
              >
                {onglet.label}
                {compteur !== null && !loading && <span className="tab-count">{compteur}</span>}
              </button>
            )
          })}
        </div>

        {loading && <p className="loading-note">Chargement...</p>}

        {!loading && ongletActif === 'inscriptions' && (
          <div className="item-list">
            {inscriptions.length === 0 && (
              <div className="empty-state">Aucune inscription en attente.</div>
            )}
            {inscriptions.map((i) => (
              <div key={i.id} className="item-card">
                <div className="item-body">
                  <p className="item-name">{i.prenom} {i.nom}</p>
                  <p className="item-meta">{departementLabel(i.departement)}</p>
                  <p className="item-meta">{i.email}</p>
                  <span className="badge badge-pending" style={{ marginTop: 8 }}>En attente</span>
                </div>
                <div className="item-actions">
                  <button
                    disabled={actionEnCours === `inscription-${i.id}`}
                    onClick={() => traiterInscription(i, 'valider')}
                    className="btn btn-approve btn-sm"
                  >
                    Valider
                  </button>
                  <button
                    disabled={actionEnCours === `inscription-${i.id}`}
                    onClick={() => traiterInscription(i, 'refuser')}
                    className="btn btn-refuse btn-sm"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && ongletActif === 'demandes' && (
          <div className="item-list">
            {demandes.length === 0 && (
              <div className="empty-state">Aucune demande en attente.</div>
            )}
            {demandes.map((d) => (
              <div key={d.id} className="item-card">
                <div className="item-body">
                  <p className="item-name">{d.employe}</p>
                  <p className="item-meta">{departementLabel(d.departement)}</p>
                  <p className="item-meta">Du {d.date_debut} au {d.date_fin}</p>
                  {d.motif && <p className="item-motif">{d.motif}</p>}
                  <span className="badge badge-pending" style={{ marginTop: 8 }}>En attente</span>
                </div>
                <div className="item-actions">
                  <button
                    disabled={actionEnCours === `demande-${d.id}`}
                    onClick={() => traiter(d, 'approuve')}
                    className="btn btn-approve btn-sm"
                  >
                    Approuver
                  </button>
                  <button
                    disabled={actionEnCours === `demande-${d.id}`}
                    onClick={() => traiter(d, 'refuser')}
                    className="btn btn-refuse btn-sm"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && ongletActif === 'employes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={handleResetSoldes}
                disabled={resetEnCours}
                className="btn btn-ghost btn-sm"
              >
                {resetEnCours ? 'Réinitialisation...' : 'Réinitialiser les soldes (25 j.)'}
              </button>
            </div>
            {loadingEmployes && <p className="loading-note">Chargement...</p>}
            {!loadingEmployes && employes.length === 0 && (
              <div className="empty-state">Aucun employé actif.</div>
            )}

            {!loadingEmployes && employes.length > 0 && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Prénom</th>
                      <th>Département</th>
                      <th style={{ textAlign: 'right' }}>Solde restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employes.map((e) => (
                      <tr key={e.id}>
                        <td>{e.nom}</td>
                        <td>{e.prenom}</td>
                        <td>{departementLabel(e.departement)}</td>
                        <td className="num">{e.conge} j.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}