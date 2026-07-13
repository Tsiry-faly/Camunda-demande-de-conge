import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth()

  if (loading) return <p>Chargement...</p>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/employe'} replace />
  }

  return children
}
