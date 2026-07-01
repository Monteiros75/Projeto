import { formatMonthLabel } from './monthRef'
import { dateToMonthInput } from './mandatoFormat'

export function movimentoNoMandato(movimento, mandatoInicio, mandatoFim) {
  const ref = movimento?.month_ref
  if (!ref) return false
  const ini = dateToMonthInput(mandatoInicio)
  const fim = dateToMonthInput(mandatoFim)
  if (ini && ref < ini) return false
  if (fim && ref > fim) return false
  return true
}

export function resumoMovimentos(movimentos) {
  const receitas = (movimentos || [])
    .filter((m) => m.natureza === 'recebimento')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0)
  const despesas = (movimentos || [])
    .filter((m) => m.natureza === 'pagamento')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0)
  return {
    receitas,
    despesas,
    balanco: receitas - despesas,
    total: (movimentos || []).length,
  }
}

export function movimentoParaLinhaDraft(movimento, seccao) {
  const isReceita = movimento.natureza === 'recebimento'
  const descricao = (movimento.descricao || 'Movimento').trim()
  const dataLabel = formatMonthLabel(movimento.month_ref, { long: true })

  return {
    seccao,
    designacao: descricao,
    data_realizacao: dataLabel,
    despesa_designacao: isReceita ? '' : descricao,
    despesa_valor: isReceita ? 0 : Number(movimento.valor || 0),
    receita_designacao: isReceita ? descricao : '',
    receita_valor: isReceita ? Number(movimento.valor || 0) : 0,
  }
}

export function agruparMovimentosEmLinhas(movimentos, seccao) {
  const grupos = new Map()

  for (const movimento of movimentos || []) {
    const chave = (movimento.descricao || 'Sem descrição').trim().toLowerCase()
    if (!grupos.has(chave)) {
      grupos.set(chave, { descricao: (movimento.descricao || 'Sem descrição').trim(), items: [] })
    }
    grupos.get(chave).items.push(movimento)
  }

  const linhas = []
  for (const { descricao, items } of grupos.values()) {
    const despesas = items.filter((m) => m.natureza === 'pagamento')
    const receitas = items.filter((m) => m.natureza === 'recebimento')
    const despesaTotal = despesas.reduce((acc, m) => acc + Number(m.valor || 0), 0)
    const receitaTotal = receitas.reduce((acc, m) => acc + Number(m.valor || 0), 0)
    const meses = [...new Set(items.map((m) => formatMonthLabel(m.month_ref, { long: true })))]

    linhas.push({
      seccao,
      designacao: descricao,
      data_realizacao: meses.length > 2 ? `${meses.length} meses` : meses.join(', '),
      despesa_designacao: despesaTotal ? descricao : '',
      despesa_valor: despesaTotal,
      receita_designacao: receitaTotal ? descricao : '',
      receita_valor: receitaTotal,
    })
  }

  return linhas
}

function mesApareceNaLinha(monthRef, dataRealizacao) {
  if (!monthRef || !dataRealizacao) return false
  const mesLong = formatMonthLabel(monthRef, { long: true })
  const mesNome = mesLong.split(' ')[0]
  const data = String(dataRealizacao)
  if (data.includes(mesLong)) return true
  if (data.includes(mesNome)) return true
  return false
}

function valoresIguais(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.009
}

function correspondenciaExacta(movimento, linha) {
  const descricao = (movimento.descricao || '').trim()
  const valor = Number(movimento.valor || 0)
  const mes = formatMonthLabel(movimento.month_ref, { long: true })

  if (movimento.natureza === 'recebimento') {
    return (
      valoresIguais(linha.receita_valor, valor) &&
      (linha.receita_designacao || '').trim() === descricao &&
      (linha.data_realizacao || '').includes(mes.split(' ')[0])
    )
  }

  return (
    valoresIguais(linha.despesa_valor, valor) &&
    (linha.despesa_designacao || '').trim() === descricao &&
    (linha.data_realizacao || '').includes(mes.split(' ')[0])
  )
}

