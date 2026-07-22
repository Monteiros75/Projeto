/**
 * Rotas autenticadas: redireciona para login, para a home do outro papel
 * (nucleo vs concelho fiscal) ou para o onboarding do nucleo quando aplicavel.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isOnboardingAllowedPath } from '../lib/onboarding'

const HOME_BY_TYPE = {
  nucleo: '/dashboard',
  concelho: '/concelho',
}

function AuthLoadingScreen({ message = 'A carregar...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] p-8">
      <p className="text-sm text-[#6B7280]">{message}</p>
    </div>
  )
}

function ProtectedRoute({ children, allow = 'nucleo' }) {
  const {
    user,
    loading,
    profileLoading,
    nucleoProfile,
    concelhoProfile,
    principalType,
    onboardingRequired,
  } = useAuth()
  const location = useLocation()

  if (loading && !user) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profileLoading && !nucleoProfile && !concelhoProfile) {
    return <AuthLoadingScreen message="A preparar a conta..." />
  }

  if (principalType && principalType !== allow) {
    return <Navigate to={HOME_BY_TYPE[principalType] || '/login'} replace />
  }

  if (allow === 'nucleo' && onboardingRequired && !isOnboardingAllowedPath(location.pathname)) {
    return <Navigate to="/configuracoes/perfil" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
