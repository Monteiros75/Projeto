import {
  ArrowUpDown,
  FileStack,
  Grid3X3,
  LayoutList,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AssociarMovimentoPanel from '../components/AssociarMovimentoPanel'
import DocumentPreviewCard from '../components/DocumentPreviewCard'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../hooks/useAuth'
import {
  desligarDocumentoDoMovimento,
  isDocumentoExtraStoragePath,
} from '../lib/associarDocumentoMovimento'
import { currentMonthRef, formatMonthLabel } from '../lib/monthRef'
import MonthRefInput from '../components/MonthRefInput'
import { buildMovimentoLinhaMap } from '../lib/folhaMensal'
import { createSignedUrlForPath, sanitizeFileName } from '../lib/storageSignedUrl'
import { STORAGE_BUCKET, supabase } from '../supabase/supabaseClient'

const TIPO_CONTA_OPTS = [
  { value: 'todos', label: 'Caixa e banco' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'banco', label: 'Banco' },
]

const TIPO_DOC_OPTS = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'fatura', label: 'Fatura' },
  { value: 'oficio', label: 'Ofício' },
  { value: 'extrato_bancario', label: 'Extrato bancário' },
  { value: 'errata', label: 'Errata' },
  { value: 'comprovativo_pagamento', label: 'Comprovativo de pagamento' },
]

const TIPO_DOC_LABEL = {
  fatura: 'Fatura',
  oficio: 'Ofício',
  extrato_bancario: 'Extrato bancário',
  errata: 'Errata',
  comprovativo_pagamento: 'Comprovativo de pagamento',
}

function labelTipoDoc(t) {
  return TIPO_DOC_LABEL[t] || t
}

const SORT_OPTS = [
  { value: 'data_desc', label: 'Data — mais recente' },
  { value: 'data_asc', label: 'Data — mais antiga' },
  { value: 'nome_asc', label: 'Nome — A a Z' },
  { value: 'nome_desc', label: 'Nome — Z a A' },
  { value: 'tipo_asc', label: 'Tipo — A a Z' },
]

function sortItems(list, sortBy) {
  const copy = [...list]
  copy.sort((a, b) => {
    if (sortBy === 'nome_asc') return String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt')
    if (sortBy === 'nome_desc') return String(b.titulo || '').localeCompare(String(a.titulo || ''), 'pt')
    if (sortBy === 'tipo_asc') {
      const ta = labelTipoDoc(a.tipoDocumento)
      const tb = labelTipoDoc(b.tipoDocumento)
      return ta.localeCompare(tb, 'pt') || String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt')
    }
    if (sortBy === 'data_asc') return String(a.dataDoc || '').localeCompare(String(b.dataDoc || ''))
    return String(b.dataDoc || '').localeCompare(String(a.dataDoc || ''))
  })
  return copy
}

function formatDataDoc(dataDoc) {
  if (!dataDoc) return '—'
  const [y, m, d] = String(dataDoc).split('-')
  if (d) return `${d}/${m}/${y}`
  if (m) return `${m}/${y}`
  return dataDoc
}

function inferBaseDocumentType(path) {
  const ref = String(path || '').toLowerCase()
  if (ref.includes('errata-')) return 'errata'
  if (ref.includes('oficio-')) return 'oficio'
  return 'fatura'
}

function movimentoTitulo(m) {
  return (m.descricao || m.numero_documento || 'Sem descrição').trim()
}

function docSubtitle({ tipoDocumento, tipoConta, dataDoc, extra }) {
  const parts = [labelTipoDoc(tipoDocumento)]
  if (tipoConta) parts.push(tipoConta === 'banco' ? 'Banco' : 'Caixa')
  if (dataDoc) parts.push(formatDataDoc(dataDoc))
  if (extra) parts.push(extra)
  return parts.join(' · ')
}

/** PostgREST devolve PGRST205 quando a tabela nao existe no schema cache */
function isMissingDocTablesError(err) {
  if (!err) return false
  const code = String(err.code || '')
  const msg = String(err.message || err.details || '').toLowerCase()
  if (code === '42P01' || code === 'PGRST205') return true
  if (msg.includes('does not exist') && (msg.includes('relation') || msg.includes('table'))) return true
  if (msg.includes('schema cache') && msg.includes('could not find')) return true
  if (
    (msg.includes('documentos_extras') || msg.includes('documentos_modelos')) &&
    (msg.includes('could not find') || msg.includes('does not exist'))
  )
    return true
  return false
}

