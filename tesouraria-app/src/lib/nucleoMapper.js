/** Converte a linha (snake_case) da tabela `nucleos` para o formato usado na UI (camelCase). */
export function mapNucleoFromDb(row) {
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
