import { useState } from 'react'
import { submitLeaveRequest } from './api'
import { useAuth } from './AuthContext'

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

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Demande de congé</h2>
        <button onClick={logout} style={{ height: 32 }}>Déconnexion</button>
      </div>

      <p style={{ color: '#555' }}>
        Connecté en tant que <strong>{user?.prenom} {user?.nom}</strong> ({user?.departement})
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <label>Date de début</label>
            <input
              type="date"
              name="dateDebut"
              value={formData.dateDebut}
              onChange={handleChange}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => e.target.showPicker()}
              min={new Date().toISOString().split('T')[0]}
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Date de fin</label>
            <input
              type="date"
              name="dateFin"
              value={formData.dateFin}
              onChange={handleChange}
              onKeyDown={(e) => e.preventDefault()}
              onClick={(e) => e.target.showPicker()}
              min={formData.dateDebut || new Date().toISOString().split('T')[0]}
              required
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Motif</label>
          <textarea
            name="motif"
            value={formData.motif}
            onChange={handleChange}
            rows={3}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <button type="submit" disabled={status === 'loading'} style={{ padding: '10px 20px', color: 'black' }}>
          {status === 'loading' ? 'Envoi en cours...' : 'Soumettre la demande'}
        </button>
      </form>

      {status === 'success' && (
        <p style={{ color: 'green', marginTop: 16 }}>
          Demande soumise avec succès ! (Instance : {instanceKey})
        </p>
      )}

      {status === 'error' && (
        <p style={{ color: 'red', marginTop: 16 }}>Erreur : {errorMessage}</p>
      )}
    </div>
  )
}