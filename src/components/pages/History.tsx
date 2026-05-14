import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input, Select, Modal, EmptyState, Spinner } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, Calendar, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const TIPO_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Consulta Inicial', label: 'Consulta Inicial' },
  { value: 'Retorno', label: 'Retorno' },
  { value: 'Avaliação', label: 'Avaliação' },
  { value: 'Procedimento', label: 'Procedimento' },
  { value: 'Exame', label: 'Exame' },
]

const PGTO_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Plano de Saúde', label: 'Plano de Saúde' },
  { value: 'Particular', label: 'Particular' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
  { value: 'Dinheiro', label: 'Dinheiro' },
]

const emptyForm = {
  patient_id: '', data_consulta: '', tipo: '', procedimento: '',
  cid: '', valor: '', forma_pagamento: '', observacoes: '',
}

export default function History() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const qc = useQueryClient()

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', search],
    queryFn: async () => {
      let q = supabase
        .from('appointments')
        .select('*, patients(nome,codigo)')
        .order('data_consulta', { ascending: false })
      if (search) q = q.ilike('patients.nome', `%${search}%`)
      const { data } = await q
      return data ?? []
    },
  })

  const { data: patients } = useQuery({
    queryKey: ['patients-select'],
    queryFn: async () => {
      const { data } = await supabase.from('patients').select('id,nome,codigo').order('nome')
      return data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('appointments').insert({
        ...form,
        valor: form.valor ? parseFloat(form.valor) : null,
        data_consulta: form.data_consulta,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Consulta registrada!')
      setShowModal(false)
      setForm(emptyForm)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const patientOptions = [
    { value: '', label: 'Selecione um paciente...' },
    ...(patients as any[] ?? []).map((p: any) => ({ value: p.id, label: `${p.nome} (#${p.codigo})` })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="luxury-label text-gold-700">Atendimentos</p>
          <h2 className="heading-serif text-3xl mt-1">Histórico de Consultas</h2>
        </div>
        <Button variant="gold" icon={<Plus size={15} />} onClick={() => setShowModal(true)}>
          Registrar Consulta
        </Button>
      </div>

      <div className="gold-divider" />

      <Input placeholder="Buscar por paciente..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={15} />} className="sm:w-72" />

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (appointments ?? []).length === 0 ? (
          <EmptyState
            icon={<Calendar size={32} />}
            title="Nenhuma consulta registrada"
            description="Registre consultas para acompanhar o histórico dos pacientes."
            action={<Button variant="gold" icon={<Plus size={15} />} onClick={() => setShowModal(true)}>Registrar</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-cream-100">
                  {['Data','Paciente','Tipo','Procedimento','CID','Valor','Pagamento','Obs.'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-ink-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {(appointments as any[]).map((a) => (
                  <tr key={a.id} className="hover:bg-cream-100">
                    <td className="px-5 py-4 text-ink-700 whitespace-nowrap">{formatDate(a.data_consulta)}</td>
                    <td className="px-5 py-4 font-medium text-ink-900">{a.patients?.nome ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-700">{a.tipo ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-700">{a.procedimento ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-500 font-mono text-xs">{a.cid ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-700 font-medium">{formatCurrency(a.valor)}</td>
                    <td className="px-5 py-4 text-ink-500">{a.forma_pagamento ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-400 text-xs max-w-[150px] truncate">{a.observacoes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar Consulta" size="lg">
        <form className="px-6 py-5 space-y-4" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate() }}>
          <Select label="Paciente *" options={patientOptions} value={form.patient_id} required
            onChange={(e) => set('patient_id', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data da Consulta *" type="date" required value={form.data_consulta}
              onChange={(e) => set('data_consulta', e.target.value)} />
            <Select label="Tipo" options={TIPO_OPTIONS} value={form.tipo}
              onChange={(e) => set('tipo', e.target.value)} />
            <Input label="Procedimento" value={form.procedimento}
              onChange={(e) => set('procedimento', e.target.value)} />
            <Input label="CID" value={form.cid} placeholder="Ex: F32.0"
              onChange={(e) => set('cid', e.target.value)} />
            <Input label="Valor (R$)" type="number" step="0.01" value={form.valor}
              onChange={(e) => set('valor', e.target.value)} />
            <Select label="Forma de Pagamento" options={PGTO_OPTIONS} value={form.forma_pagamento}
              onChange={(e) => set('forma_pagamento', e.target.value)} />
          </div>
          <Input label="Observações" value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)} />
          <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="gold" type="submit" loading={saveMutation.isPending}>Registrar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}