async function buildDocumentItems({ movimentos, fechos, extras, modelos }) {
  const next = []
  const linhaMap = buildMovimentoLinhaMap(movimentos || [])
  const codigo = (movimentoId) => (movimentoId ? linhaMap.get(movimentoId) || null : null)

  const extraPaths = new Set(
    (extras || [])
      .map((row) => row.storage_path)
      .filter(Boolean),
  )

  for (const m of movimentos) {
    const monthRefItem = m.month_ref || String(m.data || '').slice(0, 7)
    if (m.fatura_ou_oficio_path && !extraPaths.has(m.fatura_ou_oficio_path)) {
      const tipoDocumento = inferBaseDocumentType(m.fatura_ou_oficio_path)
      next.push({
        key: `mov-${m.id}-fatura`,
        source: 'movimento',
        monthRef: monthRefItem,
        tipoDocumento,
        tipoConta: m.tipo_conta,
        titulo: movimentoTitulo(m),
        subtitle: docSubtitle({
          tipoDocumento,
          tipoConta: m.tipo_conta,
          dataDoc: m.data || '',
        }),
        dataDoc: m.data || '',
        path: m.fatura_ou_oficio_path,
        signedUrl: await createSignedUrlForPath(m.fatura_ou_oficio_path),
        movimentoId: m.id,
        codigoMovimento: codigo(m.id),
      })
    }
    if (
      m.tipo_conta === 'banco' &&
      m.comprovativo_banco_path &&
      !extraPaths.has(m.comprovativo_banco_path)
    ) {
      next.push({
        key: `mov-${m.id}-comp`,
        source: 'movimento',
        monthRef: monthRefItem,
        tipoDocumento: 'comprovativo_pagamento',
        tipoConta: 'banco',
        titulo: movimentoTitulo(m),
        subtitle: docSubtitle({
          tipoDocumento: 'comprovativo_pagamento',
          tipoConta: 'banco',
          dataDoc: m.data || '',
        }),
        dataDoc: m.data || '',
        path: m.comprovativo_banco_path,
        signedUrl: await createSignedUrlForPath(m.comprovativo_banco_path),
        movimentoId: m.id,
        codigoMovimento: codigo(m.id),
      })
    }
  }

  for (const fecho of fechos) {
    if (!fecho?.extrato_path) continue
    next.push({
      key: `fecho-${fecho.month_ref}-extrato`,
      source: 'fecho',
      monthRef: fecho.month_ref,
      tipoDocumento: 'extrato_bancario',
      tipoConta: 'banco',
      titulo: `Extrato bancário — ${formatMonthLabel(fecho.month_ref, { long: true })}`,
      subtitle: docSubtitle({
        tipoDocumento: 'extrato_bancario',
        tipoConta: 'banco',
        dataDoc: `${fecho.month_ref}-01`,
        extra: 'Fecho mensal',
      }),
      path: fecho.extrato_path,
      signedUrl: await createSignedUrlForPath(fecho.extrato_path),
    })
  }

  for (const row of extras) {
    const dataExtra = (row.created_at || '').slice(0, 10)
    next.push({
      key: `extra-${row.id}`,
      source: 'extra',
      monthRef: row.month_ref,
      tipoDocumento: row.tipo_documento,
      tipoConta: row.tipo_conta,
      titulo: row.titulo || labelTipoDoc(row.tipo_documento),
      subtitle: docSubtitle({
        tipoDocumento: row.tipo_documento,
        tipoConta: row.tipo_conta,
        dataDoc: dataExtra,
        extra: row.movimento_id ? 'Upload manual · associado' : 'Upload manual',
      }),
      dataDoc: dataExtra,
      path: row.storage_path,
      signedUrl: await createSignedUrlForPath(row.storage_path),
      extraId: row.id,
      movimentoId: row.movimento_id || null,
      codigoMovimento: codigo(row.movimento_id),
    })
  }

  for (const row of modelos) {
    next.push({
      key: `modelo-${row.id}`,
      source: 'modelo',
      monthRef: row.month_ref,
      tipoDocumento: row.modelo,
      tipoConta: row.tipo_conta,
      titulo: row.titulo || (row.modelo === 'oficio' ? 'Ofício' : 'Errata'),
      subtitle: docSubtitle({
        tipoDocumento: row.modelo,
        tipoConta: row.tipo_conta,
        dataDoc: row.data_documento || '',
        extra: 'Modelo',
      }),
      dataDoc: row.data_documento || '',
      modeloId: row.id,
      movimentoId: row.movimento_id || null,
      codigoMovimento: codigo(row.movimento_id),
    })
  }

  return next
}

