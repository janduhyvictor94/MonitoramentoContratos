import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button, Input, Modal } from '@/components/ui'
import { detectVariables } from '@/lib/utils'
import {
  type VariableSuggestion, type ParsedDocument,
  tipoLabels, tipoColors,
} from '@/lib/docParser'
import {
  Check, Edit3, Trash2, Plus,
  Wand2, MousePointer2, FileText, Save,
  AlertCircle, HelpCircle, X
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  parsed: ParsedDocument
  initialSuggestions: VariableSuggestion[]
  onCancel: () => void
  onSaved: () => void
}

// Sugestões inteligentes pré-definidas (para o modal de nomear)
const SUGESTOES_NOMES = [
  { label: 'Nome do Paciente', value: '{{paciente_nome}}' },
  { label: 'CPF do Paciente', value: '{{paciente_cpf}}' },
  { label: 'RG do Paciente', value: '{{paciente_rg}}' },
  { label: 'Data de Nascimento', value: '{{paciente_data_nasc}}' },
  { label: 'Endereço', value: '{{paciente_endereco}}' },
  { label: 'Bairro', value: '{{paciente_bairro}}' },
  { label: 'CEP', value: '{{paciente_cep}}' },
  { label: 'Cidade', value: '{{paciente_cidade}}' },
  { label: 'Estado/UF', value: '{{paciente_estado}}' },
  { label: 'Telefone', value: '{{paciente_telefone}}' },
  { label: 'E-mail', value: '{{paciente_email}}' },
  { label: 'Valor Total (R$)', value: '{{valor_total}}' },
  { label: 'Valor da Parcela', value: '{{valor_parcela}}' },
  { label: 'Forma de Pagamento', value: '{{forma_pagamento}}' },
  { label: 'Número de Parcelas', value: '{{num_parcelas}}' },
  { label: 'Descrição do Procedimento', value: '{{procedimento}}' },
  { label: 'Observações', value: '{{observacoes}}' },
  { label: 'Data da Assinatura', value: '{{data_assinatura}}' },
  { label: 'Local da Assinatura', value: '{{local_assinatura}}' },
  { label: 'Nome da Testemunha', value: '{{testemunha_nome}}' },
  { label: 'CPF da Testemunha', value: '{{testemunha_cpf}}' },
]

