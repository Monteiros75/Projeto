const TIPO_LABEL = {
  fatura: 'Fatura',
  oficio: 'Ofício',
  extrato_bancario: 'Extrato bancário',
  errata: 'Errata',
  comprovativo_pagamento: 'Comprovativo',
}

function labelTipo(t) {
  return TIPO_LABEL[t] || t
}

function inferBaseDocumentType(path) {
  const ref = String(path || '').toLowerCase()
  if (ref.includes('errata-')) return 'errata'
  if (ref.includes('oficio-')) return 'oficio'
  return 'fatura'
}

function movimentoDescricao(m) {
  return (m.descricao || m.numero_documento || 'Sem descrição').trim()
}

/** Lista tudo o que deve ir em papel para a contabilidade */
export function buildEntregaItems({
  monthRef,
  movimentos,
  fecho,
  extras,
  modelos,
  movimentoIdsComModelo,
  signedUrls = {},
  temContaBancaria = true,
}) {
  const items = []
  const modelosPorMovimento = new Map(
    (modelos || []).filter((m) => m.movimento_id).map((m) => [m.movimento_id, m]),
  )
  const modelosUsados = new Set()

  items.push({
    id: 'folha-caixa',
    grupo: 'folhas',
    label: 'Folha de controlo de caixa',
    printUrl: `/folha-caixa?mes=${monthRef}&imprimir=1`,
  })
  if (temContaBancaria) {
    items.push({
      id: 'folha-banco',
      grupo: 'folhas',
      label: 'Folha de controlo bancária',
      printUrl: `/folha-bancaria?mes=${monthRef}&imprimir=1`,
    })
  }

  if (temContaBancaria && fecho?.extrato_path) {
    items.push({
      id: `fecho-${monthRef}-extrato`,
      grupo: 'documentos',
      label: 'Extrato bancário (fecho mensal)',
      viewUrl: signedUrls[`fecho-${monthRef}-extrato`] || null,
    })
  }

  for (const m of movimentos || []) {
    const desc = movimentoDescricao(m)

    if (m.fatura_ou_oficio_path) {
      items.push({
        id: `mov-${m.id}-fatura`,
        grupo: 'documentos',
        label: desc,
        detail: labelTipo(inferBaseDocumentType(m.fatura_ou_oficio_path)),
        viewUrl: signedUrls[`mov-${m.id}-fatura`] || null,
      })
    } else if (movimentoIdsComModelo.has(m.id)) {
      const modelo = modelosPorMovimento.get(m.id)
      if (modelo) {
        modelosUsados.add(modelo.id)
        items.push({
          id: `modelo-${modelo.id}`,
          grupo: 'documentos',
          label: modelo.titulo || desc,
          detail: labelTipo(modelo.modelo),
          printUrl: `/documentos/modelo/${modelo.id}`,
        })
      }
    }

    if (temContaBancaria && m.tipo_conta === 'banco' && m.comprovativo_banco_path) {
      items.push({
        id: `mov-${m.id}-comp`,
        grupo: 'documentos',
        label: desc,
        detail: 'Comprovativo bancário',
        viewUrl: signedUrls[`mov-${m.id}-comp`] || null,
      })
    }
  }

  for (const row of extras || []) {
    items.push({
      id: `extra-${row.id}`,
      grupo: 'documentos',
      label: row.titulo || labelTipo(row.tipo_documento),
      detail: labelTipo(row.tipo_documento),
      viewUrl: signedUrls[`extra-${row.id}`] || null,
    })
  }

  for (const row of modelos || []) {
    if (modelosUsados.has(row.id)) continue
    items.push({
      id: `modelo-${row.id}`,
      grupo: 'documentos',
      label: row.titulo || (row.modelo === 'oficio' ? 'Ofício' : 'Errata'),
      detail: labelTipo(row.modelo),
      printUrl: `/documentos/modelo/${row.id}`,
    })
  }

  return items
}

export function entregaStorageKey(userId, monthRef) {
  return `entrega-impressa:${userId}:${monthRef}`
}

export function loadPrintedFromStorage(userId, monthRef) {
  if (!userId || !monthRef) return {}
  try {
    const raw = localStorage.getItem(entregaStorageKey(userId, monthRef))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function savePrintedToStorage(userId, monthRef, state) {
  if (!userId || !monthRef) return
  localStorage.setItem(entregaStorageKey(userId, monthRef), JSON.stringify(state))
}

export function countPrinted(items, printed) {
  const total = items.length
  const done = items.filter((it) => printed[it.id]).length
  return { total, done, complete: total > 0 && done === total }
}
