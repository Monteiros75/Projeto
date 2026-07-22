import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import AnexosMovimentoModal from './AnexosMovimentoModal'
import { getMovimentoDocStatus } from '../lib/associarDocumentoMovimento'
import { buildControlRows, formatDatePt, formatEur } from '../lib/folhaMensal'

/**
 * Folha de caixa/banco em modo leitura, para o concelho fiscal comparar cada
 * movimento (data, nº de documento, valor) com as faturas físicas recebidas.
 * Mesma logica/colunas de FolhaContaView.jsx, sem registo/edicao/impressao.
 */
export default function FolhaContaSomenteLeitura({
  tipoConta,
  titulo,
  linhaPrefixo,
  movimentos,
  saldoAnterior,
  movimentoIdsComModelo,
  modelosPorMovimento,
  monthRef,
}) {
  const [viewingAnexos, setViewingAnexos] = useState(null)

  const rowsWithSaldo = buildControlRows(movimentos, tipoConta, saldoAnterior, linhaPrefixo)

  return (
    <div className="mb-6">
      <h3 className="mb-3 text-[15px] font-medium text-[#111827]">{titulo}</h3>
      <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] bg-white">
        <table className="w-full">
          <thead className="border-b-2 border-[#E5E7EB] bg-[#F9FAFB]">
            <tr>
              {['Nº', 'Data', 'Nº FT', 'Descrição', 'Recebimentos', 'Pagamentos', 'Saldo'].map(
                (head) => (
                  <th
                    key={head}
                    className={`px-4 py-3 text-left text-[12px] font-medium text-[#6B7280] ${
                      head === 'Recebimentos' || head === 'Pagamentos' || head === 'Saldo'
                        ? 'text-right'
                        : ''
                    }`}
                  >
                    {head}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            <tr className="bg-[#F9FAFB]">
              <td className="px-4 py-3 text-[14px] text-[#111827]" colSpan={6}>
                Saldo anterior
              </td>
              <td className="px-4 py-3 text-right text-[14px] font-medium text-[#111827]">
                {formatEur(saldoAnterior)}
              </td>
            </tr>
            {rowsWithSaldo.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-[14px] text-[#6B7280]" colSpan={7}>
                  Sem movimentos de {tipoConta === 'caixa' ? 'caixa' : 'banco'} neste mês.
                </td>
              </tr>
            ) : (
              rowsWithSaldo.map((movimento) => {
                const docStatus = getMovimentoDocStatus(movimento, movimentoIdsComModelo)
                return (
                  <tr key={movimento.id}>
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      <button
                        type="button"
                        onClick={() => setViewingAnexos(movimento)}
                        className="flex items-center gap-1.5 rounded p-0.5 hover:bg-[#F3F4F6]"
                        title={
                          (docStatus.completo ? 'Documentos completos' : docStatus.falta) +
                          ' — clica para ver'
                        }
                      >
                        {docStatus.completo ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
                        )}
                        {movimento.linha}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      {formatDatePt(movimento.data)}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      {movimento.numero_documento || '-'}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#111827]">
                      {movimento.descricao || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] text-[#10B981]">
                      {movimento.recebimentos > 0 ? formatEur(movimento.recebimentos) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] text-[#EF4444]">
                      {movimento.pagamentos > 0 ? formatEur(movimento.pagamentos) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] font-medium text-[#111827]">
                      {formatEur(movimento.saldo)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {viewingAnexos ? (
        <AnexosMovimentoModal
          movimento={viewingAnexos}
          modelo={modelosPorMovimento?.get(viewingAnexos.id) || null}
          monthRef={monthRef}
          onClose={() => setViewingAnexos(null)}
          readOnly
        />
      ) : null}
    </div>
  )
}
