import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register } from './api'

const DEPARTEMENTS = [
  { value: 'si', label: 'Systèmes Informatiques' },
  { value: 'rh', label: 'Ressources Humaines' },
  { value: 'fc', label: 'Finance / Comptabilité' },
  { value: 'mc', label: 'Marketing / Communication' },
  { value: 'po', label: 'Production / Opérations' },
]

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
      <div style={{ maxWidth: 380, margin: '4rem auto', fontFamily: 'sans-serif' }}>
        <h2>Inscription envoyée</h2>
        <p>
          Votre compte a été créé et est en attente de validation par un administrateur.
          Vous pourrez vous connecter dès qu'il sera approuvé.
        </p>
        <Link to="/login">Retour à la connexion</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 380, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h2>Créer un compte</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Nom</label>
          <input name="nom" value={formData.nom} onChange={handleChange} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Prénom</label>
          <input name="prenom" value={formData.prenom} onChange={handleChange} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Département</label>
          <select name="departement" value={formData.departement} onChange={handleChange} required style={{ width: '100%', padding: 8 }}>
            <option value="">-- Choisir --</option>
            {DEPARTEMENTS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Mot de passe</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Confirmer le mot de passe</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required style={{ width: '100%', padding: 8 }} />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', color: 'black' }}>
          {loading ? 'Envoi...' : "S'inscrire"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/login">Déjà un compte ? Se connecter</Link>
      </p>
    </div>
  )
}