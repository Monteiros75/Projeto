import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isOnboardingAllowedPath } from '../lib/onboarding'

function AuthLoadingScreen({ message = 'A carregar...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
      <p className="text-sm text-[#6B7280]">{message}</p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading, profileLoading, nucleoProfile, onboardingRequired } = useAuth()
  const location = useLocation()

  if (loading && !user) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profileLoading && !nucleoProfile) {
    return <AuthLoadingScreen message="A preparar a conta do núcleo..." />
  }

  if (onboardingRequired && !isOnboardingAllowedPath(location.pathname)) {
    return <Navigate to="/configuracoes/perfil" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