export default function TemplateEditor({
  parsed, initialSuggestions, onCancel, onSaved
}: Props) {
  const [nome, setNome] = useState(parsed.fileName.replace(/\.(docx|pdf)$/i, ''))
  const [descricao, setDescricao] = useState('')
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>(initialSuggestions)
  const [activeTab, setActiveTab] = useState<'pendentes' | 'auto' | 'manual'>('auto')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState('')
  const [manualVarName, setManualVarName] = useState('')
  const [namingDialog, setNamingDialog] = useState<VariableSuggestion | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // Conta quantos campos precisam de nome
  const pendentes = suggestions.filter(s => s.precisaNomear)
  const autoVars = suggestions.filter(s => !s.precisaNomear && s.tipo !== 'manual')
  const manualVars = suggestions.filter(s => s.tipo === 'manual')

  // Abre aba pendentes automaticamente se tiver pendentes
  useEffect(() => {
    if (pendentes.length > 0 && activeTab === 'auto') {
      setActiveTab('pendentes')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleSelection() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) { setSelectedText(''); return }
      const range = sel.getRangeAt(0)
      if (!previewRef.current?.contains(range.commonAncestorContainer)) {
        setSelectedText(''); return
      }
      const text = sel.toString().trim()
      if (text && text.length > 0 && text.length < 200) setSelectedText(text)
      else setSelectedText('')
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  function addManualVariable() {
    if (!selectedText) return
    const slug = manualVarName.trim() || `campo_${manualVars.length + 1}`
    const sugestao = `{{${slug.replace(/[{}]/g, '').replace(/\s+/g, '_').toLowerCase()}}}`
    const newVar: VariableSuggestion = {
      id: `manual-${Date.now()}-${Math.random()}`,
      texto: selectedText,
      tipo: 'manual',
      sugestao,
      ocorrencias: countOccurrences(parsed.text, selectedText),
      aceito: true,
    }
    setSuggestions((s) => [newVar, ...s])
    setSelectedText('')
    setManualVarName('')
    window.getSelection()?.removeAllRanges()
    toast.success(`Variável ${sugestao} criada!`)
  }

  function countOccurrences(text: string, target: string): number {
    if (!target) return 0
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return (text.match(new RegExp(escaped, 'g')) ?? []).length
  }

  function toggleSuggestion(id: string) {
    setSuggestions((s) => s.map((sug) => sug.id === id ? { ...sug, aceito: !sug.aceito } : sug))
  }

  function updateSugestao(id: string, novaSugestao: string) {
    let v = novaSugestao.trim()
    if (!v.startsWith('{{')) v = `{{${v.replace(/[{}]/g, '')}}}`
    setSuggestions((s) => s.map((sug) =>
      sug.id === id
        ? { ...sug, sugestao: v, precisaNomear: false, aceito: true }
        : sug
    ))
  }

  function removeSuggestion(id: string) {
    setSuggestions((s) => s.filter((sug) => sug.id !== id))
  }

  function highlightPreview(html: string): string {
    let result = html
    const accepted = suggestions
      .filter((s) => s.aceito || s.precisaNomear)
      .sort((a, b) => b.texto.length - a.texto.length)

    for (const s of accepted) {
      const isHover = hoveredId === s.id
      const isPending = s.precisaNomear

      const cls = isPending
        ? (isHover
            ? 'bg-red-400 text-white px-1 rounded font-bold ring-2 ring-red-600'
            : 'bg-red-100 text-red-800 px-1 rounded font-medium border border-red-300')
        : (isHover
            ? 'bg-gold-400 text-ink-950 px-1 rounded font-bold ring-2 ring-gold-600'
            : 'bg-gold-100 text-gold-900 px-1 rounded font-medium')

      const display = isPending ? '⚠️ NOMEAR' : s.sugestao
      const replacement = `<mark class="${cls}" data-var="${s.sugestao}">${display}</mark>`

      const escapedExact = s.texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const exactRegex = new RegExp(escapedExact, 'g')
      if (exactRegex.test(result)) {
        result = result.replace(new RegExp(escapedExact, 'g'), replacement)
        continue
      }

      const colonIdx = s.texto.indexOf(':')
      if (colonIdx === -1) continue
      const rotulo = s.texto.slice(0, colonIdx).trim()
      const valor = s.texto.slice(colonIdx + 1).trim()
      if (!rotulo || !valor) continue
      const escRotulo = rotulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escValor = valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const flexRegex = new RegExp(
        `(${escRotulo}\\s*:\\s*(?:<\\/[^>]+>)?\\s*)${escValor}`,
        'g'
      )
      result = result.replace(flexRegex, `$1${replacement}`)
    }
    return result
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error('Informe o nome do modelo')
      if (pendentes.length > 0) {
        throw new Error(`Ainda há ${pendentes.length} campo(s) para nomear ou rejeitar.`)
      }

      let conteudo = parsed.text
      let conteudoHtml = parsed.html
      const accepted = suggestions
        .filter((s) => s.aceito)
        .sort((a, b) => b.texto.length - a.texto.length)

      for (const s of accepted) {
        const escaped = s.texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        conteudo = conteudo.replace(new RegExp(escaped, 'g'), s.sugestao)

        const htmlExactRegex = new RegExp(escaped, 'g')
        if (htmlExactRegex.test(conteudoHtml)) {
          conteudoHtml = conteudoHtml.replace(new RegExp(escaped, 'g'), s.sugestao)
        } else {
          const colonIdx = s.texto.indexOf(':')
          if (colonIdx !== -1) {
            const rotulo = s.texto.slice(0, colonIdx).trim()
            const valor = s.texto.slice(colonIdx + 1).trim()
            if (rotulo && valor) {
              const escRotulo = rotulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              const escValor = valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              const flexRegex = new RegExp(
                `(${escRotulo}\\s*:\\s*(?:<\\/[^>]+>)?\\s*)${escValor}`,
                'g'
              )
              conteudoHtml = conteudoHtml.replace(flexRegex, `$1${s.sugestao}`)
            }
          }
        }
      }

      const variaveis = detectVariables(conteudo)
      const { error } = await supabase.from('contract_templates').insert({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        conteudo,
        conteudo_html: conteudoHtml,
        variaveis,
        arquivo_original_nome: parsed.fileName,
        formato_original: parsed.format,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Modelo salvo!')
      onSaved()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const acceptedCount = suggestions.filter((s) => s.aceito).length

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ink-100 bg-cream-100 shrink-0">
        <div className="flex items-center gap-2 text-sm text-ink-600 flex-wrap">
          <FileText size={14} className="text-gold-700" />
          <span className="font-medium">{parsed.fileName}</span>
          <span className="text-ink-300">·</span>
          <span className="text-ink-500">{parsed.format.toUpperCase()}</span>
          <span className="text-ink-300">·</span>
          <span className="text-gold-700 font-medium">
            {acceptedCount} variáveis aceitas
          </span>
          {pendentes.length > 0 && (
            <>
              <span className="text-ink-300">·</span>
              <span className="text-red-600 font-medium flex items-center gap-1">
                <AlertCircle size={14} />
                {pendentes.length} campo(s) sem nome
              </span>
            </>
          )}
        </div>
      </div>

      {/* Aviso de pendentes */}
      {pendentes.length > 0 && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 shrink-0 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              O sistema encontrou {pendentes.length} campo(s) em branco mas não soube nomear.
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              Clique em "Nomear este campo" em cada item vermelho na lista ao lado, ou rejeite os que não devem virar variável.
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* PREVIEW */}
        <div className="flex-1 flex flex-col bg-cream-50 overflow-hidden border-r border-ink-100">
          {selectedText && (
            <div className="px-5 py-3 bg-gold-50 border-b border-gold-200 flex items-center gap-3">
              <MousePointer2 size={15} className="text-gold-700 shrink-0" />
              <span className="text-sm text-ink-700">
                Selecionado: <strong>"{selectedText.slice(0, 40)}{selectedText.length > 40 ? '...' : ''}"</strong>
              </span>
              <input
                type="text"
                value={manualVarName}
                onChange={(e) => setManualVarName(e.target.value)}
                placeholder="nome_da_variavel"
                className="flex-1 max-w-[200px] text-xs font-mono bg-white border border-gold-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
              <Button size="sm" variant="gold" icon={<Plus size={13} />} onClick={addManualVariable}>
                Marcar como variável
              </Button>
            </div>
          )}

          {!selectedText && (
            <div className="px-5 py-3 bg-ink-50 border-b border-ink-100 flex items-center gap-2">
              <MousePointer2 size={14} className="text-ink-500" />
              <p className="text-xs text-ink-600">
                Selecione um trecho de texto para transformar em variável manualmente
              </p>
            </div>
          )}

          <div ref={previewRef} className="flex-1 overflow-y-auto p-8">
            <div
              className="prose prose-sm max-w-none contract-content bg-white p-8 rounded-lg shadow-sm border border-ink-100"
              dangerouslySetInnerHTML={{ __html: highlightPreview(parsed.html) }}
            />
          </div>
        </div>

        {/* PAINEL DIREITO */}
        <div className="w-[420px] flex flex-col bg-cream-100 overflow-hidden shrink-0">
          <div className="p-5 border-b border-ink-100 bg-cream-50 space-y-3 shrink-0">
            <Input label="Nome do Modelo *" value={nome} onChange={(e) => setNome(e.target.value)} />
            <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-ink-100 shrink-0 bg-cream-50">
            {pendentes.length > 0 && (
              <button
                onClick={() => setActiveTab('pendentes')}
                className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === 'pendentes' ? 'text-red-700 border-b-2 border-red-600 bg-red-50' : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <AlertCircle size={13} className="inline mr-1" />
                Pendentes ({pendentes.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('auto')}
              className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'auto' ? 'text-gold-700 border-b-2 border-gold-600' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              <Wand2 size={13} className="inline mr-1" />
              Auto ({autoVars.length})
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === 'manual' ? 'text-gold-700 border-b-2 border-gold-600' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              <MousePointer2 size={13} className="inline mr-1" />
              Manuais ({manualVars.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeTab === 'pendentes' && (
              <>
                {pendentes.length === 0 ? (
                  <div className="text-center py-8">
                    <Check size={24} className="mx-auto text-emerald-600 mb-2" />
                    <p className="text-xs text-emerald-700 font-medium">Tudo nomeado!</p>
                  </div>
                ) : (
                  pendentes.map((s) => (
                    <PendingCard
                      key={s.id}
                      suggestion={s}
                      onNomear={() => setNamingDialog(s)}
                      onRejeitar={() => removeSuggestion(s.id)}
                      onHover={(b) => setHoveredId(b ? s.id : null)}
                    />
                  ))
                )}
              </>
            )}

            {activeTab === 'auto' && (
              <>
                {autoVars.length === 0 ? (
                  <p className="text-xs text-ink-400 text-center py-8">
                    Nenhuma variável detectada automaticamente.
                  </p>
                ) : (
                  autoVars.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      onToggle={() => toggleSuggestion(s.id)}
                      onUpdate={(v) => updateSugestao(s.id, v)}
                      onRemove={() => removeSuggestion(s.id)}
                      onHover={(b) => setHoveredId(b ? s.id : null)}
                    />
                  ))
                )}
              </>
            )}

            {activeTab === 'manual' && (
              <>
                {manualVars.length === 0 ? (
                  <div className="text-center py-8">
                    <MousePointer2 size={24} className="mx-auto text-ink-300 mb-2" />
                    <p className="text-xs text-ink-500 mb-1">Nenhuma variável manual ainda.</p>
                    <p className="text-xs text-ink-400">
                      Selecione um texto no documento para criar uma.
                    </p>
                  </div>
                ) : (
                  manualVars.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      onToggle={() => toggleSuggestion(s.id)}
                      onUpdate={(v) => updateSugestao(s.id, v)}
                      onRemove={() => removeSuggestion(s.id)}
                      onHover={(b) => setHoveredId(b ? s.id : null)}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-ink-100 flex justify-between items-center bg-cream-100 shrink-0">
        <Button variant="secondary" onClick={onCancel}>← Voltar</Button>
        <Button
          variant="gold"
          loading={saveMutation.isPending}
          icon={<Save size={15} />}
          onClick={() => saveMutation.mutate()}
          disabled={pendentes.length > 0}
          title={pendentes.length > 0 ? `Nomeie os ${pendentes.length} campo(s) pendente(s) antes` : ''}
        >
          Salvar Modelo {pendentes.length > 0 && `(${pendentes.length} pendente(s))`}
        </Button>
      </div>

      {/* Modal de nomear campo */}
      <NamingDialog
        suggestion={namingDialog}
        onCancel={() => setNamingDialog(null)}
        onConfirm={(novoNome) => {
          if (namingDialog) {
            updateSugestao(namingDialog.id, novoNome)
            setNamingDialog(null)
            toast.success('Campo nomeado!')
          }
        }}
      />
    </div>
  )
}

// ─── Card de campo PENDENTE (precisa nomear) ─────────────────────────────────
function PendingCard({
  suggestion, onNomear, onRejeitar, onHover,
}: {
  suggestion: VariableSuggestion
  onNomear: () => void
  onRejeitar: () => void
  onHover: (hovering: boolean) => void
}) {
  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="p-3 rounded-lg border-2 border-red-300 bg-red-50"
    >
      <div className="flex items-start gap-2 mb-2">
        <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-red-800 mb-1">Campo sem nome detectado</p>
          {suggestion.contexto && (
            <p className="text-xs text-ink-600 italic line-clamp-2" title={suggestion.contexto}>
              "...{suggestion.contexto.slice(-80)}..."
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="gold"
          icon={<HelpCircle size={12} />}
          onClick={onNomear}
          className="flex-1"
        >
          Nomear este campo
        </Button>
        <button
          onClick={onRejeitar}
          className="p-1.5 rounded text-ink-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Não é variável (rejeitar)"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Card de sugestão (auto/manual) ──────────────────────────────────────────
function SuggestionCard({
  suggestion, onToggle, onUpdate, onRemove, onHover,
}: {
  suggestion: VariableSuggestion
  onToggle: () => void
  onUpdate: (s: string) => void
  onRemove: () => void
  onHover: (hovering: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [tempVar, setTempVar] = useState(suggestion.sugestao)

  function saveEdit() {
    onUpdate(tempVar)
    setEditing(false)
  }

  return (
    <div
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`p-3 rounded-lg border-2 transition-all ${
        suggestion.aceito ? 'bg-gold-50 border-gold-300' : 'bg-cream-50 border-ink-100 hover:border-ink-200'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded shrink-0 flex items-center justify-center transition-all ${
            suggestion.aceito ? 'bg-gold-600 border-gold-600' : 'border-2 border-ink-300 hover:border-gold-500'
          }`}
        >
          {suggestion.aceito && <Check size={13} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${tipoColors[suggestion.tipo]}`}>
              {tipoLabels[suggestion.tipo]}
            </span>
            {suggestion.ocorrencias > 1 && (
              <span className="text-[10px] text-ink-500">{suggestion.ocorrencias}× no doc</span>
            )}
          </div>

          <p className="text-xs text-ink-600 font-mono truncate mb-2" title={suggestion.texto}>
            "{suggestion.texto.slice(0, 60)}{suggestion.texto.length > 60 ? '...' : ''}"
          </p>

          {editing ? (
            <input
              autoFocus
              type="text"
              value={tempVar}
              onChange={(e) => setTempVar(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="w-full text-xs font-mono bg-white border border-gold-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => { setTempVar(suggestion.sugestao); setEditing(true) }}
                className="flex-1 flex items-center justify-between gap-1.5 text-xs font-mono bg-ink-900 text-gold-300 rounded px-2 py-1.5 hover:bg-ink-800 transition-colors"
              >
                <span className="truncate">{suggestion.sugestao}</span>
                <Edit3 size={11} className="shrink-0 opacity-60" />
              </button>
              <button
                onClick={onRemove}
                className="p-1.5 rounded text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Nomear Campo ─────────────────────────────────────────────────────
function NamingDialog({
  suggestion, onCancel, onConfirm,
}: {
  suggestion: VariableSuggestion | null
  onCancel: () => void
  onConfirm: (novoNome: string) => void
}) {
  const [customName, setCustomName] = useState('')

  useEffect(() => { setCustomName('') }, [suggestion])

  if (!suggestion) return null

  return (
    <Modal open={!!suggestion} onClose={onCancel} title="Nomear este campo" size="lg">
      <div className="p-6 space-y-5">
        {/* Contexto do campo */}
        <div className="bg-cream-100 rounded-lg p-4 border border-ink-100">
          <p className="luxury-label text-gold-700 mb-2">Trecho do documento:</p>
          <p className="text-sm text-ink-800 italic">
            {suggestion.contexto ? (
              <>...{suggestion.contexto}...</>
            ) : (
              <span className="text-ink-400">Sem contexto disponível</span>
            )}
          </p>
        </div>

        {/* Sugestões rápidas */}
        <div>
          <p className="luxury-label text-gold-700 mb-2">Escolha uma opção comum:</p>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {SUGESTOES_NOMES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onConfirm(opt.value)}
                className="text-left p-2.5 rounded-lg border border-ink-100 bg-cream-50 hover:bg-gold-50 hover:border-gold-300 transition-colors"
              >
                <p className="text-sm font-medium text-ink-900">{opt.label}</p>
                <p className="text-xs text-ink-500 font-mono mt-0.5">{opt.value}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Custom */}
        <div className="border-t border-ink-100 pt-4">
          <p className="luxury-label text-gold-700 mb-2">Ou digite um nome personalizado:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ex: numero_do_cartao"
              className="flex-1 rounded-md border border-ink-200 bg-cream-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customName.trim()) {
                  onConfirm(customName.trim())
                }
              }}
            />
            <Button
              variant="gold"
              disabled={!customName.trim()}
              onClick={() => onConfirm(customName.trim())}
            >
              Confirmar
            </Button>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Será convertido para <code>{`{{${customName.trim().toLowerCase().replace(/\s+/g, '_') || 'nome_da_variavel'}}}`}</code>
          </p>
        </div>

        <div className="flex justify-end pt-2 border-t border-ink-100">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}