import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register } from './api'
import { DEPARTEMENTS } from './departements'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    departement: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      await register({
        nom: formData.nom,
        prenom: formData.prenom,
        departement: formData.departement,
        email: formData.email,
        password: formData.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || "Echec de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="page page--center">
        <div className="workspace" style={{ maxWidth: 440 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <span className="card-eyebrow">Congés</span>
            <h2>Inscription envoyée</h2>
            <p className="card-subtitle" style={{ marginTop: 8 }}>
              Votre compte a été créé et est en attente de validation par un administrateur.
              Vous pourrez vous connecter dès qu'il sera approuvé.
            </p>
            <Link to="/login" className="btn btn-ghost" style={{ marginTop: 4 }}>
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="workspace" style={{ maxWidth: 460 }}>
        <div className="card">
          <span className="card-eyebrow">Congés</span>
          <h2>Créer un compte</h2>
          <p className="card-subtitle">Votre compte sera activé après validation par un administrateur.</p>

          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label>Nom</label>
                <input className="input" name="nom" value={formData.nom} onChange={handleChange} required />
              </div>
              <div className="field">
                <label>Prénom</label>
                <input className="input" name="prenom" value={formData.prenom} onChange={handleChange} required />
              </div>
            </div>
            <div className="field">
              <label>Département</label>
              <select className="input" name="departement" value={formData.departement} onChange={handleChange} required>
                <option value="">-- Choisir --</option>
                {DEPARTEMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Mot de passe</label>
                <input className="input" type="password" name="password" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="field">
                <label>Confirmer</label>
                <input className="input" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            {error && <p className="alert alert-error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Envoi...' : "S'inscrire"}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 14 }}>
            <Link to="/login">Déjà un compte ? Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}