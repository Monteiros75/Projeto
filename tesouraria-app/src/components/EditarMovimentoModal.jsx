import { useState } from 'react'
import { useMovimentoActions } from '../hooks/useMovimentoActions'

function buildEditState(movimento) {
  return {
    data: movimento.data || '',
    numeroDocumento: movimento.numero_documento || '',
    descricao: movimento.descricao || '',
    natureza: movimento.natureza || 'pagamento',
    valor: String(movimento.valor ?? ''),
  }
}

export default function EditarMovimentoModal({ movimento, onClose, onSaved }) {
  if (!movimento) return null

  return (
    <EditarMovimentoModalContent
      key={movimento.id}
      movimento={movimento}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

function EditarMovimentoModalContent({ movimento, onClose, onSaved }) {
  const { updateMovimento, submitting, error } = useMovimentoActions()
  const [editData, setEditData] = useState(() => buildEditState(movimento))

  async function handleSave() {
    const ok = await updateMovimento(movimento, editData)
    if (ok) {
      onSaved?.()
      onClose?.()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-[#111827]">Editar movimento</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="date"
            value={editData.data}
            onChange={(event) => setEditData((prev) => ({ ...prev, data: event.target.value }))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={editData.numeroDocumento}
            onChange={(event) =>
              setEditData((prev) => ({ ...prev, numeroDocumento: event.target.value }))
            }
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
            placeholder="Nº FT/documento"
          />
          <input
            type="text"
            value={editData.descricao}
            onChange={(event) => setEditData((prev) => ({ ...prev, descricao: event.target.value }))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm sm:col-span-2"
            placeholder="Descrição"
          />
          <select
            value={editData.natureza}
            onChange={(event) => setEditData((prev) => ({ ...prev, natureza: event.target.value }))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          >
            <option value="pagamento">Pagamento</option>
            <option value="recebimento">Recebimento</option>
          </select>
          <input
            type="number"
            step="0.01"
            value={editData.valor}
            onChange={(event) => setEditData((prev) => ({ ...prev, valor: event.target.value }))}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          />
        </div>
        {error ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="rounded-lg bg-[#1F6FEB] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
