import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(identifiant, password)
      navigate(data.role === 'admin' ? '/admin' : '/employe')
    } catch (err) {
      setError(err.response?.data?.error || 'Echec de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h2 style={{marginBottom : 50}}>Connexion</h2>
      <form onSubmit={handleSubmit} style={{alignItems: 'center'}}>
        <div style={{ marginBottom: 12 }}>
          <label>Email ou identifiant</label>
          <input
            type="text"
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', color: 'black' }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p style={{ marginTop: 16 }}>
          <Link to="/register">Créer un compte</Link>
        </p>
      </form>
    </div>
  )
}
