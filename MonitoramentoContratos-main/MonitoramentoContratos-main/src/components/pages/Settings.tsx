import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button, Card, Input } from '@/components/ui'
import { Save, Building2, Phone, User } from 'lucide-react'
import toast from 'react-hot-toast'
import type { ClinicSetting } from '@/types'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  geral: Building2,
  contato: Phone,
  profissional: User,
}

const CATEGORY_LABELS: Record<string, string> = {
  geral: 'Dados do Instituto',
  contato: 'Contato',
  profissional: 'Profissional Responsável',
}

export default function Settings() {
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({})

  const { data: settings, isLoading } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('clinic_settings').select('*').order('category').order('label')
      return data ?? []
    },
  })

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {}
      ;(settings as ClinicSetting[]).forEach((s) => { map[s.key] = s.value ?? '' })
      setValues(map)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(values).map(([key, value]) =>
        supabase.from('clinic_settings').update({ value }).eq('key', key)
      )
      await Promise.all(updates)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-settings'] })
      toast.success('Configurações salvas!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) return <div className="flex justify-center py-16 text-ink-400">Carregando...</div>

  const grouped = ['geral', 'profissional', 'contato'].reduce((acc, cat) => {
    acc[cat] = (settings as ClinicSetting[] ?? []).filter((s) => s.category === cat)
    return acc
  }, {} as Record<string, ClinicSetting[]>)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="luxury-label text-gold-700">Sistema</p>
          <h2 className="heading-serif text-3xl mt-1">Configurações</h2>
        </div>
        <Button variant="gold" icon={<Save size={15} />} loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}>
          Salvar
        </Button>
      </div>

      <div className="gold-divider" />

      <p className="text-sm text-ink-600">
        Estes dados são usados automaticamente nos modelos de contrato.
      </p>

      {Object.entries(grouped).map(([cat, items]) => {
        const Icon = CATEGORY_ICONS[cat] ?? Building2
        if (items.length === 0) return null
        return (
          <Card key={cat}>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100">
                <Icon size={18} className="text-gold-700" />
              </div>
              <div>
                <p className="luxury-label text-gold-700 mb-0.5">Categoria</p>
                <h3 className="heading-serif text-lg">{CATEGORY_LABELS[cat]}</h3>
              </div>
            </div>
            <div className="space-y-3">
              {items.map((s) => (
                <Input
                  key={s.key}
                  label={s.label}
                  value={values[s.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                />
              ))}
            </div>
          </Card>
        )
      })}

      <Card className="bg-gold-50 border-gold-200">
        <p className="luxury-label text-gold-800 mb-2">Variáveis automáticas no contrato</p>
        <p className="text-sm text-ink-800">
          Os dados aqui preenchidos ficam disponíveis automaticamente como variáveis{' '}
          <code className="bg-ink-900 text-gold-300 px-2 py-0.5 rounded font-mono text-xs">{'{{clinica_nome}}'}</code>{' '}
          e{' '}
          <code className="bg-ink-900 text-gold-300 px-2 py-0.5 rounded font-mono text-xs">{'{{profissional_nome}}'}</code>{' '}
          nos modelos de contrato.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button variant="gold" icon={<Save size={15} />} loading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}>
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}