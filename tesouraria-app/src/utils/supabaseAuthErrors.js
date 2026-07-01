const AUTH_ERROR_MESSAGES_BY_CODE = {
  invalid_credentials: 'Credenciais inválidas. Confirma email e password.',
  user_already_exists: 'Este email já está registado.',
  email_address_invalid: 'O email introduzido não é válido.',
  weak_password: 'A password é fraca. Usa pelo menos 6 caracteres.',
  email_not_confirmed:
    'Email ainda não confirmado. Verifica a tua caixa de correio.',
  signup_disabled: 'Registo de novas contas desativado neste projeto.',
  over_email_send_rate_limit:
    'Demasiadas tentativas. Aguarda alguns minutos e volta a tentar.',
}

const AUTH_ERROR_MESSAGES_BY_TEXT = [
  {
    match: /invalid login credentials/i,
    message: 'Credenciais inválidas. Confirma email e password.',
  },
  {
    match: /user already registered/i,
    message: 'Este email já está registado.',
  },
  {
    match: /password should be at least/i,
    message: 'A password é fraca. Usa pelo menos 6 caracteres.',
  },
  {
    match: /email rate limit exceeded/i,
    message: 'Demasiadas tentativas. Aguarda alguns minutos e volta a tentar.',
  },
  {
    match: /email not confirmed/i,
    message: 'Email ainda não confirmado. Verifica a tua caixa de correio.',
  },
  {
    match: /unable to validate email address/i,
    message: 'O email introduzido não é válido.',
  },
]

export function mapSupabaseAuthError(error) {
  if (!error) {
    return 'Ocorreu um erro inesperado. Tenta novamente.'
  }

  if (error.code && AUTH_ERROR_MESSAGES_BY_CODE[error.code]) {
    return AUTH_ERROR_MESSAGES_BY_CODE[error.code]
  }

  const message = error.message || error.error_description || ''
  const matched = AUTH_ERROR_MESSAGES_BY_TEXT.find((entry) => entry.match.test(message))
  if (matched) {
    return matched.message
  }

  if (message) {
    return `Erro Supabase: ${message}`
  }

  return 'Ocorreu um erro inesperado. Tenta novamente.'
}

export function mapSupabaseSaveError(error) {
  if (!error) {
    return 'Não foi possível guardar. Tenta novamente.'
  }
  if (error.code === '42501' || /row-level security/i.test(error.message || '')) {
    return 'Sem permissão no Supabase para guardar este registo. Confirma as policies (RLS).'
  }
  if (error.code === '23505') {
    return 'Já existe um registo com estes dados.'
  }
  if (error.code === '23503') {
    return 'Referência inválida (registo associado não existe).'
  }
  if (error.message) {
    return `Erro Supabase: ${error.message}`
  }
  return 'Não foi possível guardar. Verifica a configuração do Supabase.'
}
