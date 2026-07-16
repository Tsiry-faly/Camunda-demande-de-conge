import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

// Suffixe aleatoire genere a chaque montage : empeche le navigateur de
// rapprocher ces champs d'identifiants sauvegardes precedemment sous le
// meme name/id.
function randomSuffix() {
  return Math.random().toString(36).slice(2, 10)
}

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const fieldSuffix = useRef(randomSuffix())
  const [identifiantLocked, setIdentifiantLocked] = useState(true)
  const [passwordLocked, setPasswordLocked] = useState(true)

  useEffect(() => {
    setIdentifiant('')
    setPassword('')
    setError('')
    setIdentifiantLocked(true)
    setPasswordLocked(true)
    
    const timeout = setTimeout(() => {
      setIdentifiant('')
      setPassword('')
    }, 150)
    return () => clearTimeout(timeout)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(identifiant, password)
      navigate(data.role === 'admin' ? '/admin' : '/employe')
    } catch (err) {
      setError(err.response?.data?.error || 'Echec de connexion')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div style={{ marginBottom: 12 }}>
          <label>Email (employé) ou identifiant (admin)</label>
          <input
            type="text"
            name={`login-id-${fieldSuffix.current}`}
            value={identifiant}
            onChange={(e) => setIdentifiant(e.target.value)}
            onFocus={() => setIdentifiantLocked(false)}
            readOnly={identifiantLocked}
            autoComplete="off"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Mot de passe</label>
          <input
            type="password"
            name={`login-pwd-${fieldSuffix.current}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordLocked(false)}
            readOnly={passwordLocked}
            autoComplete="new-password"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', color: 'black' }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}


