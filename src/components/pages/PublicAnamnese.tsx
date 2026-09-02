import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui'
import { ANAMNESE_STEPS, computeAnamneseScore, type AnamneseField } from '@/lib/anamneseModel'
import { Heart, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react'

type Answers = Record<string, any>

// ─── Campo individual ───────────────────────────────────────────────────────
function FieldBlock({
  field, answers, onChange, onToggleChip,
}: {
  field: AnamneseField
  answers: Answers
  onChange: (key: string, value: any) => void
  onToggleChip: (key: string, value: string) => void
}) {
  // visibilidade condicional
  if (field.showIf && answers[field.showIf.key] !== field.showIf.eq) return null
  if (field.showIfChips) {
    const arr: string[] = answers[field.showIfChips.key] || []
    if (field.showIfChips.includes && !arr.includes(field.showIfChips.includes)) return null
    if (field.showIfChips.includesNot && !(arr.length > 0 && !arr.includes(field.showIfChips.includesNot))) return null
  }

  const label = field.label && (
    <label className="block text-sm font-semibold text-ink-800 mb-2 leading-snug">
      {field.label}{field.required && <span className="text-gold-700 ml-0.5">*</span>}
    </label>
  )

  if (field.type === 'text' || field.type === 'tel' || field.type === 'email' || field.type === 'date') {
    return (
      <div>
        {label}
        <input
          type={field.type}
          value={answers[field.key] ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full rounded-[10px] border-[1.5px] border-ink-100 bg-cream-50 px-3.5 py-2.5 text-[14.5px] text-ink-900 outline-none transition-colors focus:border-gold-500"
        />
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          value={answers[field.key] ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          rows={4}
          className="w-full rounded-[10px] border-[1.5px] border-ink-100 bg-cream-50 px-3.5 py-2.5 text-[14.5px] text-ink-900 leading-relaxed outline-none transition-colors focus:border-gold-500 resize-y min-h-[84px]"
        />
      </div>
    )
  }

  if (field.type === 'choice' || field.type === 'scale') {
    const isScale = field.type === 'scale'
    return (
      <div>
        {label}
        <div className={isScale ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2.5'}>
          {field.options!.map((o, i) => {
            const selected = answers[field.key] === o.v
            return (
              <button
                type="button"
                key={o.v}
                onClick={() => onChange(field.key, o.v)}
                className={`flex items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-3 text-left transition-colors ${
                  isScale ? 'flex-col items-start justify-center min-h-[64px] text-left' : ''
                } ${selected ? 'border-gold-600 bg-gold-100' : 'border-ink-100 bg-cream-50 hover:border-gold-300'}`}
              >
                {isScale ? (
                  <span className="font-serif text-[13px] text-gold-700">0{i + 1}</span>
                ) : (
                  <span className={`h-[17px] w-[17px] shrink-0 rounded-full border-[1.5px] relative ${selected ? 'border-gold-600' : 'border-ink-300'}`}>
                    {selected && <span className="absolute inset-[3px] rounded-full bg-gold-600" />}
                  </span>
                )}
                <span className={`text-[14px] leading-snug ${selected ? 'text-ink-950 font-medium' : 'text-ink-800'}`}>{o.t}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'chips') {
    const arr: string[] = answers[field.key] || []
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {field.options!.map((o) => {
            const selected = arr.includes(o.v)
            return (
              <button
                type="button"
                key={o.v}
                onClick={() => onToggleChip(field.key, o.v)}
                className={`rounded-full border-[1.5px] px-3.5 py-2 text-[13px] transition-colors ${
                  selected ? 'bg-ink-950 border-ink-950 text-cream-50' : 'bg-cream-50 border-ink-100 text-ink-700 hover:border-gold-300'
                }`}
              >
                {o.t}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'yesno') {
    const val = answers[field.key]
    return (
      <div className="py-3 border-b border-ink-100 last:border-b-0">
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[13.5px] text-ink-800 leading-snug">{field.label}</p>
          <div className="flex gap-1.5 shrink-0">
            <button type="button" onClick={() => onChange(field.key, 'sim')}
              className={`min-w-[52px] rounded-lg border-[1.5px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                val === 'sim' ? 'bg-gold-600 border-gold-600 text-white' : 'border-ink-100 text-ink-600'
              }`}>Sim</button>
            <button type="button" onClick={() => onChange(field.key, 'nao')}
              className={`min-w-[52px] rounded-lg border-[1.5px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                val === 'nao' ? 'bg-ink-800 border-ink-800 text-white' : 'border-ink-100 text-ink-600'
              }`}>Não</button>
          </div>
        </div>
        {val === 'sim' && field.detailKey && (
          <input
            type="text"
            value={answers[field.detailKey] ?? ''}
            placeholder={field.detailPlaceholder}
            onChange={(e) => onChange(field.detailKey!, e.target.value)}
            className="mt-2.5 w-full rounded-[10px] border-[1.5px] border-ink-100 bg-cream-50 px-3.5 py-2 text-[13.5px] text-ink-900 outline-none focus:border-gold-500"
          />
        )}
      </div>
    )
  }

  return null
}

// ─── Página principal ───────────────────────────────────────────────────────
export default function PublicAnamnese() {
  const { token } = useParams<{ token: string }>()
  const qc = useQueryClient()
  const [screen, setScreen] = useState(0) // 0 = intro, 1..N = perguntas, N+1 = confirmação, N+2 = fim
  const [answers, setAnswers] = useState<Answers>({})
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const totalContentSteps = ANAMNESE_STEPS.length
  const confirmScreen = totalContentSteps + 1

  const { data: anamnese, isLoading, error } = useQuery({
    queryKey: ['public-anamnese', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anamneses')
        .select('*, patients(nome)')
        .eq('token', token)
        .single()
      if (error) throw error
      return data as any
    },
    enabled: !!token,
    retry: false,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const score = computeAnamneseScore(answers)
      const { error } = await supabase
        .from('anamneses')
        .update({
          status: 'preenchida',
          respostas: answers,
          confirm_nome: answers.nome ?? '',
          interesse_score: score.interesseScore,
          investimento_score: score.investimentoScore,
          potencial: score.potencial,
          mesmo_dia: score.mesmoDia,
          preenchida_em: new Date().toISOString(),
        })
        .eq('token', token)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-anamnese', token] })
      setSubmitted(true)
    },
  })

  function setAnswer(key: string, value: any) {
    setAnswers((a) => ({ ...a, [key]: value }))
  }
  function toggleChip(key: string, value: string) {
    setAnswers((a) => {
      const arr: string[] = a[key] || []
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
      return { ...a, [key]: next }
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  if (error || !anamnese) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-cream-50 rounded-lg border border-ink-100 shadow-sm p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <FileText size={24} className="text-red-500" />
          </div>
          <h2 className="heading-serif text-xl mb-2">Link inválido</h2>
          <p className="text-sm text-ink-600">
            Este link de anamnese não foi encontrado. Entre em contato com o instituto para receber um novo link.
          </p>
        </div>
      </div>
    )
  }

  const alreadyDone = anamnese.status === 'preenchida' && !submitted
  const showThankYou = submitted

  return (
    <div className="min-h-screen bg-cream-200 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-cream-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[min(760px,92vh)] max-h-[92vh]">
        {/* Header */}
        <div className="bg-ink-950 text-cream-50 px-6 py-5 flex items-center gap-3 shrink-0">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-gold-400">
            <span className="font-serif text-sm text-gold-300">IB</span>
          </div>
          <div>
            <p className="luxury-label text-gold-400">Instituto</p>
            <p className="heading-serif text-lg text-cream-50 mt-0.5">Bruna Braga</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-gold-400">
            <ShieldCheck size={15} />
            {!alreadyDone && !showThankYou && (
              <span className="text-[11px] text-gold-300 whitespace-nowrap">
                {screen === 0 ? '' : screen <= totalContentSteps ? `Etapa ${screen} de ${totalContentSteps + 1}` : 'Confirmação'}
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        {!alreadyDone && !showThankYou && (
          <div className="h-[3px] bg-ink-100 shrink-0">
            <div
              className="h-full bg-gradient-to-r from-gold-500 to-gold-600 transition-all duration-300"
              style={{ width: `${(screen / (confirmScreen + 1)) * 100}%` }}
            />
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-7">
          {alreadyDone ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-10">
              <div className="w-14 h-14 rounded-full border-[1.5px] border-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={26} className="text-emerald-600" />
              </div>
              <h1 className="heading-serif text-2xl">Anamnese já recebida</h1>
              <p className="text-sm text-ink-600 max-w-xs">
                Já registramos suas respostas, {anamnese.patients?.nome ?? ''}. Nos vemos em breve!
              </p>
            </div>
          ) : showThankYou ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-10">
              <div className="w-14 h-14 rounded-full border-[1.5px] border-gold-400 flex items-center justify-center">
                <Heart size={22} className="text-gold-600" />
              </div>
              <h1 className="heading-serif text-2xl">Obrigada por concluir o preenchimento</h1>
              <p className="text-sm text-ink-600 max-w-xs">
                Estamos ansiosas para recebê-la(o) e cuidar de você com toda a atenção que merece.
              </p>
            </div>
          ) : screen === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-10">
              <div className="w-14 h-14 rounded-full border-[1.5px] border-gold-400 flex items-center justify-center">
                <span className="font-serif text-lg text-gold-700">IB</span>
              </div>
              <h1 className="heading-serif text-2xl">Ficha de Anamnese</h1>
              <p className="text-sm text-ink-600 max-w-xs">
                Leva menos de 5 minutos. Suas respostas nos ajudam a te receber já sabendo exatamente do que você precisa.
              </p>
              <p className="text-[11.5px] text-ink-400 max-w-xs mt-2">
                Suas informações são confidenciais e usadas apenas pela equipe do Instituto Bruna Braga para preparar seu atendimento.
              </p>
            </div>
          ) : screen === confirmScreen ? (
            <div className="space-y-5">
              <div>
                <p className="luxury-label text-gold-800 mb-2">Confirmação</p>
                <h2 className="heading-serif text-2xl">Só falta confirmar</h2>
                <p className="text-sm text-ink-600 mt-2">Revise seu nome e confirme que as informações estão corretas.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-800 mb-2">Nome</label>
                <input
                  type="text"
                  value={answers.nome ?? ''}
                  onChange={(e) => setAnswer('nome', e.target.value)}
                  className="w-full rounded-[10px] border-[1.5px] border-ink-100 bg-cream-50 px-3.5 py-2.5 text-[14.5px] text-ink-900 outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink-800 mb-2">Data</label>
                <div className="rounded-[10px] border-[1.5px] border-dashed border-ink-100 bg-cream-100 px-3.5 py-2.5 text-[13.5px] text-ink-600">
                  {format(new Date(), 'dd/MM/yyyy')}
                </div>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-0.5 h-[17px] w-[17px] accent-gold-600 shrink-0"
                />
                <span className="text-[13.5px] text-ink-800 leading-relaxed">
                  Confirmo que as informações fornecidas são verdadeiras<span className="text-gold-700">*</span>
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="luxury-label text-gold-800 mb-2.5">{ANAMNESE_STEPS[screen - 1].group}</p>
                <h2 className="heading-serif text-2xl leading-snug">{ANAMNESE_STEPS[screen - 1].title}</h2>
                {ANAMNESE_STEPS[screen - 1].subtitle && (
                  <p className="text-sm text-ink-600 mt-2 leading-relaxed">{ANAMNESE_STEPS[screen - 1].subtitle}</p>
                )}
              </div>
              <div className="space-y-5">
                {ANAMNESE_STEPS[screen - 1].fields.map((f) => (
                  <FieldBlock key={f.key} field={f} answers={answers} onChange={setAnswer} onToggleChip={toggleChip} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navegação */}
        {!alreadyDone && !showThankYou && (
          <div className="border-t border-ink-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={() => setScreen((s) => Math.max(0, s - 1))}
              className={`text-sm font-medium text-ink-500 hover:text-ink-800 transition-colors ${screen === 0 ? 'invisible' : ''}`}
            >
              Voltar
            </button>
            {screen === confirmScreen ? (
              <button
                disabled={!confirmChecked || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
                className="rounded-full bg-ink-950 text-cream-50 px-6 py-3 text-[13.5px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {submitMutation.isPending ? 'Enviando...' : 'Enviar respostas'}
              </button>
            ) : (
              <button
                onClick={() => setScreen((s) => Math.min(confirmScreen, s + 1))}
                className="rounded-full bg-ink-950 text-cream-50 px-6 py-3 text-[13.5px] font-semibold hover:opacity-90 transition-opacity"
              >
                {screen === 0 ? 'Começar' : 'Continuar'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
