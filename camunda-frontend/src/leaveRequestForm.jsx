import { useEffect, useState } from 'react'
import { submitLeaveRequest, fetchMesNotifications, marquerNotificationVue } from './api'
import { useAuth } from './AuthContext'
import { departementLabel } from './departements'

const initialState = {
  dateDebut: '',
  dateFin: '',
  motif: '',
}

// Toutes les 5s, on demande au backend si une demande a ete tranchee
// (refus automatique par manque de solde, refus admin, ou approbation).
const INTERVALLE_NOTIFICATIONS_MS = 5000

const NOTIFICATION_CONFIG = {
  approuve: {
    type: 'success',
    titre: 'Demande approuvée',
    texte: (n) => `Votre demande du ${n.date_debut} au ${n.date_fin} a été approuvée.`,
  },
  refuse_admin: {
    type: 'error',
    titre: 'Demande refusée',
    texte: (n) => `Votre demande du ${n.date_debut} au ${n.date_fin} a été refusée par votre manager.`,
  },
  refuse_solde: {
    type: 'error',
    titre: 'Demande refusée automatiquement',
    texte: (n) =>
      `Solde de congés insuffisant pour la demande du ${n.date_debut} au ${n.date_fin}` +
      (n.solde_restant != null ? ` (il vous reste ${n.solde_restant} jour(s)).` : '.'),
  },
}

export default function LeaveRequestForm() {
  const { user, logout } = useAuth()
  const [formData, setFormData] = useState(initialState)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('')
  const [instanceKey, setInstanceKey] = useState(null)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    let annule = false

    async function verifier() {
      try {
        const data = await fetchMesNotifications()
        if (!annule && data.length > 0) {
          // Evite de dupliquer un toast deja affiche (avant que l'utilisateur
          // ne l'ait ferme, ce qui declenche le marquage "vu" cote serveur).
          setNotifications((prev) => {
            const idsConnus = new Set(prev.map((n) => n.id))
            const nouvelles = data.filter((n) => !idsConnus.has(n.id))
            return nouvelles.length > 0 ? [...prev, ...nouvelles] : prev
          })
        }
      } catch (err) {
        console.error('Erreur lors de la vérification des notifications', err)
      }
    }

    verifier()
    const intervalId = setInterval(verifier, INTERVALLE_NOTIFICATIONS_MS)
    return () => {
      annule = true
      clearInterval(intervalId)
    }
  }, [])

  async function fermerNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await marquerNotificationVue(id)
    } catch (err) {
      console.error('Erreur lors du marquage de la notification comme vue', err)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const key = await submitLeaveRequest(formData)
      setInstanceKey(key)
      setStatus('success')
      setFormData(initialState)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.response?.data?.error || 'Une erreur est survenue.')
      console.error(err)
    }
  }

  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase()

  return (
    <div className="page">
      {notifications.length > 0 && (
        <div className="notification-stack">
          {notifications.map((n) => {
            const config = NOTIFICATION_CONFIG[n.statut]
            if (!config) return null
            return (
              <div key={n.id} className={`notification-toast ${config.type}`}>
                <div className="notification-toast-body">
                  <p className="notification-toast-title">{config.titre}</p>
                  <p className="notification-toast-text">{config.texte(n)}</p>
                </div>
                <button
                  className="notification-toast-close"
                  onClick={() => fermerNotification(n.id)}
                  aria-label="Fermer la notification"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="workspace">
        <div className="topbar">
          <div>
            <span className="card-eyebrow">Espace employé</span>
            <h2>Demande de congé</h2>
          </div>
          <button onClick={logout} className="btn btn-ghost btn-sm">Déconnexion</button>
        </div>

        <div className="card">
          <div className="topbar-identity" style={{ marginBottom: 24 }}>
            <span className="topbar-avatar">{initiales || '?'}</span>
            <span>
              Connecté en tant que <strong style={{ color: 'var(--ink)' }}>{user?.prenom} {user?.nom}</strong> — {departementLabel(user?.departement)}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Date de début</label>
                <input
                  className="input"
                  type="date"
                  name="dateDebut"
                  value={formData.dateDebut}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => e.target.showPicker()}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="field">
                <label>Date de fin</label>
                <input
                  className="input"
                  type="date"
                  name="dateFin"
                  value={formData.dateFin}
                  onChange={handleChange}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => e.target.showPicker()}
                  min={formData.dateDebut || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Motif</label>
              <textarea
                className="input"
                name="motif"
                value={formData.motif}
                onChange={handleChange}
                rows={3}
                placeholder="Précisez le motif de votre demande (optionnel)"
              />
              <span className="field-hint">Votre demande sera vérifiée automatiquement, puis transmise à votre manager.</span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={status === 'loading'} style={{ marginTop: 8 }}>
              {status === 'loading' ? 'Envoi en cours...' : 'Soumettre la demande'}
            </button>
          </form>

          {status === 'success' && (
            <p className="alert alert-success">
              Demande soumise avec succès !
            </p>
          )}

          {status === 'error' && (
            <p className="alert alert-error">Erreur : {errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}