function candidatosPorLinha(movimentos, linha, natureza, importados) {
  const descricao = (linha.designacao || '').trim()
  if (!descricao) return []

  const valorLinha =
    natureza === 'recebimento' ? Number(linha.receita_valor || 0) : Number(linha.despesa_valor || 0)
  if (valorLinha <= 0) return []

  const desigColuna =
    natureza === 'recebimento'
      ? (linha.receita_designacao || '').trim()
      : (linha.despesa_designacao || '').trim()
  if (desigColuna && desigColuna !== descricao) return []

  return (movimentos || []).filter(
    (m) =>
      !importados.has(m.id) &&
      m.natureza === natureza &&
      (m.descricao || '').trim() === descricao,
  )
}

function filtrarPorDataLinha(candidatos, dataRealizacao) {
  const data = String(dataRealizacao || '')
  if (!data || /\d+\s*mes(es)?/i.test(data)) return candidatos
  if (data.includes(',')) {
    return candidatos.filter((m) => mesApareceNaLinha(m.month_ref, data))
  }
  return candidatos.filter((m) => mesApareceNaLinha(m.month_ref, data))
}

function encontrarSubsetSoma(movimentos, target) {
  if (!movimentos.length) return null

  function dfs(index, acc, picked) {
    if (valoresIguais(acc, target)) return picked
    if (index >= movimentos.length || acc > target + 0.009) return null

    const com = dfs(index + 1, acc + Number(movimentos[index].valor || 0), [
      ...picked,
      movimentos[index],
    ])
    if (com) return com
    return dfs(index + 1, acc, picked)
  }

  return dfs(0, 0, [])
}

function marcarMovimentosDaLinha(importados, movimentos, linha) {
  for (const natureza of ['pagamento', 'recebimento']) {
    const target =
      natureza === 'recebimento'
        ? Number(linha.receita_valor || 0)
        : Number(linha.despesa_valor || 0)
    if (target <= 0) continue

    const candidatos = filtrarPorDataLinha(
      candidatosPorLinha(movimentos, linha, natureza, importados),
      linha.data_realizacao,
    )
    if (!candidatos.length) continue

    const subset = encontrarSubsetSoma(candidatos, target)
    if (subset) {
      for (const m of subset) importados.add(m.id)
    }
  }
}

/** Conjunto de IDs de movimentos já reflectidos nas linhas do relatório (inclui agrupados). */
export function computeMovimentosImportadosIds(movimentos, linhas) {
  const importados = new Set()
  const allMov = movimentos || []
  const allLinhas = linhas || []

  for (const m of allMov) {
    if (allLinhas.some((linha) => correspondenciaExacta(m, linha))) {
      importados.add(m.id)
    }
  }

  for (const linha of allLinhas) {
    marcarMovimentosDaLinha(importados, allMov, linha)
  }

  return importados
}

export function movimentoProvavelmenteImportado(movimento, linhas, movimentos = null) {
  if (movimentos?.length) {
    return computeMovimentosImportadosIds(movimentos, linhas).has(movimento.id)
  }

  return (linhas || []).some((linha) => correspondenciaExacta(movimento, linha))
}

export function movimentosParaLinhas(movimentos, seccao, { agrupar = false } = {}) {
  if (agrupar) {
    return agruparMovimentosEmLinhas(movimentos, seccao)
  }
  return (movimentos || []).map((m) => movimentoParaLinhaDraft(m, seccao))
}

export function mesesDosMovimentos(movimentos) {
  const meses = new Set()
  for (const m of movimentos || []) {
    if (m.month_ref) meses.add(m.month_ref)
  }
  return [...meses].sort()
}

export function filtrarMovimentos(movimentos, filtros = {}, linhasExistentes = []) {
  const {
    pesquisa = '',
    natureza = 'todos',
    conta = 'todos',
    mes = 'todos',
    ocultarImportados = false,
  } = filtros

  const termo = pesquisa.trim().toLowerCase()
  const importadosIds = computeMovimentosImportadosIds(movimentos, linhasExistentes)

  return (movimentos || []).filter((m) => {
    if (natureza === 'receitas' && m.natureza !== 'recebimento') return false
    if (natureza === 'despesas' && m.natureza !== 'pagamento') return false
    if (conta !== 'todos' && m.tipo_conta !== conta) return false
    if (mes !== 'todos' && m.month_ref !== mes) return false

    if (termo) {
      const haystack = [
        m.descricao,
        m.numero_documento,
        m.tipo_conta,
        m.natureza === 'recebimento' ? 'receita' : 'despesa',
        m.valor,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(termo)) return false
    }

    if (ocultarImportados && importadosIds.has(m.id)) {
      return false
    }

    return true
  })
}
