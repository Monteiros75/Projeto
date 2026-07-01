import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Tesouraria <onboarding@resend.dev>'
const DIA_LEMBRETE = 5

const MESES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function monthRefFromDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function previousMonthRef(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return monthRefFromDate(d)
}

function formatMonthLabel(monthRef: string) {
  const [year, month] = monthRef.split('-').map(Number)
  return `${MESES[(month || 1) - 1]} de ${year}`
}

async function sendReminderEmail({
  to,
  nomeNucleo,
  nomeTesoureiro,
  monthRef,
}: {
  to: string
  nomeNucleo: string
  nomeTesoureiro: string
  monthRef: string
}) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY nao configurada')
  }

  const nomeMes = formatMonthLabel(monthRef)
  const link = `${APP_URL.replace(/\/$/, '')}/fecho-mensal?mes=${monthRef}`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `Lembrete: fechar ${nomeMes} ate dia 10`,
      html: `
        <p>Ola${nomeTesoureiro ? ` ${nomeTesoureiro}` : ''},</p>
        <p>
          Faltam 5 dias para o prazo de entrega da contabilidade de <strong>${nomeMes}</strong>
          (nucleo <strong>${nomeNucleo}</strong>).
        </p>
        <p>O mes ainda nao esta fechado na aplicacao. Valida documentos, imprime o processo e
        fecha o mes em Fecho Mensal.</p>
        <p><a href="${link}">Abrir Fecho Mensal de ${nomeMes}</a></p>
        <p style="color:#6b7280;font-size:13px;">Prazo: dia 10 deste mes.</p>
      `,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend ${res.status}: ${body}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  const today = new Date()
  const day = today.getDate()

  if (day !== DIA_LEMBRETE) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: `Hoje e dia ${day}; lembrete so no dia ${DIA_LEMBRETE}.`,
    })
  }

  const monthRef = previousMonthRef(today)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: nucleos, error: nucleosError } = await supabase
    .from('nucleos')
    .select('id, nome_nucleo, nome_tesoureiro, email, email_contacto')
    .eq('ativo', true)

  if (nucleosError) {
    return Response.json({ ok: false, error: nucleosError.message }, { status: 500 })
  }

  const results: Array<Record<string, unknown>> = []

  for (const nucleo of nucleos || []) {
    const { count, error: countError } = await supabase
      .from('movimentos')
      .select('*', { count: 'exact', head: true })
      .eq('nucleo_id', nucleo.id)
      .eq('month_ref', monthRef)

    if (countError) {
      results.push({ nucleo_id: nucleo.id, status: 'error', detail: countError.message })
      continue
    }
    if (!count) {
      results.push({ nucleo_id: nucleo.id, status: 'skipped', reason: 'sem movimentos' })
      continue
    }

    const { data: fecho, error: fechoError } = await supabase
      .from('fechos_mensais')
      .select('fechado_em, lembrete_fecho_enviado_em')
      .eq('nucleo_id', nucleo.id)
      .eq('month_ref', monthRef)
      .maybeSingle()

    if (fechoError) {
      results.push({ nucleo_id: nucleo.id, status: 'error', detail: fechoError.message })
      continue
    }

    if (fecho?.fechado_em) {
      results.push({ nucleo_id: nucleo.id, status: 'skipped', reason: 'mes ja fechado' })
      continue
    }

    if (fecho?.lembrete_fecho_enviado_em) {
      results.push({ nucleo_id: nucleo.id, status: 'skipped', reason: 'lembrete ja enviado' })
      continue
    }

    let email = nucleo.email_contacto || nucleo.email
    if (!email) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(nucleo.id)
      if (authError) {
        results.push({ nucleo_id: nucleo.id, status: 'error', detail: authError.message })
        continue
      }
      email = authUser.user?.email || ''
    }

    if (!email) {
      results.push({ nucleo_id: nucleo.id, status: 'skipped', reason: 'sem email' })
      continue
    }

    try {
      await sendReminderEmail({
        to: email,
        nomeNucleo: nucleo.nome_nucleo,
        nomeTesoureiro: nucleo.nome_tesoureiro || '',
        monthRef,
      })

      const { error: upsertError } = await supabase.from('fechos_mensais').upsert(
        {
          nucleo_id: nucleo.id,
          month_ref: monthRef,
          lembrete_fecho_enviado_em: new Date().toISOString(),
        },
        { onConflict: 'nucleo_id,month_ref' },
      )

      if (upsertError) throw upsertError

      results.push({ nucleo_id: nucleo.id, status: 'sent', email, monthRef })
    } catch (err) {
      results.push({
        nucleo_id: nucleo.id,
        status: 'error',
        detail: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return Response.json({
    ok: true,
    day,
    monthRef,
    processed: results.length,
    results,
  })
})
