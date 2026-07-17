import { useState } from 'react'
import { submitLeaveRequest } from './api'
import { useAuth } from './AuthContext'
import { departementLabel } from './departements'

const initialState = {
  dateDebut: '',
  dateFin: '',
  motif: '',
}

export default function LeaveRequestForm() {
  const { user, logout } = useAuth()
  const [formData, setFormData] = useState(initialState)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('')
  const [instanceKey, setInstanceKey] = useState(null)

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