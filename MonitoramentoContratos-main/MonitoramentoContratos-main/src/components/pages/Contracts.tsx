import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button, Card, Badge, Modal, EmptyState, Spinner, Select, Input } from '@/components/ui'
import {
  buildVariableMap, applyVariables, detectVariables,
  getStatusColor, formatDate, groupVariables, getVariableInfo,
  CATEGORY_LABELS, CATEGORY_ICONS,
  type VariableCategory,
} from '@/lib/utils'
import { generatePDF, printElement } from '@/lib/pdf'
import type { SignatureData } from '@/lib/pdf'
import {
  parseWord, parsePDF, detectVariableSuggestions,
  type VariableSuggestion, type ParsedDocument
} from '@/lib/docParser'
import TemplateEditor from '@/components/TemplateEditor'
import SignatureCanvas from '@/components/SignatureCanvas'
import {
  FileText, Plus, Upload, Printer, Download, Eye,
  Pencil, Trash2, ChevronRight, FileCheck, FileUp,
  Link as LinkIcon, MessageCircle, Mail, Copy, PenLine,
  CheckCircle2, Send, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Contract, ContractTemplate, Patient, ClinicSetting, TemplateVariable } from '@/types'

// ─── Contract List ──────────────────────────────────────────────────────────
function ContractList() {
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*, patients(nome,codigo), contract_templates(nome)')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="luxury-label text-gold-700">Documentos</p>
          <h2 className="heading-serif text-3xl mt-1">Contratos</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Upload size={15} />} onClick={() => setShowTemplateModal(true)}>
            Modelos
          </Button>
          <Link to="/contratos/novo">
            <Button variant="gold" icon={<Plus size={15} />}>Novo Contrato</Button>
          </Link>
        </div>
      </div>

      <div className="gold-divider" />

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (contracts ?? []).length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title="Nenhum contrato gerado"
            description="Importe seu primeiro modelo e gere documentos preenchidos automaticamente."
            action={
              <Button variant="gold" icon={<Upload size={15} />} onClick={() => setShowTemplateModal(true)}>
                Importar Modelo
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-cream-100">
                  {['Título','Paciente','Modelo','Data','Status',''].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-ink-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {(contracts as any[]).map((c) => (
                  <tr key={c.id} className="hover:bg-cream-100 transition-colors">
                    <td className="px-5 py-4 font-medium text-ink-900">{c.titulo}</td>
                    <td className="px-5 py-4 text-ink-700">
                      {c.patients ? (
                        <Link to={`/pastas/${c.patient_id}`} className="hover:text-gold-700">
                          {c.patients.nome}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4 text-ink-500 text-xs">{c.contract_templates?.nome ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-500">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-4"><Badge label={c.status} className={getStatusColor(c.status)} /></td>
                    <td className="px-5 py-4">
                      <Link to={`/contratos/${c.id}`}>
                        <button className="rounded-md p-2 text-ink-400 hover:bg-gold-50 hover:text-gold-700 transition-colors">
                          <Eye size={15} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TemplateManagerModal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} />
    </div>
  )
}

// ─── Template Manager Modal ─────────────────────────────────────────────────
function TemplateManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<'list' | 'upload' | 'editor' | 'edit'>('list')
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null)
  const [initialSugs, setInitialSugs] = useState<VariableSuggestion[]>([])
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const qc = useQueryClient()

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from('contract_templates').select('*').order('nome')
      return data ?? []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contract_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Modelo removido.')
    },
  })

  const templatesList = (templates ?? []) as ContractTemplate[]

  const handleClose = () => {
    setView('list')
    setParsedDoc(null)
    setInitialSugs([])
    setEditingTemplate(null)
    onClose()
  }

  const handleBackToList = () => {
    setView('list')
    setParsedDoc(null)
    setInitialSugs([])
    setEditingTemplate(null)
  }

  const modalSize = view === 'editor' ? 'full' : 'lg'

  return (
    <Modal open={open} onClose={handleClose} title="Modelos de Contrato" size={modalSize}>
      {view === 'list' && (
        <div className="p-6 space-y-3">
          <Button variant="gold" icon={<FileUp size={15} />} onClick={() => setView('upload')}>
            Importar Word/PDF
          </Button>

          {templatesList.length === 0 ? (
            <p className="text-center text-sm text-ink-400 py-12">
              Nenhum modelo ainda. Clique em "Importar Word/PDF" para começar.
            </p>
          ) : (
            templatesList.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-lg border border-ink-100 hover:border-gold-300 hover:bg-cream-100 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-50">
                  <FileText size={18} className="text-gold-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink-900">{t.nome}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {t.descricao || 'Sem descrição'} · {(t.variaveis ?? []).length} variáveis
                  </p>
                </div>
                <button
                  onClick={() => { setEditingTemplate(t); setView('edit') }}
                  className="p-2 rounded-md hover:bg-cream-200 text-ink-400 hover:text-ink-700 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remover modelo "${t.nome}"?`)) deleteMutation.mutate(t.id)
                  }}
                  className="p-2 rounded-md hover:bg-red-50 text-ink-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'upload' && (
        <UploadView
          onCancel={handleBackToList}
          onParsed={(doc, sugs) => {
            setParsedDoc(doc)
            setInitialSugs(sugs)
            setView('editor')
          }}
        />
      )}

      {view === 'editor' && parsedDoc && (
        <TemplateEditor
          parsed={parsedDoc}
          initialSuggestions={initialSugs}
          onCancel={handleBackToList}
          onSaved={handleBackToList}
        />
      )}

      {view === 'edit' && editingTemplate && (
        <EditTemplateView
          template={editingTemplate}
          onCancel={handleBackToList}
          onSaved={handleBackToList}
        />
      )}
    </Modal>
  )
}

