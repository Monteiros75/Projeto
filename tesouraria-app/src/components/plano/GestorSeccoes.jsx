import { useState } from 'react'
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react'

function GestorSeccoes({ seccoes, onAdicionar, onRenomear, onRemover }) {
  const [novaSecao, setNovaSecao] = useState('')
  const [editando, setEditando] = useState(null)
  const [nomeEditado, setNomeEditado] = useState('')

  async function handleAdicionar(e) {
    e.preventDefault()
    if (!novaSecao.trim()) return
    await onAdicionar(novaSecao)
    setNovaSecao('')
  }

  function iniciarEdicao(nome) {
    setEditando(nome)
    setNomeEditado(nome)
  }

  async function confirmarEdicao() {
    if (!editando) return
    await onRenomear(editando, nomeEditado)
    setEditando(null)
    setNomeEditado('')
  }

  return (
    <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-4">
      <h3 className="text-[15px] font-medium text-[#111827]">Secções do documento</h3>
      <p className="mt-0.5 text-[13px] text-[#6B7280]">
        Cada núcleo pode ter secções diferentes. Podes renomear, remover ou adicionar novas.
      </p>

      <ul className="mt-4 space-y-2">
        {seccoes.map((seccao) => (
          <li
            key={seccao}
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2"
          >
            {editando === seccao ? (
              <>
                <input
                  type="text"
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-[#E5E7EB] px-2 py-1 text-[13px] focus:outline-none focus:ring-1 focus:ring-[#1F6FEB]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={confirmarEdicao}
                  className="rounded p-1 text-[#059669] hover:bg-[#DCFCE7]"
                  title="Guardar nome"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6]"
                  title="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="min-w-0 flex-1 text-[14px] text-[#111827]">{seccao}</span>
                <button
                  type="button"
                  onClick={() => iniciarEdicao(seccao)}
                  className="rounded p-1 text-[#6B7280] hover:bg-white hover:text-[#1F6FEB]"
                  title="Renomear secção"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemover(seccao)}
                  disabled={seccoes.length <= 1}
                  className="rounded p-1 text-[#9CA3AF] hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-30"
                  title="Remover secção"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdicionar} className="mt-4 flex gap-2">
        <input
          type="text"
          value={novaSecao}
          onChange={(e) => setNovaSecao(e.target.value)}
          placeholder="Nova secção (ex.: Secção Tecnológica)"
          className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1F6FEB]"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[13px] text-[#1F6FEB] hover:bg-[#EFF6FF]"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </form>
    </div>
  )
}

export default GestorSeccoes