export default function DocumentosPage() {
  const { user, nucleoProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const mesFromUrl = searchParams.get('mes')
  const [monthRef, setMonthRef] = useState(() => mesFromUrl || currentMonthRef())
  const [filtroConta, setFiltroConta] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [sortBy, setSortBy] = useState('data_desc')
  const [viewMode, setViewMode] = useState('list')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schemaHint, setSchemaHint] = useState('')

  const [showUpload, setShowUpload] = useState(false)
  const [upTitulo, setUpTitulo] = useState('')
  const [upMonthRef, setUpMonthRef] = useState(() => mesFromUrl || currentMonthRef())
  const [upTipoDoc, setUpTipoDoc] = useState('fatura')
  const [upTipoConta, setUpTipoConta] = useState('caixa')
  const [upFile, setUpFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [associarCtx, setAssociarCtx] = useState(null)

  const [editingExtra, setEditingExtra] = useState(null)
  const [editingMovimento, setEditingMovimento] = useState(null)
  const [editFile, setEditFile] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const globalSearch = searchDebounced.length > 0
  const searchPending = search.trim() !== searchDebounced

  useEffect(() => {
    if (mesFromUrl) setMonthRef(mesFromUrl)
  }, [mesFromUrl])

  useEffect(() => {
    if (showUpload) setUpMonthRef(monthRef)
  }, [showUpload, monthRef])

  useEffect(() => {
    const id = setTimeout(() => setSearchDebounced(search.trim()), 350)
    return () => clearTimeout(id)
  }, [search])

  const loadDocuments = useCallback(async () => {
    if (!user?.id) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setSchemaHint('')
    try {
      let movPromise
      let fechosPromise
      let extrasPromise
      let modelosPromise

      if (globalSearch) {
        movPromise = supabase
          .from('movimentos')
          .select('*')
          .eq('nucleo_id', user.id)
          .order('data', { ascending: false })

        fechosPromise = supabase
          .from('fechos_mensais')
          .select('*')
          .eq('nucleo_id', user.id)
          .not('extrato_path', 'is', null)

        extrasPromise = supabase
          .from('documentos_extras')
          .select('*')
          .eq('nucleo_id', user.id)
          .order('created_at', { ascending: false })

        modelosPromise = supabase
          .from('documentos_modelos')
          .select('*')
          .eq('nucleo_id', user.id)
          .order('created_at', { ascending: false })
      } else {
        movPromise = supabase
          .from('movimentos')
          .select('*')
          .eq('nucleo_id', user.id)
          .eq('month_ref', monthRef)
          .order('data', { ascending: true })

        fechosPromise = supabase
          .from('fechos_mensais')
          .select('*')
          .eq('nucleo_id', user.id)
          .eq('month_ref', monthRef)
          .maybeSingle()

        extrasPromise = supabase
          .from('documentos_extras')
          .select('*')
          .eq('nucleo_id', user.id)
          .eq('month_ref', monthRef)
          .order('created_at', { ascending: false })

        modelosPromise = supabase
          .from('documentos_modelos')
          .select('*')
          .eq('nucleo_id', user.id)
          .eq('month_ref', monthRef)
          .order('created_at', { ascending: false })
      }

      const [movRes, fechoRes, extrasRes, modelosRes] = await Promise.all([
        movPromise,
        fechosPromise,
        extrasPromise,
        modelosPromise,
      ])

      if (movRes.error) throw movRes.error
      if (fechoRes.error) throw fechoRes.error

      const extrasErr = extrasRes.error
      const modelosErr = modelosRes.error
      const extrasMissing = isMissingDocTablesError(extrasErr)
      const modelosMissing = isMissingDocTablesError(modelosErr)

      if (extrasMissing || modelosMissing) {
        setSchemaHint(
          'As tabelas documentos_extras / documentos_modelos ainda não existem no teu projeto Supabase (ou o PostgREST ainda não as detetou). No SQL Editor, corre o bloco final do ficheiro supabase/schema.sql (secção Documentos). Se já correste, espera um minuto ou recarrega o schema no painel do Supabase.',
        )
      }
      if (extrasErr && !extrasMissing) throw extrasErr
      if (modelosErr && !modelosMissing) throw modelosErr

      const movimentos = movRes.data || []
      const fechos = globalSearch
        ? fechoRes.data || []
        : fechoRes.data
          ? [fechoRes.data]
          : []
      const extras = extrasMissing ? [] : extrasRes.data || []
      const modelos = modelosMissing ? [] : modelosRes.data || []

      const next = await buildDocumentItems({ movimentos, fechos, extras, modelos })
      setItems(next)
    } catch (e) {
      console.error(e)
      const detail = e?.message || e?.error_description || String(e)
      setError(`Não foi possível carregar os documentos.${detail ? ` (${detail})` : ''}`)
    } finally {
      setLoading(false)
    }
  }, [user?.id, monthRef, globalSearch])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = items.filter((it) => {
      if (globalSearch && term) {
        const haystack = [
          it.titulo,
          it.subtitle,
          it.codigoMovimento,
          labelTipoDoc(it.tipoDocumento),
          it.tipoConta,
          it.monthRef,
          formatMonthLabel(it.monthRef, { long: true }),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
        if (filtroConta !== 'todos' && it.tipoConta !== filtroConta) return false
        return true
      }
      if (filtroConta !== 'todos' && it.tipoConta !== filtroConta) return false
      if (filtroTipo !== 'todos' && it.tipoDocumento !== filtroTipo) return false
      if (term && !String(it.titulo || '').toLowerCase().includes(term)) return false
      return true
    })
    return sortItems(list, sortBy)
  }, [items, filtroConta, filtroTipo, search, sortBy, globalSearch])

  async function handleUpload(e) {
    e.preventDefault()
    if (!user?.id || !upFile) return
    setUploading(true)
    setError('')
    try {
      const id = crypto.randomUUID()
      const path = `${user.id}/${upMonthRef}/documentos-extras/${id}-${sanitizeFileName(upFile.name)}`
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, upFile, { upsert: true })
      if (upErr) throw upErr

      const { error: insErr } = await supabase.from('documentos_extras').insert({
        id,
        nucleo_id: user.id,
        month_ref: upMonthRef,
        tipo_conta: upTipoConta,
        tipo_documento: upTipoDoc,
        storage_path: path,
        titulo: upTitulo.trim() || null,
      })
      if (insErr) throw insErr

      setUpFile(null)
      setUpTitulo('')
      setShowUpload(false)
      await loadDocuments()
      if (upTipoDoc !== 'extrato_bancario') {
        setAssociarCtx({
          documentoExtraId: id,
          storagePath: path,
          tipoDocumento: upTipoDoc,
          tipoConta: upTipoConta,
          monthRef: upMonthRef,
          tituloDocumento: upTitulo.trim() || labelTipoDoc(upTipoDoc),
        })
      }
    } catch (err) {
      console.error(err)
      setError('Falha no upload. Confirma que correste o schema.sql (tabelas documentos_extras).')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteExtra(item) {
    if (!window.confirm('Apagar este documento? Esta ação não pode ser anulada.')) return false
    setError('')
    try {
      if (item.movimentoId) {
        await desligarDocumentoDoMovimento({
          movimentoId: item.movimentoId,
          nucleoId: user.id,
          path: item.path,
          tipoDocumento: item.tipoDocumento,
        })
      }
      const { error: delErr } = await supabase
        .from('documentos_extras')
        .delete()
        .eq('id', item.extraId)
      if (delErr) throw delErr
      if (item.path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([item.path])
      }
      await loadDocuments()
      return true
    } catch (err) {
      console.error(err)
      setError('Não foi possível apagar o documento.')
      return false
    }
  }

  async function handleDeleteModelo(item) {
    if (!window.confirm('Apagar este modelo de ofício/errata?')) return
    setError('')
    try {
      if (item.movimentoId) {
        await desligarDocumentoDoMovimento({
          movimentoId: item.movimentoId,
          nucleoId: user.id,
          tipoDocumento: item.tipoDocumento,
        })
      }
      const { error: delErr } = await supabase
        .from('documentos_modelos')
        .delete()
        .eq('id', item.modeloId)
      if (delErr) throw delErr
      await loadDocuments()
    } catch (err) {
      console.error(err)
      setError('Não foi possível apagar o modelo.')
    }
  }

  async function handleRemoveMovimentoDoc(item) {
    if (
      !window.confirm(
        'Remover este ficheiro do movimento? O movimento mantém-se; podes anexar o ficheiro correto depois.',
      )
    ) {
      return
    }
    if (!user?.id) return
    setError('')
    try {
      const kind = item.key.includes('-comp') ? 'comprovativo' : 'fatura'
      const tipoDocumento =
        kind === 'comprovativo' ? 'comprovativo_pagamento' : item.tipoDocumento || 'fatura'

      await desligarDocumentoDoMovimento({
        movimentoId: item.movimentoId,
        nucleoId: user.id,
        path: item.path,
        tipoDocumento,
      })

      if (item.path && !isDocumentoExtraStoragePath(item.path)) {
        await supabase.storage.from(STORAGE_BUCKET).remove([item.path])
      }
      setEditingMovimento(null)
      await loadDocuments()
    } catch (err) {
      console.error(err)
      setError('Não foi possível remover o ficheiro do movimento.')
    }
  }

  async function handleRemoveFechoExtrato(item) {
    if (
      !window.confirm(
        'Remover o extrato bancário deste fecho? Podes carregar outro depois na página de Fecho Mensal.',
      )
    ) {
      return
    }
    if (!user?.id || !item.monthRef) return
    setError('')
    try {
      const { error: updErr } = await supabase
        .from('fechos_mensais')
        .update({ extrato_path: null })
        .eq('nucleo_id', user.id)
        .eq('month_ref', item.monthRef)
      if (updErr) throw updErr
      if (item.path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([item.path])
      }
      await loadDocuments()
    } catch (err) {
      console.error(err)
      setError('Não foi possível remover o extrato bancário.')
    }
  }

  function openEditExtra(item) {
    setEditFile(null)
    setEditingMovimento(null)
    setEditingExtra({
      id: item.extraId,
      titulo: item.titulo || '',
      tipoDoc: item.tipoDocumento,
      tipoConta: item.tipoConta,
      path: item.path,
      monthRef: item.monthRef || monthRef,
    })
  }

  function openEditMovimento(item) {
    setEditFile(null)
    setEditingExtra(null)
    const kind = item.key.includes('-comp') ? 'comprovativo' : 'fatura'
    setEditingMovimento({
      movimentoId: item.movimentoId,
      kind,
      path: item.path,
      titulo: item.titulo,
      monthRef: item.monthRef || monthRef,
      itemKey: item.key,
    })
  }

  async function handleSaveMovimentoEdit(e) {
    e.preventDefault()
    if (!editingMovimento || !user?.id || !editFile) return
    setSavingEdit(true)
    setError('')
    try {
      const baseTipo = editingMovimento.kind === 'comprovativo' ? 'comprovativo' : inferBaseDocumentType(editFile.name)
      const prefix =
        editingMovimento.kind === 'comprovativo'
          ? `comprovativo-banco-${sanitizeFileName(editFile.name)}`
          : `${baseTipo}-${sanitizeFileName(editFile.name)}`
      const newPath = `${user.id}/${editingMovimento.monthRef}/movimentos/${editingMovimento.movimentoId}/${prefix}`

      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(newPath, editFile, { upsert: true })
      if (upErr) throw upErr

      const column =
        editingMovimento.kind === 'comprovativo' ? 'comprovativo_banco_path' : 'fatura_ou_oficio_path'
      const { error: updErr } = await supabase
        .from('movimentos')
        .update({ [column]: newPath })
        .eq('id', editingMovimento.movimentoId)
        .eq('nucleo_id', user.id)
      if (updErr) throw updErr

      if (newPath !== editingMovimento.path && editingMovimento.path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([editingMovimento.path])
      }

      setEditingMovimento(null)
      setEditFile(null)
      await loadDocuments()
    } catch (err) {
      console.error(err)
      setError('Não foi possível substituir o ficheiro do movimento.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingExtra || !user?.id) return
    setSavingEdit(true)
    setError('')
    try {
      let newPath = editingExtra.path
      if (editFile) {
        newPath = `${user.id}/${editingExtra.monthRef || monthRef}/documentos-extras/${crypto.randomUUID()}-${sanitizeFileName(editFile.name)}`
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(newPath, editFile, { upsert: true })
        if (upErr) throw upErr
      }

      const { error: updErr } = await supabase
        .from('documentos_extras')
        .update({
          titulo: editingExtra.titulo.trim() || null,
          tipo_documento: editingExtra.tipoDoc,
          tipo_conta: editingExtra.tipoConta,
          storage_path: newPath,
        })
        .eq('id', editingExtra.id)
      if (updErr) throw updErr

      if (editFile && newPath !== editingExtra.path && editingExtra.path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([editingExtra.path])
      }

      setEditingExtra(null)
      setEditFile(null)
      await loadDocuments()
    } catch (err) {
      console.error(err)
      setError('Não foi possível guardar as alterações do documento.')
    } finally {
      setSavingEdit(false)
    }
  }

  function renderDocActions(item) {
    const btnClass =
      'rounded-lg p-1.5 text-[#6B7280] hover:bg-[#EFF6FF] hover:text-[#1F6FEB]'
    const delClass =
      'rounded-lg p-1.5 text-[#6B7280] hover:bg-[#FEF2F2] hover:text-[#EF4444]'

    if (item.source === 'extra') {
      return (
        <>
          <button type="button" onClick={() => openEditExtra(item)} className={btnClass} title="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleDeleteExtra(item)} className={delClass} title="Apagar">
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )
    }

    if (item.source === 'movimento' && item.path) {
      return (
        <>
          <button type="button" onClick={() => openEditMovimento(item)} className={btnClass} title="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleRemoveMovimentoDoc(item)}
            className={delClass}
            title="Remover ficheiro"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )
    }

    if (item.source === 'fecho' && item.path) {
      return (
        <button
          type="button"
          onClick={() => handleRemoveFechoExtrato(item)}
          className={delClass}
          title="Remover extrato"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )
    }

    if (item.source === 'modelo') {
      return (
        <button type="button" onClick={() => handleDeleteModelo(item)} className={delClass} title="Apagar">
          <Trash2 className="h-4 w-4" />
        </button>
      )
    }

    return null
  }

  const listGridClass = globalSearch
    ? 'sm:grid-cols-[minmax(0,2fr)_48px_72px_88px_100px_72px_minmax(88px,auto)]'
    : 'sm:grid-cols-[minmax(0,2fr)_48px_88px_100px_72px_minmax(88px,auto)]'

  function renderDocTitle(item) {
    const titleClass =
      'block break-words text-[14px] font-medium leading-snug text-[#111827] line-clamp-3 hover:text-[#1F6FEB] hover:underline'

    if (item.source === 'modelo') {
      return (
        <Link to={`/documentos/modelo/${item.modeloId}`} className={titleClass} title={item.titulo}>
          {item.titulo}
        </Link>
      )
    }
    if (item.signedUrl) {
      return (
        <a
          href={item.signedUrl}
          target="_blank"
          rel="noreferrer"
          className={titleClass}
          title={item.titulo}
        >
          {item.titulo}
        </a>
      )
    }
    return (
      <p className="break-words text-[14px] font-medium leading-snug text-[#111827] line-clamp-3" title={item.titulo}>
        {item.titulo}
      </p>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Documentos"
        description="Ficheiros dos movimentos e fechos, uploads manuais e modelos de ofício ou errata."
      />

      {schemaHint ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          {schemaHint}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[15px] font-semibold text-[#111827]">Consultar documentos</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1F6FEB] px-4 py-2.5 text-[14px] font-medium text-white hover:bg-[#1557C0]"
          >
            {showUpload ? <X className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
            {showUpload ? 'Fechar' : 'Adicionar documento'}
          </button>
          <Link
            to="/documentos/modelo/novo"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-[14px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
          >
            <Plus className="h-4 w-4" />
            Criar ofício ou errata
          </Link>
        </div>
      </div>

      {showUpload ? (
        <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
            <Upload className="h-4 w-4 text-[#6B7280]" />
            Adicionar documento
          </h3>
          <form onSubmit={handleUpload} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280] md:col-span-2">
              Título (opcional)
              <input
                value={upTitulo}
                onChange={(ev) => setUpTitulo(ev.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                placeholder="Ex.: Nota explicativa do mês"
              />
            </label>
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Mês do documento
              <MonthRefInput
                value={upMonthRef}
                onChange={(ev) => setUpMonthRef(ev.target.value)}
                dataReferencia={nucleoProfile?.dataReferenciaSaldos}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
              />
            </label>
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Tipo
              <select
                value={upTipoDoc}
                onChange={(ev) => setUpTipoDoc(ev.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
              >
                {TIPO_DOC_OPTS.filter((o) => o.value !== 'todos').map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
              Conta
              <select
                value={upTipoConta}
                onChange={(ev) => setUpTipoConta(ev.target.value)}
                className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
              >
                <option value="caixa">Caixa</option>
                <option value="banco">Banco</option>
              </select>
            </label>
            <label className="flex flex-col text-[12px] font-medium text-[#6B7280] md:col-span-2">
              Ficheiro
              <input
                type="file"
                required
                onChange={(ev) => setUpFile(ev.target.files?.[0] || null)}
                className="mt-1 text-[14px]"
              />
            </label>
            <div className="flex items-end md:col-span-2 lg:col-span-2">
              <button
                type="submit"
                disabled={uploading || !upFile}
                className="rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-50"
              >
                {uploading ? 'A enviar...' : 'Carregar documento'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex flex-1 flex-col text-[12px] font-medium text-[#6B7280] lg:min-w-[200px]">
            Pesquisar por nome
            <span className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder="Pesquisar em todos os meses e tipos..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-9 pr-3 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
              />
            </span>
          </label>
          <label
            className={`flex flex-col text-[12px] font-medium text-[#6B7280] ${globalSearch ? 'opacity-50' : ''}`}
          >
            Mês
            <MonthRefInput
              value={monthRef}
              disabled={globalSearch}
              onChange={(ev) => setMonthRef(ev.target.value)}
              dataReferencia={nucleoProfile?.dataReferenciaSaldos}
              className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            />
          </label>
          <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
            Conta
            <select
              value={filtroConta}
              onChange={(ev) => setFiltroConta(ev.target.value)}
              className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            >
              {TIPO_CONTA_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label
            className={`flex flex-col text-[12px] font-medium text-[#6B7280] ${globalSearch ? 'opacity-50' : ''}`}
          >
            Tipo de documento
            <select
              value={filtroTipo}
              disabled={globalSearch}
              onChange={(ev) => setFiltroTipo(ev.target.value)}
              className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            >
              {TIPO_DOC_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4">
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#6B7280]">
            <ArrowUpDown className="h-4 w-4 text-[#9CA3AF]" />
            Ordenar por
            <select
              value={sortBy}
              onChange={(ev) => setSortBy(ev.target.value)}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] text-[#111827] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
            >
              {SORT_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] ${
                viewMode === 'list' ? 'bg-white font-medium text-[#1F6FEB] shadow-sm' : 'text-[#6B7280] hover:bg-white'
              }`}
              title="Vista em lista"
            >
              <LayoutList className="h-4 w-4" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] ${
                viewMode === 'grid' ? 'bg-white font-medium text-[#1F6FEB] shadow-sm' : 'text-[#6B7280] hover:bg-white'
              }`}
              title="Vista em grelha"
            >
              <Grid3X3 className="h-4 w-4" />
              Grelha
            </button>
          </div>
        </div>
      </div>

      {search.trim() ? (
        <p className="mb-4 text-[13px] text-[#6B7280]">
          {searchPending || loading ? (
            <>A pesquisar em todos os meses e tipos...</>
          ) : (
            <>
              Pesquisa global — {filtered.length} resultado{filtered.length === 1 ? '' : 's'} em todos os meses.
              Limpa a pesquisa para voltar ao filtro por mês.
            </>
          )}
        </p>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>
      ) : null}

      {associarCtx ? (
        <AssociarMovimentoPanel
          className="mb-8"
          monthRef={associarCtx.monthRef}
          tipoConta={associarCtx.tipoConta}
          tipoDocumento={associarCtx.tipoDocumento}
          storagePath={associarCtx.storagePath}
          documentoExtraId={associarCtx.documentoExtraId}
          documentoModeloId={associarCtx.documentoModeloId}
          tituloDocumento={associarCtx.tituloDocumento}
          onAssociated={() => {
            setAssociarCtx(null)
            loadDocuments()
          }}
          onDismiss={() => setAssociarCtx(null)}
        />
      ) : null}

      {loading ? (
        <p className="text-[14px] text-[#6B7280]">A carregar documentos...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-[#FAFAFA] py-16 text-center">
          <FileStack className="mb-3 h-10 w-10 text-[#9CA3AF]" />
          <p className="text-[14px] text-[#6B7280]">
            {globalSearch
              ? 'Nenhum documento encontrado para esta pesquisa.'
              : 'Nenhum documento para estes filtros neste mês.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] bg-white">
          <div
            className={`hidden min-w-[640px] border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-[12px] font-medium text-[#6B7280] sm:grid sm:gap-3 ${listGridClass}`}
          >
            <span>Nome</span>
            <span>Mov.</span>
            {globalSearch ? <span>Mês</span> : null}
            <span>Data</span>
            <span>Tipo</span>
            <span>Conta</span>
            <span className="text-right">Ações</span>
          </div>
          <ul className="min-w-[640px] divide-y divide-[#E5E7EB]">
            {filtered.map((item) => (
              <li
                key={item.key}
                className={`flex flex-col gap-2 px-4 py-3 sm:grid sm:items-start sm:gap-3 ${listGridClass}`}
              >
                <div className="min-w-0 overflow-hidden">
                  {renderDocTitle(item)}
                  <p className="mt-1 line-clamp-2 break-words text-[12px] leading-relaxed text-[#6B7280] sm:hidden">
                    {globalSearch && item.monthRef
                      ? `${formatMonthLabel(item.monthRef, { long: true })} · `
                      : ''}
                    {item.codigoMovimento ? `${item.codigoMovimento} · ` : ''}
                    {formatDataDoc(item.dataDoc)} · {labelTipoDoc(item.tipoDocumento)} ·{' '}
                    {item.tipoConta === 'banco' ? 'Banco' : 'Caixa'}
                  </p>
                  {item.subtitle ? (
                    <p className="mt-1 hidden line-clamp-1 text-[12px] text-[#9CA3AF] sm:block">
                      {item.subtitle}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#374151] sm:pt-0.5">
                  {item.codigoMovimento ? (
                    <span className="inline-flex rounded bg-[#F3F4F6] px-1.5 py-0.5 text-[12px]">
                      {item.codigoMovimento}
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">—</span>
                  )}
                </span>
                {globalSearch ? (
                  <span className="hidden text-[13px] text-[#374151] sm:block sm:pt-0.5">
                    {item.monthRef ? formatMonthLabel(item.monthRef, { long: true }) : '—'}
                  </span>
                ) : null}
                <span className="hidden whitespace-nowrap text-[13px] text-[#374151] sm:block sm:pt-0.5">
                  {formatDataDoc(item.dataDoc)}
                </span>
                <span className="hidden text-[13px] text-[#374151] sm:block sm:pt-0.5">
                  {labelTipoDoc(item.tipoDocumento)}
                </span>
                <span className="hidden text-[13px] text-[#374151] sm:block sm:pt-0.5">
                  {item.tipoConta === 'banco' ? 'Banco' : 'Caixa'}
                </span>
                <div className="flex flex-wrap items-center gap-1 sm:justify-end sm:pt-0.5">
                  {renderDocActions(item)}
                  {item.source === 'extra' && !item.movimentoId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setAssociarCtx({
                          documentoExtraId: item.extraId,
                          storagePath: item.path,
                          tipoDocumento: item.tipoDocumento,
                          tipoConta: item.tipoConta,
                          monthRef: item.monthRef || monthRef,
                          tituloDocumento: item.titulo,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[12px] font-medium text-[#1F6FEB] hover:bg-[#EFF6FF]"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Associar
                    </button>
                  ) : null}
                  {item.source === 'modelo' && !item.movimentoId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setAssociarCtx({
                          documentoModeloId: item.modeloId,
                          tipoDocumento: item.tipoDocumento,
                          tipoConta: item.tipoConta,
                          monthRef: item.monthRef || monthRef,
                          tituloDocumento: item.titulo,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-[12px] font-medium text-[#1F6FEB] hover:bg-[#EFF6FF]"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Associar
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) =>
            item.source === 'modelo' ? (
              <div
                key={item.key}
                className="flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
              >
                <Link
                  to={`/documentos/modelo/${item.modeloId}`}
                  className="flex flex-1 flex-col transition-shadow hover:shadow-md"
                >
                  <div className="border-b border-[#E5E7EB] bg-[#F0F9FF] px-3 py-2">
                    <p className="text-[13px] font-medium text-[#111827]">{item.titulo}</p>
                    <p className="text-[11px] text-[#6B7280]">
                      {item.codigoMovimento ? `${item.codigoMovimento} · ` : ''}
                      {labelTipoDoc(item.tipoDocumento)} · {item.tipoConta === 'banco' ? 'Banco' : 'Caixa'}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-[#6B7280]">
                    <FileStack className="h-10 w-10 opacity-70" />
                    <span className="text-[12px]">Modelo gerado na app — abre para ver e imprimir.</span>
                  </div>
                </Link>
                <div className="flex border-t border-[#E5E7EB]">
                  {!item.movimentoId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setAssociarCtx({
                          documentoModeloId: item.modeloId,
                          tipoDocumento: item.tipoDocumento,
                          tipoConta: item.tipoConta,
                          monthRef: item.monthRef || monthRef,
                          tituloDocumento: item.titulo,
                        })
                      }
                      className="flex flex-1 items-center justify-center gap-1 py-2 text-[12px] font-medium text-[#1F6FEB] hover:bg-[#F9FAFB]"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Associar a movimento
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteModelo(item)}
                    className={`flex items-center justify-center gap-1 py-2 text-[12px] font-medium text-rose-600 hover:bg-rose-50 ${
                      item.movimentoId ? 'flex-1' : 'border-l border-[#E5E7EB] px-4'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Apagar
                  </button>
                </div>
              </div>
            ) : (
              <div key={item.key} className="flex flex-col">
                <DocumentPreviewCard
                  title={item.titulo}
                  subtitle={
                    [item.codigoMovimento, item.subtitle].filter(Boolean).join(' · ') || item.subtitle
                  }
                  signedUrl={item.signedUrl}
                  fileName={item.path}
                  compact
                  actions={renderDocActions(item)}
                />
                {item.source === 'extra' && !item.movimentoId ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAssociarCtx({
                        documentoExtraId: item.extraId,
                        storagePath: item.path,
                        tipoDocumento: item.tipoDocumento,
                        tipoConta: item.tipoConta,
                        monthRef: item.monthRef || monthRef,
                        tituloDocumento: item.titulo,
                      })
                    }
                    className="-mt-2 flex items-center justify-center gap-1 rounded-b-xl border border-t-0 border-[#E5E7EB] bg-white py-2 text-[12px] font-medium text-[#1F6FEB] hover:bg-[#F9FAFB]"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Associar a movimento
                  </button>
                ) : null}
              </div>
            ),
          )}
        </div>
      )}

      {editingExtra ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#111827]">Editar documento</h3>
              <button
                type="button"
                onClick={() => setEditingExtra(null)}
                className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                Título
                <input
                  value={editingExtra.titulo}
                  onChange={(ev) =>
                    setEditingExtra((prev) => ({ ...prev, titulo: ev.target.value }))
                  }
                  className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                  placeholder="Título do documento"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                  Tipo
                  <select
                    value={editingExtra.tipoDoc}
                    onChange={(ev) =>
                      setEditingExtra((prev) => ({ ...prev, tipoDoc: ev.target.value }))
                    }
                    className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                  >
                    {TIPO_DOC_OPTS.filter((o) => o.value !== 'todos').map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                  Conta
                  <select
                    value={editingExtra.tipoConta}
                    onChange={(ev) =>
                      setEditingExtra((prev) => ({ ...prev, tipoConta: ev.target.value }))
                    }
                    className="mt-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[14px]"
                  >
                    <option value="caixa">Caixa</option>
                    <option value="banco">Banco</option>
                  </select>
                </label>
              </div>
              <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                Substituir ficheiro (opcional)
                <input
                  type="file"
                  onChange={(ev) => setEditFile(ev.target.files?.[0] || null)}
                  className="mt-1 text-[14px]"
                />
                <span className="mt-1 text-[11px] text-[#9CA3AF]">
                  Deixa vazio para manter o ficheiro atual.
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] pt-3">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleDeleteExtra({
                      extraId: editingExtra.id,
                      path: editingExtra.path,
                    })
                    if (ok) setEditingExtra(null)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar documento
                </button>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExtra(null)}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-50"
                >
                  {savingEdit ? 'A guardar...' : 'Guardar'}
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingMovimento ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#111827]">Editar documento</h3>
              <button
                type="button"
                onClick={() => setEditingMovimento(null)}
                className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-[#6B7280]">
              Documento: <strong className="text-[#111827]">{editingMovimento.titulo}</strong>
            </p>
            <p className="mb-4 rounded-lg bg-[#F9FAFB] px-3 py-2 text-[12px] text-[#6B7280]">
              O nome vem da descricao do movimento. Para o alterar, edita o movimento na folha de caixa ou banco.
            </p>
            <form onSubmit={handleSaveMovimentoEdit} className="space-y-3">
              <label className="flex flex-col text-[12px] font-medium text-[#6B7280]">
                Substituir ficheiro (opcional)
                <input
                  type="file"
                  onChange={(ev) => setEditFile(ev.target.files?.[0] || null)}
                  className="mt-1 text-[14px]"
                />
                <span className="mt-1 text-[11px] text-[#9CA3AF]">
                  Escolhe o ficheiro correto se te enganaste no upload.
                </span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] pt-3">
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveMovimentoDoc({
                      key: editingMovimento.itemKey,
                      movimentoId: editingMovimento.movimentoId,
                      path: editingMovimento.path,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remover ficheiro
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMovimento(null)}
                    className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit || !editFile}
                    className="rounded-lg bg-[#1F6FEB] px-4 py-2 text-[14px] font-medium text-white hover:bg-[#1557C0] disabled:opacity-50"
                  >
                    {savingEdit ? 'A guardar...' : 'Substituir ficheiro'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