// ─── Upload View ────────────────────────────────────────────────────────────
function UploadView({
  onCancel,
  onParsed,
}: {
  onCancel: () => void
  onParsed: (doc: ParsedDocument, sugs: VariableSuggestion[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParsing(true)
    try {
      let result: ParsedDocument
      const ext = file.name.toLowerCase()

      if (ext.endsWith('.docx')) result = await parseWord(file)
      else if (ext.endsWith('.pdf')) result = await parsePDF(file)
      else {
        toast.error('Formato não suportado. Use .docx ou .pdf')
        setParsing(false)
        return
      }

      const detected = detectVariableSuggestions(result.text)
      toast.success(`${detected.length} variáveis detectadas`)
      onParsed(result, detected)
    } catch (err: any) {
      toast.error('Erro ao ler arquivo: ' + err.message)
      setParsing(false)
    }
  }

  return (
    <div className="p-6">
      <div
        onClick={() => !parsing && fileInputRef.current?.click()}
        className="border-2 border-dashed border-ink-200 hover:border-gold-400 hover:bg-cream-100 transition-all rounded-xl p-12 text-center cursor-pointer"
      >
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} />
            <p className="text-sm text-ink-600">Lendo arquivo...</p>
          </div>
        ) : (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-gold-100 flex items-center justify-center mb-4">
              <FileUp size={28} className="text-gold-700" />
            </div>
            <p className="heading-serif text-lg mb-2">Importar contrato</p>
            <p className="text-sm text-ink-500 mb-1">Clique para selecionar um arquivo</p>
            <p className="text-xs text-ink-400">Formatos aceitos: .docx (Word) e .pdf</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )
}

// ─── Edit Template View ─────────────────────────────────────────────────────
function EditTemplateView({
  template, onCancel, onSaved,
}: {
  template: ContractTemplate
  onCancel: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(template.nome)
  const [descricao, setDescricao] = useState(template.descricao ?? '')
  const [conteudo, setConteudo] = useState(template.conteudo)
  const qc = useQueryClient()

  const { data: knownVars } = useQuery({
    queryKey: ['template-variables'],
    queryFn: async () => {
      const { data } = await supabase.from('template_variables').select('*').order('categoria')
      return data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const variaveis = detectVariables(conteudo)
      const { error } = await supabase
        .from('contract_templates')
        .update({ nome, descricao, conteudo, variaveis })
        .eq('id', template.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      toast.success('Modelo atualizado!')
      onSaved()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const varsList = (knownVars ?? []) as TemplateVariable[]

  return (
    <form
      className="p-6 space-y-4"
      onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}
    >
      <Input label="Nome do Modelo *" required value={nome} onChange={(e) => setNome(e.target.value)} />
      <Input label="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

      <div className="rounded-lg bg-cream-100 p-4 border border-ink-100">
        <p className="luxury-label text-gold-700 mb-2">Variáveis disponíveis (clique para inserir):</p>
        <div className="flex flex-wrap gap-1.5">
          {varsList.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setConteudo((c) => c + v.chave)}
              className="rounded px-2 py-1 bg-ink-900 text-gold-300 text-xs font-mono hover:bg-ink-800 transition-colors"
              title={v.label}
            >
              {v.chave}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-ink-700 uppercase tracking-wider block mb-1.5">
          Conteúdo do Contrato *
        </label>
        <textarea
          required
          rows={16}
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          className="w-full rounded-md border border-ink-200 bg-cream-50 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gold-400 resize-y"
        />
        <p className="mt-1 text-xs text-ink-500">
          Variáveis detectadas: {detectVariables(conteudo).join(', ') || 'nenhuma'}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
        <Button variant="secondary" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="gold" type="submit" loading={saveMutation.isPending}>Salvar</Button>
      </div>
    </form>
  )
}

// ─── Contract Generator ─────────────────────────────────────────────────────
function ContractGenerator() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const preselectedPatient = searchParams.get('paciente')

  const [selectedPatient, setSelectedPatient] = useState(preselectedPatient ?? '')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [titulo, setTitulo] = useState('')
  const [extraVars, setExtraVars] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const { data: patients } = useQuery({
    queryKey: ['patients-select'],
    queryFn: async () => {
      const { data } = await supabase.from('patients').select('id,nome,codigo').order('nome')
      return data ?? []
    },
  })

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contract_templates').select('*').eq('ativo', true).order('nome')
      return data ?? []
    },
  })

  const { data: settings } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('clinic_settings').select('*')
      return data ?? []
    },
  })

  const { data: patientData } = useQuery({
    queryKey: ['patient-full', selectedPatient],
    enabled: !!selectedPatient,
    queryFn: async () => {
      const { data } = await supabase.from('patients').select('*').eq('id', selectedPatient).single()
      return data as Patient
    },
  })

  const patientsList = (patients ?? []) as Patient[]
  const templatesList = (templates ?? []) as ContractTemplate[]
  const settingsList = (settings ?? []) as ClinicSetting[]

  const selectedTemplateData = templatesList.find(t => t.id === selectedTemplate)

  const templateVariables = selectedTemplateData
    ? detectVariables(selectedTemplateData.conteudo)
    : []
  const grouped = groupVariables(templateVariables)

  const autoVarMap = patientData
    ? buildVariableMap(patientData, settingsList, {})
    : {}

  function generatePreview() {
    if (!patientData || !selectedTemplateData) return
    const allVars = { ...buildVariableMap(patientData, settingsList, extraVars), ...extraVars }
    const filled = applyVariables(selectedTemplateData.conteudo, allVars)
    const filledHtml = selectedTemplateData.conteudo_html
      ? applyVariables(selectedTemplateData.conteudo_html, allVars)
      : ''
    setPreview(filled)
    setPreviewHtml(filledHtml)
    setStep(3)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!patientData || !selectedTemplateData) throw new Error('Dados incompletos')
      const allVars = { ...buildVariableMap(patientData, settingsList, extraVars), ...extraVars }
      const { error, data } = await supabase.from('contracts').insert({
        patient_id: selectedPatient,
        template_id: selectedTemplate,
        titulo: titulo || `${selectedTemplateData.nome} — ${patientData.nome}`,
        conteudo_final: preview,
        conteudo_html_final: previewHtml,
        variaveis_usadas: allVars,
        status: 'gerado',
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrato gerado!')
      navigate(`/contratos/${data.id}`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const patientOptions = [
    { value: '', label: 'Selecione um paciente...' },
    ...patientsList.map(p => ({ value: p.id, label: `${p.nome} (#${(p as any).codigo})` }))
  ]

  const templateOptions = [
    { value: '', label: 'Selecione um modelo...' },
    ...templatesList.map(t => ({ value: t.id, label: t.nome }))
  ]

  const sectionOrder: VariableCategory[] = [
    'paciente', 'procedimento', 'pagamento', 'assinatura',
    'testemunha', 'colaborador', 'outros'
  ]

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link to="/contratos" className="hover:text-gold-700 flex items-center gap-1">
          <FileText size={14} /> Contratos
        </Link>
        <ChevronRight size={14} />
        <span className="text-ink-900 font-medium">Novo Contrato</span>
      </div>

      <div>
        <p className="luxury-label text-gold-700">Gerador</p>
        <h2 className="heading-serif text-3xl mt-1">Novo Contrato</h2>
      </div>

      <div className="flex items-center gap-3">
        {[
          { n: 1, label: 'Paciente e Modelo' },
          { n: 2, label: 'Preencher Variáveis' },
          { n: 3, label: 'Pré-visualizar' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === s.n ? 'bg-gold-600 text-white' :
              step > s.n ? 'bg-emerald-600 text-white' :
              'bg-ink-200 text-ink-500'
            }`}>
              {step > s.n ? <CheckCircle2 size={16} /> : s.n}
            </div>
            <span className={`text-sm font-medium ${step === s.n ? 'text-ink-900' : 'text-ink-500'}`}>
              {s.label}
            </span>
            {i < 2 && <ChevronRight size={16} className="text-ink-300" />}
          </div>
        ))}
      </div>

      <div className="gold-divider" />

      {step === 1 && (
        <Card>
          <div className="space-y-5">
            <Select label="Paciente *" options={patientOptions} value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)} />
            <Select label="Modelo de Contrato *" options={templateOptions} value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)} />
            <Input label="Título do Contrato (opcional)" value={titulo}
              placeholder="Ex: Contrato de Prestação de Serviços"
              onChange={(e) => setTitulo(e.target.value)} />

            <div className="flex justify-end pt-2">
              <Button
                variant="gold"
                disabled={!selectedPatient || !selectedTemplate}
                onClick={() => setStep(2)}
                icon={<ChevronRight size={15} />}
              >
                Continuar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <>
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>← Voltar</Button>
            <Button variant="gold" onClick={generatePreview} icon={<Eye size={15} />}>
              Pré-visualizar
            </Button>
          </div>

          {sectionOrder.map((cat) => {
            const vars = grouped[cat]
            if (!vars || vars.length === 0) return null

            const autoVars = vars.filter(v => v.isAuto)
            const manualVars = vars.filter(v => !v.isAuto)

            return (
              <Card key={cat} padding={false}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-cream-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                    <div>
                      <p className="luxury-label text-gold-700">Seção</p>
                      <h3 className="heading-serif text-lg">{CATEGORY_LABELS[cat]}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {autoVars.length > 0 && (
                      <Badge label={`${autoVars.length} auto`} className="bg-emerald-50 text-emerald-700 ring-emerald-600/20" />
                    )}
                    {manualVars.length > 0 && (
                      <Badge label={`${manualVars.length} preencher`} className="bg-gold-50 text-gold-800 ring-gold-600/20" />
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {autoVars.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={12} /> Preenchidos automaticamente
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {autoVars.map((info) => (
                          <div key={info.variable} className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                            <p className="text-xs font-medium text-ink-600">{info.label}</p>
                            <p className="text-sm text-ink-900 font-medium truncate">
                              {autoVarMap[info.variable] || <span className="text-ink-400">— vazio —</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {manualVars.length > 0 && (
                    <div className="space-y-3">
                      {autoVars.length > 0 && (
                        <p className="text-xs font-medium text-gold-700 uppercase tracking-wider pt-2 border-t border-ink-100">
                          A preencher
                        </p>
                      )}
                      <div className={`grid gap-4 ${manualVars.some(v => v.inputType === 'textarea') ? '' : 'sm:grid-cols-2'}`}>
                        {manualVars.map((info) => (
                          <div key={info.variable} className={info.inputType === 'textarea' ? 'col-span-full' : ''}>
                            {info.inputType === 'textarea' ? (
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-ink-700 uppercase tracking-wider">
                                  {info.label}
                                </label>
                                <textarea
                                  rows={3}
                                  value={extraVars[info.variable] ?? ''}
                                  placeholder={info.placeholder}
                                  onChange={(e) => setExtraVars(ev => ({ ...ev, [info.variable]: e.target.value }))}
                                  className="w-full rounded-md border border-ink-200 bg-cream-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-y"
                                />
                              </div>
                            ) : (
                              <Input
                                label={info.label}
                                type={info.inputType}
                                placeholder={info.placeholder}
                                value={extraVars[info.variable] ?? ''}
                                onChange={(e) => setExtraVars(ev => ({ ...ev, [info.variable]: e.target.value }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}

          <div className="flex justify-end">
            <Button variant="gold" onClick={generatePreview} icon={<Eye size={15} />} size="lg">
              Pré-visualizar Contrato
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>← Voltar e Editar</Button>
            <Button
              variant="gold"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              icon={<FileCheck size={15} />}
            >
              Salvar Contrato
            </Button>
          </div>
          <Card>
            {previewHtml ? (
              <div className="contract-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <div className="contract-content whitespace-pre-wrap">{preview}</div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Contract Viewer ────────────────────────────────────────────────────────
function ContractViewer({ id }: { id: string }) {
  const contractRef = useRef<HTMLDivElement>(null)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const qc = useQueryClient()

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*, patients(*), contract_templates(nome)')
        .eq('id', id)
        .single()
      return data as any
    },
  })

  const signMutation = useMutation({
    mutationFn: async ({
      signatureDataUrl,
      signerName,
      signerCpf,
    }: {
      signatureDataUrl: string
      signerName: string
      signerCpf: string
    }) => {
      const { error } = await supabase.from('contracts')
        .update({
          status: 'assinado',
          signature_image: signatureDataUrl,
          signature_signer_name: signerName,
          signature_signer_cpf: signerCpf,
          signature_method: 'presencial',
          signature_date: new Date().toISOString(),
          data_assinatura: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrato assinado!')
      setShowSignModal(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!contract) return <p className="text-center text-ink-500 py-16">Contrato não encontrado.</p>

  const isSigned = contract.status === 'assinado'
  const signatureUrl = `${window.location.origin}/assinar/${contract.signature_token}`

  // ✅ Monta o objeto de assinatura reutilizável
  function getSignatureData(): SignatureData | undefined {
    if (!isSigned || !contract?.signature_image) return undefined
    return {
      dataUrl: contract.signature_image,
      signerName: contract.signature_signer_name,
      signerCpf: contract.signature_signer_cpf ?? undefined,
      signedAt: formatDate(contract.data_assinatura),
    }
  }

  // ✅ PDF: esconde o bloco DOM e injeta via jsPDF
  async function handlePDF() {
    if (!contractRef.current) return
    setDownloadingPdf(true)
    try {
      const sigData = getSignatureData()
      await generatePDF(contractRef.current, contract!.titulo, {
        signatureImage: sigData?.dataUrl,
        signatureData: sigData,
      })
      toast.success('PDF baixado!')
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + e.message)
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ✅ Impressão: remove o bloco DOM e injeta HTML limpo da assinatura
  function handlePrint() {
    if (!contractRef.current) return
    printElement(contractRef.current, contract!.titulo, getSignatureData())
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link to="/contratos" className="hover:text-gold-700 flex items-center gap-1">
          <FileText size={14} /> Contratos
        </Link>
        <ChevronRight size={14} />
        <span className="text-ink-900 font-medium truncate">{contract.titulo}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge label={contract.status} className={getStatusColor(contract.status)} />
        {contract.patients && (
          <Link to={`/pastas/${contract.patient_id}`} className="text-sm text-gold-700 hover:underline">
            {contract.patients.nome}
          </Link>
        )}
        <span className="text-sm text-ink-400">{formatDate(contract.created_at)}</span>
      </div>

      {!isSigned && (
        <Card className="bg-gold-50 border-gold-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="luxury-label text-gold-800 mb-1">Aguardando Assinatura</p>
              <p className="text-sm text-ink-700">Escolha como o paciente vai assinar:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<Send size={14} />} onClick={() => setShowSendModal(true)}>
                Enviar para Assinar
              </Button>
              <Button variant="gold" icon={<PenLine size={14} />} onClick={() => setShowSignModal(true)}>
                Assinar Agora (Presencial)
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isSigned && (
        <Card className="bg-emerald-50 border-emerald-200">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div>
              <p className="luxury-label text-emerald-800 mb-1">Contrato Assinado</p>
              <p className="text-sm text-ink-700">
                Assinado por <strong>{contract.signature_signer_name}</strong>
                {contract.signature_signer_cpf && (
                  <> · CPF {contract.signature_signer_cpf}</>
                )}
                {' '}em {formatDate(contract.data_assinatura)}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
          Imprimir
        </Button>
        <Button
          variant="gold"
          size="sm"
          icon={<Download size={14} />}
          onClick={handlePDF}
          loading={downloadingPdf}
        >
          Baixar PDF
        </Button>
      </div>

      <Card>
        <div ref={contractRef} className="contract-content">
          {contract.conteudo_html_final ? (
            <div dangerouslySetInnerHTML={{ __html: contract.conteudo_html_final }} />
          ) : (
            <div className="whitespace-pre-wrap">{contract.conteudo_final}</div>
          )}

          {/* ✅ data-signature-block: identificado pelo pdf.ts para ser
              ocultado antes do html2canvas e injetado limpo via jsPDF */}
          {isSigned && contract.signature_image && (
            <div data-signature-block className="mt-12 pt-8 border-t-2 border-ink-200">
              <p className="luxury-label text-gold-700 mb-3">Assinatura do Paciente</p>
              <div className="bg-white border border-ink-100 rounded-lg p-4 inline-block">
                <img
                  src={contract.signature_image}
                  alt="Assinatura"
                  style={{ maxWidth: 300, maxHeight: 120 }}
                />
                <div className="mt-2 pt-2 border-t border-ink-200 text-center">
                  <p className="text-sm font-medium text-ink-900">{contract.signature_signer_name}</p>
                  {contract.signature_signer_cpf && (
                    <p className="text-xs text-ink-600">CPF: {contract.signature_signer_cpf}</p>
                  )}
                  <p className="text-xs text-ink-500 mt-0.5">
                    Assinado em {formatDate(contract.data_assinatura)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <SendForSignatureModal
        open={showSendModal}
        onClose={() => setShowSendModal(false)}
        contract={contract}
        signatureUrl={signatureUrl}
      />

      <Modal open={showSignModal} onClose={() => setShowSignModal(false)} title="Assinatura Presencial" size="2xl">
        <div className="p-6">
          <p className="text-sm text-ink-600 mb-4">
            Passe o dispositivo para o paciente preencher nome, CPF e assinar abaixo:
          </p>
          <SignatureCanvas
            signerNameDefault={contract.patients?.nome ?? ''}
            signerCpfDefault={contract.patients?.cpf ?? ''}
            loading={signMutation.isPending}
            onConfirm={(dataUrl, name, cpf) =>
              signMutation.mutate({ signatureDataUrl: dataUrl, signerName: name, signerCpf: cpf })
            }
          />
        </div>
      </Modal>
    </div>
  )
}

// ─── Modal: Enviar para Assinatura ──────────────────────────────────────────
function SendForSignatureModal({
  open, onClose, contract, signatureUrl,
}: {
  open: boolean
  onClose: () => void
  contract: any
  signatureUrl: string
}) {
  const qc = useQueryClient()

  function copyLink() {
    navigator.clipboard.writeText(signatureUrl)
    toast.success('Link copiado!')
  }

  async function markAsSent() {
    await supabase.from('contracts')
      .update({ sent_for_signature_at: new Date().toISOString() })
      .eq('id', contract.id)
    qc.invalidateQueries({ queryKey: ['contract', contract.id] })
  }

  function openWhatsApp() {
    const phone = contract.patients?.telefone?.replace(/\D/g, '') ?? ''
    const message = `Olá ${contract.patients?.nome ?? ''}! 👋\n\n` +
      `Segue o link para você assinar o contrato "${contract.titulo}" do Instituto Bruna Braga:\n\n` +
      `${signatureUrl}\n\n` +
      `É só clicar, ler com atenção e desenhar sua assinatura. Qualquer dúvida, estamos à disposição. 💛`

    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    markAsSent()
  }

  function openEmail() {
    const email = contract.patients?.email ?? ''
    const subject = `Contrato para assinatura — Instituto Bruna Braga`
    const body = `Olá ${contract.patients?.nome ?? ''},\n\n` +
      `Segue o link para você assinar o contrato "${contract.titulo}":\n\n` +
      `${signatureUrl}\n\n` +
      `Basta clicar, ler com atenção e desenhar sua assinatura.\n\n` +
      `Atenciosamente,\nInstituto Bruna Braga`
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
    markAsSent()
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar Contrato para Assinatura" size="lg">
      <div className="p-6 space-y-5">
        <p className="text-sm text-ink-600">
          Compartilhe o link abaixo com o paciente para que ele possa assinar digitalmente:
        </p>

        <div className="rounded-lg border border-ink-200 bg-cream-100 p-3 flex items-center gap-2">
          <LinkIcon size={15} className="text-gold-700 shrink-0" />
          <code className="flex-1 text-xs text-ink-700 truncate">{signatureUrl}</code>
          <Button variant="gold" size="sm" icon={<Copy size={13} />} onClick={copyLink}>
            Copiar
          </Button>
        </div>

        <div className="gold-divider" />

        <p className="luxury-label text-gold-700">Compartilhar diretamente</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openWhatsApp}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-ink-100 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 group-hover:bg-emerald-500 transition-colors">
              <MessageCircle size={18} className="text-emerald-700 group-hover:text-white transition-colors" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-ink-900">WhatsApp</p>
              <p className="text-xs text-ink-500">Abre com mensagem pronta</p>
            </div>
          </button>

          <button
            onClick={openEmail}
            className="flex items-center gap-3 p-4 rounded-lg border-2 border-ink-100 hover:border-gold-400 hover:bg-gold-50 transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 group-hover:bg-gold-500 transition-colors">
              <Mail size={18} className="text-gold-700 group-hover:text-white transition-colors" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-ink-900">E-mail</p>
              <p className="text-xs text-ink-500">Abre seu app de e-mail</p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-ink-100">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Route dispatcher ───────────────────────────────────────────────────────
export default function Contracts() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  if (id === 'novo') return <ContractGenerator />
  if (searchParams.has('paciente') && !id) return <ContractGenerator />
  if (id) return <ContractViewer id={id} />
  return <ContractList />
}