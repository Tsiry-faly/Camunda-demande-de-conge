import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
    <div className="page page--center">
        <div className="card">
          <span className="card-eyebrow">Congés</span>
          <h2>Connexion</h2>
          <p className="card-subtitle">Accédez à votre espace employé ou admin.</p>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="field">
              <label htmlFor="login-id">Email (employé) ou identifiant (admin)</label>
              <input
                id="login-id"
                className="input"
                type="text"
                name={`login-id-${fieldSuffix.current}`}
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                onFocus={() => setIdentifiantLocked(false)}
                readOnly={identifiantLocked}
                autoComplete="off"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="login-pwd">Mot de passe</label>
              <input
                id="login-pwd"
                className="input"
                type="password"
                name={`login-pwd-${fieldSuffix.current}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordLocked(false)}  
                readOnly={passwordLocked}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="alert alert-error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p style={{ marginTop: 20, fontSize: 14 }}>
            <Link to="/register">Créer un compte</Link>
          </p>
        </div>
    </div>
  )
}



