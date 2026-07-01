import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isOnboardingRequired } from '../lib/onboarding'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'
import { AuthContext } from './auth-context'

const LOGO_SIGNED_URL_TTL_SECONDS = 60 * 60

function mapNucleoFromDb(row) {
  if (!row) return null
  return {
    id: row.id,
    uid: row.id,
    nomeNucleo: row.nome_nucleo || '',
    associacaoAcademica: row.associacao_academica || '',
    nomeTesoureiro: row.nome_tesoureiro || '',
    nomePresidente: row.nome_presidente || '',
    email: row.email || '',
    emailContacto: row.email_contacto || '',
    role: row.role || 'nucleo_admin',
    temContaBancaria: Boolean(row.tem_conta_bancaria),
    iban: row.iban || '',
    saldoAtualCaixa: Number(row.saldo_atual_caixa || 0),
    saldoAtualBanco: Number(row.saldo_atual_banco || 0),
    dataReferenciaSaldos: row.data_referencia_saldos || '',
    observacoes: row.observacoes || '',
    logoPath: row.logo_path || '',
    logoUrl: '',
    onboardingCompleto: Boolean(row.onboarding_completo),
    ativo: Boolean(row.ativo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapNucleoToDb(profile) {
  const dbRow = {}
  if (profile.nomeNucleo !== undefined) dbRow.nome_nucleo = profile.nomeNucleo
  if (profile.associacaoAcademica !== undefined)
    dbRow.associacao_academica = profile.associacaoAcademica || null
  if (profile.nomeTesoureiro !== undefined) dbRow.nome_tesoureiro = profile.nomeTesoureiro
  if (profile.nomePresidente !== undefined) dbRow.nome_presidente = profile.nomePresidente
  if (profile.email !== undefined) dbRow.email = profile.email
  if (profile.emailContacto !== undefined) dbRow.email_contacto = profile.emailContacto
  if (profile.role !== undefined) dbRow.role = profile.role
  if (profile.temContaBancaria !== undefined) dbRow.tem_conta_bancaria = profile.temContaBancaria
  if (profile.iban !== undefined) dbRow.iban = profile.iban || null
  if (profile.saldoAtualCaixa !== undefined) dbRow.saldo_atual_caixa = profile.saldoAtualCaixa
  if (profile.saldoAtualBanco !== undefined) dbRow.saldo_atual_banco = profile.saldoAtualBanco
  if (profile.dataReferenciaSaldos !== undefined)
    dbRow.data_referencia_saldos = profile.dataReferenciaSaldos || null
  if (profile.observacoes !== undefined) dbRow.observacoes = profile.observacoes
  if (profile.logoPath !== undefined) dbRow.logo_path = profile.logoPath
  if (profile.onboardingCompleto !== undefined)
    dbRow.onboarding_completo = profile.onboardingCompleto
  if (profile.ativo !== undefined) dbRow.ativo = profile.ativo
  return dbRow
}

async function resolveLogoSignedUrl(logoPath) {
  if (!logoPath) return ''
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(logoPath, LOGO_SIGNED_URL_TTL_SECONDS)
  if (error) {
    console.error(error)
    return ''
  }
  return data?.signedUrl || ''
}

function isDuplicateNucleoError(error) {
  if (!error) return false
  const code = error.code || ''
  const status = error.status || error.statusCode
  return (
    code === '23505' ||
    status === 409 ||
    /duplicate key|already exists|conflict/i.test(error.message || '')
  )
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nucleoProfile, setNucleoProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const syncPromisesRef = useRef(new Map())
  const profileLoadedRef = useRef(false)

  const ensureNucleoProfile = useCallback(async (sessionUser) => {
    if (!sessionUser?.id) return

    const { data: existing, error: selectError } = await supabase
      .from('nucleos')
      .select('id')
      .eq('id', sessionUser.id)
      .maybeSingle()

    if (selectError) throw selectError
    if (existing) return

    const meta = sessionUser.user_metadata || {}
    const insertPayload = {
      id: sessionUser.id,
      ...mapNucleoToDb({
        nomeNucleo: meta.nome_nucleo || meta.nomeNucleo || 'Núcleo',
        email: sessionUser.email || meta.email || '',
        role: 'nucleo_admin',
        onboardingCompleto: false,
        temContaBancaria: false,
        saldoAtualCaixa: 0,
        saldoAtualBanco: 0,
        ativo: true,
      }),
    }

    const { error: insertError } = await supabase.from('nucleos').insert(insertPayload)
    if (insertError && !isDuplicateNucleoError(insertError)) throw insertError
  }, [])

  const loadNucleoProfile = useCallback(async (uid, options = {}) => {
    const { silent = false } = options
    if (!uid) {
      setNucleoProfile(null)
      profileLoadedRef.current = false
      setProfileLoading(false)
      return
    }

    if (!silent) {
      setProfileLoading(true)
    }
    try {
      const { data, error } = await supabase
        .from('nucleos')
        .select('*')
        .eq('id', uid)
        .maybeSingle()

      if (error) throw error

      const mapped = mapNucleoFromDb(data)
      if (mapped?.logoPath) {
        mapped.logoUrl = await resolveLogoSignedUrl(mapped.logoPath)
      }
      setNucleoProfile(mapped)
      if (mapped) profileLoadedRef.current = true
    } catch (profileError) {
      console.error(profileError)
      setNucleoProfile(null)
      profileLoadedRef.current = false
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const syncSessionUser = useCallback(
    async (sessionUser, options = {}) => {
      if (!sessionUser?.id) return

      const uid = sessionUser.id
      if (syncPromisesRef.current.has(uid)) {
        return syncPromisesRef.current.get(uid)
      }

      const task = (async () => {
        try {
          await ensureNucleoProfile(sessionUser)
        } catch (error) {
          if (!isDuplicateNucleoError(error)) {
            console.error('Erro ao criar perfil do nucleo:', error)
          }
        } finally {
          await loadNucleoProfile(uid, options)
        }
      })()

      syncPromisesRef.current.set(uid, task)
      try {
        await task
      } finally {
        syncPromisesRef.current.delete(uid)
      }
    },
    [ensureNucleoProfile, loadNucleoProfile],
  )

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        if (cancelled) return
        const sessionUser = data?.session?.user ?? null
        setUser(sessionUser)
        if (sessionUser?.id) {
          void syncSessionUser(sessionUser)
        } else {
          setNucleoProfile(null)
          setProfileLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Falha ao obter sessao Supabase:', err)
          setUser(null)
          setNucleoProfile(null)
          setProfileLoading(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      const sessionUser = session?.user ?? null

      if (event === 'TOKEN_REFRESHED') {
        if (sessionUser) setUser(sessionUser)
        setLoading(false)
        return
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setNucleoProfile(null)
        profileLoadedRef.current = false
        setProfileLoading(false)
        setLoading(false)
        return
      }

      setUser(sessionUser)
      if (sessionUser?.id) {
        const silent = profileLoadedRef.current || event !== 'SIGNED_IN'
        void syncSessionUser(sessionUser, { silent })
      } else {
        setNucleoProfile(null)
        profileLoadedRef.current = false
        setProfileLoading(false)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [syncSessionUser])

  const value = useMemo(
    () => ({
      user,
      loading,
      nucleoProfile,
      profileLoading,
      onboardingRequired: isOnboardingRequired(user?.id, profileLoading, nucleoProfile),
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          await ensureNucleoProfile(data.user)
        }
        return data
      },
      registerNucleo: async ({ email, password, nomeNucleo }) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nome_nucleo: nomeNucleo, email },
            emailRedirectTo: `${window.location.origin}/configuracoes/perfil`,
          },
        })
        if (error) throw error

        const newUser = data.user
        if (!newUser?.id) {
          throw new Error('Registo concluido mas sem utilizador. Tenta novamente.')
        }

        // Com confirmacao de email activa nao ha sessao — perfil e criado apos confirmar e entrar.
        if (data.session) {
          const insertPayload = {
            id: newUser.id,
            ...mapNucleoToDb({
              nomeNucleo,
              email,
              role: 'nucleo_admin',
              onboardingCompleto: false,
              temContaBancaria: false,
              saldoAtualCaixa: 0,
              saldoAtualBanco: 0,
              ativo: true,
            }),
          }

          const { error: insertError } = await supabase.from('nucleos').insert(insertPayload)
          if (insertError) throw insertError
        }

        return { ...data, needsEmailConfirmation: !data.session }
      },
      saveNucleoProfile: async (profileData, options = {}) => {
        if (!user?.id) throw new Error('Utilizador não autenticado.')

        const payload = {
          id: user.id,
          ...mapNucleoToDb(profileData),
        }

        if (options.markOnboardingComplete !== false) {
          payload.onboarding_completo = true
        }

        const { error } = await supabase
          .from('nucleos')
          .upsert(payload, { onConflict: 'id' })

        if (error) throw error

        await loadNucleoProfile(user.id, { silent: true })
      },
      refreshNucleoProfile: () => loadNucleoProfile(user?.id, { silent: true }),
      requestPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/recuperar-password`,
        })
        if (error) throw error
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
      },
      logout: async () => {
        profileLoadedRef.current = false
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [user, loading, nucleoProfile, profileLoading, loadNucleoProfile, ensureNucleoProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
