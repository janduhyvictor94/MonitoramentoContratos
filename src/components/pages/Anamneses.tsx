import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, Badge, Button, EmptyState, Spinner, Input } from '@/components/ui'
import { formatDate, getInitials } from '@/lib/utils'
import {
  ANAMNESE_STEPS, optionLabel, potencialColor, mesmoDiaColor,
  type AnamneseField,
} from '@/lib/anamneseModel'
import { generatePDF, printElement } from '@/lib/pdf'
import {
  ClipboardList, Search, ChevronRight, Printer, Download, FolderOpen,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function fieldDisplayValue(field: AnamneseField, answers: Record<string, any>): string | null {
  const val = answers[field.key]
  if (field.type === 'yesno') {
    if (val == null) return null
    const base = val === 'sim' ? 'Sim' : 'Não'
    const detail = field.detailKey ? answers[field.detailKey] : null
    return detail ? `${base} — ${detail}` : base
  }
  if (field.type === 'chips') {
    const arr: string[] = val || []
    if (arr.length === 0) return null
    return arr.map((v) => optionLabel(field.key, v)).join(', ')
  }
  if (field.type === 'choice' || field.type === 'scale') {
    if (!val) return null
    return optionLabel(field.key, val)
  }
  if (val == null || String(val).trim() === '') return null
  return String(val)
}

// ─── Lista ────────────────────────────────────────────────────────────────
function AnamneseList() {
  const [search, setSearch] = useState('')

  const { data: anamneses, isLoading } = useQuery({
    queryKey: ['anamneses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('anamneses')
        .select('*, patients(nome,codigo)')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const filtered = (anamneses as any[] ?? []).filter((a) =>
    !search || a.patients?.nome?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="luxury-label text-gold-700">Documentos</p>
        <h2 className="heading-serif text-3xl mt-1">Anamneses</h2>
      </div>

      <div className="gold-divider" />

      <Input
        placeholder="Buscar por paciente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={15} />}
        className="sm:w-72"
      />

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={32} />}
            title="Nenhuma anamnese enviada"
            description="Envie o link de anamnese a partir da pasta de um paciente."
            action={<Link to="/pastas"><Button variant="gold">Ir para Pastas</Button></Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-cream-100">
                  {['Paciente', 'Status', 'Potencial', 'Mesmo dia', 'Enviada em', 'Preenchida em', ''].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-ink-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-cream-100 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800 text-xs font-semibold">
                          {getInitials(a.patients?.nome ?? '?')}
                        </div>
                        <p className="font-medium text-ink-900">{a.patients?.nome ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        label={a.status === 'preenchida' ? 'Preenchida' : 'Pendente'}
                        className={a.status === 'preenchida'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-amber-50 text-amber-700 ring-amber-600/20'}
                      />
                    </td>
                    <td className="px-5 py-4">
                      {a.potencial ? <Badge label={a.potencial} className={potencialColor(a.potencial)} /> : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {a.mesmo_dia ? <Badge label={a.mesmo_dia} className={mesmoDiaColor(a.mesmo_dia)} /> : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-ink-700">{a.sent_at ? formatDate(a.sent_at) : '—'}</td>
                    <td className="px-5 py-4 text-ink-700">{a.preenchida_em ? formatDate(a.preenchida_em) : '—'}</td>
                    <td className="px-5 py-4">
                      <Link to={`/anamneses/${a.id}`} className="rounded-md p-2 text-ink-400 hover:bg-gold-50 hover:text-gold-700 transition-colors inline-flex">
                        <ChevronRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Visualizador ───────────────────────────────────────────────────────────
function AnamneseViewer({ id }: { id: string }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const { data: anamnese, isLoading } = useQuery({
    queryKey: ['anamnese', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('anamneses')
        .select('*, patients(*)')
        .eq('id', id)
        .single()
      return data as any
    },
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!anamnese) return <p className="text-center text-ink-500 py-16">Anamnese não encontrada.</p>

  const answers = anamnese.respostas ?? {}
  const isPending = anamnese.status !== 'preenchida'

  async function handlePDF() {
    if (!contentRef.current) return
    setDownloadingPdf(true)
    try {
      await generatePDF(contentRef.current, `Anamnese — ${anamnese.patients?.nome ?? ''}`)
      toast.success('PDF baixado!')
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + e.message)
    } finally {
      setDownloadingPdf(false)
    }
  }
  function handlePrint() {
    if (!contentRef.current) return
    printElement(contentRef.current, `Anamnese — ${anamnese.patients?.nome ?? ''}`)
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link to="/anamneses" className="hover:text-gold-700 flex items-center gap-1">
          <ClipboardList size={14} /> Anamneses
        </Link>
        <ChevronRight size={14} />
        <span className="text-ink-900 font-medium truncate">{anamnese.patients?.nome}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge
          label={isPending ? 'Aguardando preenchimento' : 'Preenchida'}
          className={isPending ? 'bg-amber-50 text-amber-700 ring-amber-600/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'}
        />
        {anamnese.potencial && <Badge label={`Potencial: ${anamnese.potencial}`} className={potencialColor(anamnese.potencial)} />}
        {anamnese.mesmo_dia && <Badge label={`Mesmo dia: ${anamnese.mesmo_dia}`} className={mesmoDiaColor(anamnese.mesmo_dia)} />}
        <Link to={`/pastas/${anamnese.patient_id}`} className="text-sm text-gold-700 hover:underline flex items-center gap-1 ml-auto">
          <FolderOpen size={13} /> Ver pasta do paciente
        </Link>
      </div>

      {isPending ? (
        <Card className="bg-amber-50 border-amber-200">
          <p className="text-sm text-ink-700">
            Este link ainda não foi preenchido pelo paciente. Assim que ele confirmar, as respostas e a classificação de potencial aparecem aqui automaticamente.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
              Imprimir
            </Button>
            <Button variant="gold" size="sm" icon={<Download size={14} />} onClick={handlePDF} loading={downloadingPdf}>
              Baixar PDF
            </Button>
          </div>

          <Card>
            <div ref={contentRef} className="contract-content">
              <div className="mb-8 pb-6 border-b-2 border-ink-100">
                <p className="luxury-label text-gold-700 mb-1">Instituto Bruna Braga</p>
                <h1 className="heading-serif text-2xl">Ficha de Anamnese</h1>
                <p className="text-sm text-ink-600 mt-2">
                  {anamnese.patients?.nome} · Preenchida em {anamnese.preenchida_em ? formatDate(anamnese.preenchida_em) : '—'}
                </p>
              </div>

              {ANAMNESE_STEPS.map((step) => {
                const rows = step.fields
                  .map((f) => ({ field: f, value: fieldDisplayValue(f, answers) }))
                  .filter((r) => r.value !== null)
                if (rows.length === 0) return null
                return (
                  <div key={step.id} className="mb-7">
                    <p className="luxury-label text-gold-700 mb-3">{step.group}</p>
                    <div className="space-y-2.5">
                      {rows.map(({ field, value }) => (
                        <div key={field.key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                          <p className="text-sm font-medium text-ink-900 sm:w-2/5 shrink-0">
                            {field.label ?? step.title}
                          </p>
                          <p className="text-sm text-ink-700 sm:flex-1">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className="mt-10 pt-6 border-t-2 border-ink-200">
                <p className="luxury-label text-gold-700 mb-2">Confirmação do paciente</p>
                <p className="text-sm text-ink-700">
                  {anamnese.confirm_nome} confirmou a veracidade das informações em{' '}
                  {anamnese.preenchida_em ? format(new Date(anamnese.preenchida_em), 'dd/MM/yyyy') : '—'}.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default function Anamneses() {
  const { id } = useParams()
  if (id) return <AnamneseViewer id={id} />
  return <AnamneseList />
}
