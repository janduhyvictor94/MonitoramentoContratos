import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, Modal } from '@/components/ui'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { TemplateVariable } from '@/types'

const CATEGORIES = ['paciente', 'clinica', 'sistema', 'custom']
const CATEGORY_LABELS: Record<string, string> = {
  paciente: 'Paciente',
  clinica: 'Clínica',
  sistema: 'Sistema',
  custom: 'Personalizada',
}

const CATEGORY_COLORS: Record<string, string> = {
  paciente: 'bg-blue-50 text-blue-700 border border-blue-200',
  clinica: 'bg-violet-50 text-violet-700 border border-violet-200',
  sistema: 'bg-ink-100 text-ink-700 border border-ink-200',
  custom: 'bg-gold-50 text-gold-800 border border-gold-200',
}

const emptyForm = { chave: '', label: '', descricao: '', valor_padrao: '', categoria: 'custom' }

export default function Variables() {
  const [showModal, setShowModal] = useState(false)
  const [editingVar, setEditingVar] = useState<TemplateVariable | null>(null)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data: variables } = useQuery({
    queryKey: ['template-variables-all'],
    queryFn: async () => {
      const { data } = await supabase.from('template_variables').select('*').order('categoria').order('label')
      return data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const chave = form.chave.startsWith('{{') ? form.chave : `{{${form.chave.replace(/[{}]/g, '')}}}`
      const payload = { ...form, chave }
      if (editingVar) {
        const { error } = await supabase.from('template_variables').update(payload).eq('id', editingVar.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('template_variables').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-variables-all'] })
      qc.invalidateQueries({ queryKey: ['template-variables'] })
      toast.success(editingVar ? 'Variável atualizada!' : 'Variável criada!')
      closeModal()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('template_variables').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['template-variables-all'] })
      toast.success('Variável removida.')
    },
  })

  function openEdit(v: TemplateVariable) {
    setEditingVar(v)
    setForm({
      chave: v.chave, label: v.label, descricao: v.descricao ?? '',
      valor_padrao: v.valor_padrao ?? '', categoria: v.categoria
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingVar(null)
    setForm(emptyForm)
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = (variables as TemplateVariable[] ?? []).filter(v => v.categoria === cat)
    return acc
  }, {} as Record<string, TemplateVariable[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="luxury-label text-gold-700">Sistema</p>
          <h2 className="heading-serif text-3xl mt-1">Variáveis</h2>
        </div>
        <Button variant="gold" icon={<Plus size={15} />}
          onClick={() => { setEditingVar(null); setForm(emptyForm); setShowModal(true) }}>
          Nova Variável
        </Button>
      </div>

      <div className="gold-divider" />

      <Card className="bg-gold-50 border-gold-200">
        <p className="luxury-label text-gold-800 mb-2">Como usar nos contratos</p>
        <p className="text-sm text-ink-800">
          Variáveis são marcadores escritos entre chaves duplas. Exemplo:{' '}
          <code className="bg-ink-900 text-gold-300 px-2 py-0.5 rounded font-mono text-xs">{'{{paciente_nome}}'}</code>{' '}
          é substituído pelo nome real do paciente ao gerar o contrato.
        </p>
      </Card>

      {CATEGORIES.map((cat) => {
        const vars = grouped[cat] ?? []
        if (vars.length === 0) return null
        return (
          <div key={cat}>
            <p className="luxury-label text-ink-600 mb-3 px-1">
              {CATEGORY_LABELS[cat]}
            </p>
            <Card padding={false}>
              <div className="divide-y divide-ink-50">
                {vars.map((v) => (
                  <div key={v.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream-100 transition-colors">
                    <code className={`rounded-md px-3 py-1.5 text-xs font-mono shrink-0 ${CATEGORY_COLORS[v.categoria]}`}>
                      {v.chave}
                    </code>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900">{v.label}</p>
                      {v.descricao && <p className="text-xs text-ink-500 mt-0.5">{v.descricao}</p>}
                      {v.valor_padrao && <p className="text-xs text-ink-500 mt-0.5">Padrão: {v.valor_padrao}</p>}
                    </div>
                    {v.categoria === 'custom' && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(v)} className="p-2 rounded-md hover:bg-cream-200 text-ink-400 hover:text-ink-700">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(v.id)} className="p-2 rounded-md hover:bg-red-50 text-ink-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      })}

      <Modal open={showModal} onClose={closeModal} title={editingVar ? 'Editar Variável' : 'Nova Variável'} size="md">
        <form className="px-6 py-5 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}>
          <Input
            label="Chave (nome) *"
            value={form.chave}
            required
            placeholder="Ex: valor_consulta"
            hint="Será formatado automaticamente como {{valor_consulta}}"
            onChange={(e) => setForm(f => ({ ...f, chave: e.target.value }))}
          />
          <Input label="Rótulo *" value={form.label} required
            placeholder="Ex: Valor da Consulta"
            onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} />
          <Input label="Descrição" value={form.descricao}
            onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} />
          <Input label="Valor Padrão" value={form.valor_padrao}
            onChange={(e) => setForm(f => ({ ...f, valor_padrao: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancelar</Button>
            <Button variant="gold" type="submit" loading={saveMutation.isPending}>
              {editingVar ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}