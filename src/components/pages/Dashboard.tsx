import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { StatCard, Card, Badge } from '@/components/ui'
import { getInitials, getStatusColor, formatDate } from '@/lib/utils'
import {
  Users, FileText, Calendar, Clock, ArrowRight, Sparkles
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, startOfMonth } from 'date-fns'

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [patientsRes, contractsRes, appointmentsRes, upcomingRes] = await Promise.all([
        supabase.from('patients').select('status', { count: 'exact' }),
        supabase
          .from('contracts')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfMonth(new Date()).toISOString()),
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .gte('data_consulta', format(startOfMonth(new Date()), 'yyyy-MM-dd')),
        supabase
          .from('patients')
          .select('id', { count: 'exact' })
          .gte('proxima_consulta', format(new Date(), 'yyyy-MM-dd')),
      ])
      const active = (patientsRes.data ?? []).filter((p) => p.status === 'Ativo').length
      return {
        total: patientsRes.count ?? 0,
        active,
        contracts: contractsRes.count ?? 0,
        appointments: appointmentsRes.count ?? 0,
        upcoming: upcomingRes.count ?? 0,
      }
    },
  })

  const { data: recentPatients } = useQuery({
    queryKey: ['recent-patients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select('id,codigo,nome,status,plano_saude,proxima_consulta,created_at')
        .order('created_at', { ascending: false })
        .limit(8)
      return data ?? []
    },
  })

  const { data: recentContracts } = useQuery({
    queryKey: ['recent-contracts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('id,titulo,status,created_at,patient_id,patients(nome)')
        .order('created_at', { ascending: false })
        .limit(5)
      return data ?? []
    },
  })

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="flex items-center gap-4">
        <Sparkles size={20} className="text-gold-600" />
        <div>
          <p className="luxury-label text-gold-700">Bem-vinda</p>
          <h2 className="heading-serif text-3xl mt-1">Visão Geral do Instituto</h2>
        </div>
      </div>

      <div className="gold-divider" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total de Pacientes"
          value={stats?.total ?? 0}
          icon={<Users size={22} className="text-gold-700" />}
          color="bg-gold-100"
          sub={`${stats?.active ?? 0} ativos`}
        />
        <StatCard
          label="Contratos no Mês"
          value={stats?.contracts ?? 0}
          icon={<FileText size={22} className="text-ink-800" />}
          color="bg-ink-100"
        />
        <StatCard
          label="Consultas no Mês"
          value={stats?.appointments ?? 0}
          icon={<Calendar size={22} className="text-gold-700" />}
          color="bg-gold-100"
        />
        <StatCard
          label="Próximas Consultas"
          value={stats?.upcoming ?? 0}
          icon={<Clock size={22} className="text-ink-800" />}
          color="bg-ink-100"
        />
      </div>

      {/* Patients + Contracts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Patients */}
        <Card padding={false} className="lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-5 border-b border-ink-100">
            <div>
              <p className="luxury-label text-gold-700 mb-1">Pacientes</p>
              <h3 className="heading-serif text-lg">Cadastros Recentes</h3>
            </div>
            <Link
              to="/pacientes"
              className="flex items-center gap-1.5 text-xs text-gold-700 hover:text-gold-800 font-medium uppercase tracking-wider"
            >
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-ink-50">
            {(recentPatients ?? []).length === 0 && (
              <p className="py-12 text-center text-sm text-ink-400">
                Nenhum paciente cadastrado ainda.
              </p>
            )}
            {(recentPatients ?? []).map((p: any) => (
              <Link
                key={p.id}
                to={`/pastas/${p.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-cream-100 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-800 text-sm font-semibold">
                  {getInitials(p.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{p.nome}</p>
                  <p className="text-xs text-ink-500 truncate mt-0.5">
                    {p.plano_saude ?? 'Sem plano'} ·{' '}
                    {p.proxima_consulta ? formatDate(p.proxima_consulta) : 'sem consulta'}
                  </p>
                </div>
                <Badge label={p.status} className={getStatusColor(p.status)} />
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Contracts */}
        <Card padding={false}>
          <div className="px-6 py-5 border-b border-ink-100">
            <p className="luxury-label text-gold-700 mb-1">Documentos</p>
            <h3 className="heading-serif text-lg">Contratos Recentes</h3>
          </div>
          <div className="divide-y divide-ink-50">
            {(recentContracts ?? []).length === 0 && (
              <p className="py-12 text-center text-sm text-ink-400">Nenhum contrato gerado.</p>
            )}
            {(recentContracts ?? []).map((c: any) => (
              <Link
                key={c.id}
                to={`/contratos/${c.id}`}
                className="block px-6 py-4 hover:bg-cream-100 transition-colors"
              >
                <p className="text-sm font-medium text-ink-900 truncate">{c.titulo}</p>
                <p className="text-xs text-ink-500 truncate mt-0.5">
                  {(c.patients as any)?.nome}
                </p>
                <div className="flex items-center justify-between mt-2.5">
                  <Badge label={c.status} className={getStatusColor(c.status)} />
                  <span className="text-xs text-ink-400">{formatDate(c.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}