import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Button, Input, Select, Card, Badge, Modal, EmptyState, Spinner, Textarea
} from '@/components/ui'
import { getInitials, getStatusColor, formatDate } from '@/lib/utils'
import { Plus, Search, UserPlus, Pencil, Trash2, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Patient } from '@/types'
import { Link } from 'react-router-dom'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
  { value: 'Aguardando', label: 'Aguardando' },
  { value: 'Alta', label: 'Alta' },
]

const SEXO_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Outro', label: 'Outro' },
]

const PATIENT_STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
  { value: 'Aguardando', label: 'Aguardando' },
  { value: 'Alta', label: 'Alta' },
]

const emptyForm = {
  nome: '', cpf: '', data_nascimento: '', sexo: '' as any, telefone: '',
  email: '', plano_saude: '', endereco: '', cidade: '', estado: '', cep: '',
  cid: '', observacoes: '', status: 'Ativo' as any, proxima_consulta: '',
}

export default function Patients() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients', search, filterStatus],
    queryFn: async () => {
      let q = supabase.from('patients').select('*').order('nome')
      if (search) q = q.ilike('nome', `%${search}%`)
      if (filterStatus) q = q.eq('status', filterStatus)
      const { data } = await q
      return data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        data_nascimento: data.data_nascimento || null,
        proxima_consulta: data.proxima_consulta || null,
        sexo: data.sexo || null,
      }
      if (editingPatient) {
        const { error } = await supabase.from('patients').update(payload).eq('id', editingPatient.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('patients').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(editingPatient ? 'Paciente atualizado!' : 'Paciente cadastrado!')
      closeModal()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Paciente removido.')
      setDeleteConfirm(null)
    },
  })

  function openNew() {
    setEditingPatient(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(p: Patient) {
    setEditingPatient(p)
    setForm({
      nome: p.nome, cpf: p.cpf ?? '', data_nascimento: p.data_nascimento ?? '',
      sexo: p.sexo ?? '', telefone: p.telefone ?? '', email: p.email ?? '',
      plano_saude: p.plano_saude ?? '', endereco: p.endereco ?? '',
      cidade: p.cidade ?? '', estado: p.estado ?? '', cep: p.cep ?? '',
      cid: p.cid ?? '', observacoes: p.observacoes ?? '', status: p.status,
      proxima_consulta: p.proxima_consulta ?? '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingPatient(null)
    setForm(emptyForm)
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="luxury-label text-gold-700">Cadastro</p>
          <h2 className="heading-serif text-3xl mt-1">Pacientes</h2>
        </div>
        <Button variant="gold" icon={<Plus size={16} />} onClick={openNew}>
          Novo Paciente
        </Button>
      </div>

      <div className="gold-divider" />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={15} />}
          className="sm:w-72"
        />
        <Select
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="sm:w-44"
        />
      </div>

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (patients ?? []).length === 0 ? (
          <EmptyState
            icon={<UserPlus size={32} />}
            title="Nenhum paciente encontrado"
            description="Cadastre o primeiro paciente para começar."
            action={<Button variant="gold" icon={<Plus size={16} />} onClick={openNew}>Novo Paciente</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-cream-100">
                  {['#','Paciente','CPF','Telefone','Plano','Próx. Consulta','Status',''].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-ink-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {(patients as Patient[]).map((p) => (
                  <tr key={p.id} className="hover:bg-cream-100 transition-colors">
                    <td className="px-5 py-4 text-ink-400 text-xs font-mono">#{p.codigo}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800 text-xs font-semibold">
                          {getInitials(p.nome)}
                        </div>
                        <div>
                          <p className="font-medium text-ink-900">{p.nome}</p>
                          <p className="text-xs text-ink-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-ink-700">{p.cpf ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-700">{p.telefone ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-700">{p.plano_saude ?? '—'}</td>
                    <td className="px-5 py-4 text-ink-700">{formatDate(p.proxima_consulta)}</td>
                    <td className="px-5 py-4">
                      <Badge label={p.status} className={getStatusColor(p.status)} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/pastas/${p.id}`}
                          className="rounded-md p-2 text-ink-400 hover:bg-gold-50 hover:text-gold-700 transition-colors"
                          title="Pasta"
                        >
                          <FolderOpen size={15} />
                        </Link>
                        <button
                          onClick={() => openEdit(p)}
                          className="rounded-md p-2 text-ink-400 hover:bg-cream-200 hover:text-ink-700 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="rounded-md p-2 text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Patient Form Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
        size="2xl"
      >
        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form) }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome Completo *" value={form.nome} required
                onChange={(e) => set('nome', e.target.value)} />
            </div>
            <Input label="CPF" value={form.cpf} placeholder="000.000.000-00"
              onChange={(e) => set('cpf', e.target.value)} />
            <Input label="Data de Nascimento" type="date" value={form.data_nascimento}
              onChange={(e) => set('data_nascimento', e.target.value)} />
            <Select label="Sexo" options={SEXO_OPTIONS} value={form.sexo}
              onChange={(e) => set('sexo', e.target.value)} />
            <Input label="Telefone" value={form.telefone} placeholder="(00) 00000-0000"
              onChange={(e) => set('telefone', e.target.value)} />
            <div className="col-span-2">
              <Input label="E-mail" type="email" value={form.email}
                onChange={(e) => set('email', e.target.value)} />
            </div>
            <Input label="Plano de Saúde" value={form.plano_saude} placeholder="Particular"
              onChange={(e) => set('plano_saude', e.target.value)} />
            <Input label="CID / Diagnóstico" value={form.cid}
              onChange={(e) => set('cid', e.target.value)} />
            <div className="col-span-2">
              <Input label="Endereço" value={form.endereco}
                onChange={(e) => set('endereco', e.target.value)} />
            </div>
            <Input label="Cidade" value={form.cidade}
              onChange={(e) => set('cidade', e.target.value)} />
            <Input label="Estado" value={form.estado} placeholder="PE"
              onChange={(e) => set('estado', e.target.value)} />
            <Input label="CEP" value={form.cep} placeholder="00000-000"
              onChange={(e) => set('cep', e.target.value)} />
            <Select label="Status" options={PATIENT_STATUS_OPTIONS} value={form.status}
              onChange={(e) => set('status', e.target.value as any)} />
            <Input label="Próxima Consulta" type="date" value={form.proxima_consulta}
              onChange={(e) => set('proxima_consulta', e.target.value)} />
            <div className="col-span-2">
              <Textarea label="Observações" value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-ink-100">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancelar</Button>
            <Button variant="gold" type="submit" loading={saveMutation.isPending}>
              {editingPatient ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar exclusão" size="sm">
        <div className="px-6 py-5">
          <p className="text-sm text-ink-700 mb-4">
            Tem certeza que deseja excluir este paciente? Todos os contratos e histórico serão removidos.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" loading={deleteMutation.isPending}
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}