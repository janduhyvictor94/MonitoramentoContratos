import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, Badge, Button, EmptyState, Spinner, Modal } from '@/components/ui'
import { getInitials, getStatusColor, formatDate } from '@/lib/utils'
import {
  FolderOpen, FileText, Search, ChevronRight, Trash2,
  Phone, Mail, Calendar, CreditCard, MapPin, FileCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Patient } from '@/types'

// ── Folder index ──────────────────────────────────────────────────────────
function FolderIndex() {
  const [search, setSearch] = useState('')

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients-folders', search],
    queryFn: async () => {
      let q = supabase
        .from('patients')
        .select('id,codigo,nome,status,plano_saude,proxima_consulta,telefone')
        .order('nome')
      if (search) q = q.ilike('nome', `%${search}%`)
      const { data } = await q
      return data ?? []
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="luxury-label text-gold-700">Arquivo</p>
        <h2 className="heading-serif text-3xl mt-1">Pastas dos Pacientes</h2>
      </div>

      <div className="gold-divider" />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="w-full rounded-md border border-ink-200 bg-cream-50 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (patients ?? []).length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={32} />}
          title="Nenhuma pasta encontrada"
          description="Cadastre pacientes para criar as pastas."
          action={<Link to="/pacientes"><Button variant="gold">Ir para Pacientes</Button></Link>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(patients as Patient[]).map((p) => (
            <Link key={p.id} to={`/pastas/${p.id}`} className="group block">
              <Card className="hover:border-gold-400 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800 text-sm font-bold group-hover:bg-gold-200 transition-colors">
                    {getInitials(p.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 truncate group-hover:text-gold-700 transition-colors">
                      {p.nome}
                    </p>
                    <p className="text-xs text-ink-400 font-mono">#{(p as any).codigo}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
                  <Badge label={p.status} className={getStatusColor(p.status)} />
                  <ChevronRight size={14} className="text-ink-300 group-hover:text-gold-600 transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Patient folder ────────────────────────────────────────────────────────
function PatientFolder({ id }: { id: string }) {
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data } = await supabase.from('patients').select('*').eq('id', id).single()
      return data as Patient
    },
  })

  const { data: contracts } = useQuery({
    queryKey: ['patient-contracts', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id,titulo,status,created_at,data_assinatura')
        .eq('patient_id', id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: appointments } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', id)
        .order('data_consulta', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })

  const deleteContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase.from('contracts').delete().eq('id', contractId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-contracts', id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success('Contrato excluído.')
      setDeleteContractId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!patient) return <p className="text-center text-ink-500 py-16">Paciente não encontrado.</p>

  const info = [
    { icon: Phone, label: 'Telefone', value: patient.telefone },
    { icon: Mail, label: 'E-mail', value: patient.email },
    { icon: Calendar, label: 'Nascimento', value: formatDate(patient.data_nascimento) },
    { icon: CreditCard, label: 'CPF', value: patient.cpf },
    { icon: FileCheck, label: 'Plano', value: patient.plano_saude ?? 'Particular' },
    { icon: MapPin, label: 'Cidade', value: [patient.cidade, patient.estado].filter(Boolean).join(' - ') },
  ]

  const contractToDelete = (contracts as any[] ?? []).find((c) => c.id === deleteContractId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-ink-500">
        <Link to="/pastas" className="hover:text-gold-700 flex items-center gap-1">
          <FolderOpen size={14} /> Pastas
        </Link>
        <ChevronRight size={14} />
        <span className="text-ink-900 font-medium">{patient.nome}</span>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800 text-xl font-bold">
            {getInitials(patient.nome)}
          </div>
          <div className="flex-1">
            <p className="luxury-label text-gold-700 mb-1">Paciente #{(patient as any).codigo}</p>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="heading-serif text-2xl">{patient.nome}</h2>
              <Badge label={patient.status} className={getStatusColor(patient.status)} />
            </div>
            <p className="text-sm text-ink-500">
              Cadastrado em {formatDate(patient.created_at)}
            </p>
            {patient.proxima_consulta && (
              <p className="mt-2 text-sm text-gold-700 font-medium">
                Próxima consulta: {formatDate(patient.proxima_consulta)}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={`/contratos/novo?paciente=${patient.id}`}>
              <Button variant="gold" icon={<FileText size={15} />}>Gerar Contrato</Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-ink-100 grid grid-cols-2 lg:grid-cols-3 gap-4">
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={15} className="text-gold-600 shrink-0" />
              <div>
                <p className="text-xs text-ink-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-medium text-ink-900">{value || '—'}</p>
              </div>
            </div>
          ))}
        </div>

        {patient.observacoes && (
          <div className="mt-4 pt-4 border-t border-ink-100">
            <p className="luxury-label text-gold-700 mb-1">Observações</p>
            <p className="text-sm text-ink-700">{patient.observacoes}</p>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card padding={false}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-ink-100">
            <div>
              <p className="luxury-label text-gold-700 mb-0.5">Documentos</p>
              <h3 className="heading-serif text-lg">Contratos ({(contracts ?? []).length})</h3>
            </div>
            <Link to={`/contratos/novo?paciente=${patient.id}`}>
              <Button size="sm" variant="ghost">+ Novo</Button>
            </Link>
          </div>
          <div className="divide-y divide-ink-50">
            {(contracts ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-400">Nenhum contrato gerado.</p>
            ) : (
              (contracts as any[]).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-6 py-4 hover:bg-cream-100 transition-colors group">
                  <Link to={`/contratos/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50">
                      <FileText size={15} className="text-gold-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{c.titulo}</p>
                      <p className="text-xs text-ink-500">{formatDate(c.created_at)}</p>
                    </div>
                    <Badge label={c.status} className={getStatusColor(c.status)} />
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); setDeleteContractId(c.id) }}
                    className="opacity-0 group-hover:opacity-100 rounded-md p-2 text-ink-400 hover:bg-red-50 hover:text-red-500 transition-all"
                    title="Excluir contrato"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card padding={false}>
          <div className="px-6 py-5 border-b border-ink-100">
            <p className="luxury-label text-gold-700 mb-0.5">Atendimentos</p>
            <h3 className="heading-serif text-lg">Histórico ({(appointments ?? []).length})</h3>
          </div>
          <div className="divide-y divide-ink-50">
            {(appointments ?? []).length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-400">Nenhuma consulta registrada.</p>
            ) : (
              (appointments as any[]).map((a) => (
                <div key={a.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-900">
                      {a.tipo ?? 'Consulta'} {a.procedimento ? `— ${a.procedimento}` : ''}
                    </p>
                    <span className="text-xs text-ink-400">{formatDate(a.data_consulta)}</span>
                  </div>
                  {a.observacoes && (
                    <p className="text-xs text-ink-500 mt-1">{a.observacoes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Modal de confirmação de exclusão */}
      <Modal
        open={!!deleteContractId}
        onClose={() => setDeleteContractId(null)}
        title="Excluir contrato"
        size="sm"
      >
        <div className="p-6">
          <p className="text-sm text-ink-700 mb-2">
            Tem certeza que deseja excluir o contrato:
          </p>
          <p className="text-sm font-medium text-ink-900 mb-4 p-3 bg-cream-100 rounded-lg border border-ink-100">
            "{contractToDelete?.titulo}"
          </p>
          <p className="text-xs text-red-600 mb-5">
            ⚠️ Esta ação não pode ser desfeita. O contrato será removido permanentemente.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteContractId(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deleteContractMutation.isPending}
              onClick={() => deleteContractId && deleteContractMutation.mutate(deleteContractId)}
            >
              Excluir Contrato
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function Folders() {
  const { id } = useParams()
  if (id) return <PatientFolder id={id} />
  return <FolderIndex />
}