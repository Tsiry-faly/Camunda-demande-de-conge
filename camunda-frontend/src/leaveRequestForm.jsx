import { useState } from 'react'
import { submitLeaveRequest } from './api'

const initialState = {
  nom: '',
  prenom: '',
  departement: '',
  dateDebut: '',
  dateFin: '',
  motif: '',
}

export default function LeaveRequestForm() {
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
      setErrorMessage(err.message || 'Une erreur est survenue.')
      console.error(err)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>Demande de congé</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Nom</label>
          <input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Prénom</label>
          <input
            type="text"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Département</label>
          <select
            name="departement"
            value={formData.departement}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          >
            <option value="">-- Sélectionner --</option>
            <option value="IT">RH</option>
            <option value="Marketing">Finance et comptabilite</option>
            <option value="RH">Marketing et communication</option>
            <option value="Finance">Production & operation</option>
            <option value="Finance">Service informatique</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Date de début</label>
          <input
            type="date"
            name="dateDebut"
            value={formData.dateDebut}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Date de fin</label>
          <input
            type="date"
            name="dateFin"
            value={formData.dateFin}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
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

        <button type="submit" disabled={status === 'loading'} style={{ padding: '10px 20px', color: "black" }}>
          {status === 'loading' ? 'Envoi en cours...' : 'Soumettre la demande'}
        </button>
      </form>

      {status === 'success' && (
        <p style={{ color: 'green', marginTop: 16 }}>
           Demande soumise avec succès ! (Instance : {instanceKey})
        </p>
      )}

      {status === 'error' && (
        <p style={{ color: 'red', marginTop: 16 }}> Erreur : {errorMessage}</p>
      )}
    </div>
  )
}