function hasRequiredProfileFields(profile) {
  return Boolean(
    profile.nomeNucleo?.trim() &&
      profile.nomeTesoureiro?.trim() &&
      profile.nomePresidente?.trim() &&
      profile.dataReferenciaSaldos,
  )
}

/** Perfil pronto para usar folhas, fecho, etc. */
export function isProfileConfigured(profile) {
  if (!profile) return false
  if (profile.onboardingCompleto) return true
  return hasRequiredProfileFields(profile)
}

export function isOnboardingRequired(userId, profileLoading, profile) {
  return Boolean(userId) && !profileLoading && !isProfileConfigured(profile)
}

/** Rotas acessiveis antes de concluir a configuracao inicial. */
export const ONBOARDING_ALLOWED_PATHS = ['/configuracoes/perfil', '/ajuda']

export function isOnboardingAllowedPath(pathname) {
  return ONBOARDING_ALLOWED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}
