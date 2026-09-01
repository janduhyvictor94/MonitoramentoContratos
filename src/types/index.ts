export interface Patient {
  id: string
  codigo: number
  nome: string
  cpf?: string
  data_nascimento?: string
  sexo?: 'Masculino' | 'Feminino' | 'Outro'
  telefone?: string
  email?: string
  plano_saude?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  cid?: string
  observacoes?: string
  status: 'Ativo' | 'Inativo' | 'Aguardando' | 'Alta'
  proxima_consulta?: string
  created_at: string
  updated_at: string
}

export interface ContractTemplate {
  id: string
  nome: string
  descricao?: string
  conteudo: string
  conteudo_html?: string
  arquivo_original_nome?: string
  formato_original?: string
  variaveis: string[]
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface TemplateVariable {
  id: string
  chave: string
  label: string
  descricao?: string
  valor_padrao?: string
  categoria: string
  created_at: string
}

export interface Contract {
  id: string
  patient_id: string
  template_id?: string
  titulo: string
  conteudo_final: string
  conteudo_html_final?: string
  variaveis_usadas: Record<string, string>
  status: 'gerado' | 'assinado' | 'cancelado'
  data_assinatura?: string
  observacoes?: string
  signature_token?: string
  signature_image?: string
  signature_ip?: string
  signature_date?: string
  signature_method?: string
  signature_signer_name?: string
  sent_for_signature_at?: string
  created_at: string
  updated_at: string
  patient?: Patient
  template?: ContractTemplate
}

export interface Appointment {
  id: string
  patient_id: string
  data_consulta: string
  tipo?: string
  procedimento?: string
  cid?: string
  valor?: number
  forma_pagamento?: string
  observacoes?: string
  created_at: string
  patient?: Patient
}

export interface Anamnese {
  id: string
  patient_id: string
  token: string
  status: 'pendente' | 'preenchida'
  respostas: Record<string, any>
  interesse_score?: number
  investimento_score?: number
  potencial?: 'Alto' | 'Médio' | 'Baixo'
  mesmo_dia?: 'Sim' | 'Não' | 'Talvez'
  confirm_nome?: string
  sent_at?: string
  preenchida_em?: string
  created_at: string
  updated_at: string
  patient?: Patient
}

export interface ClinicSetting {
  id: string
  key: string
  value?: string
  label: string
  category: string
}

export interface DashboardStats {
  totalPatients: number
  activePatients: number
  contractsThisMonth: number
  appointmentsThisMonth: number
  upcomingAppointments: number
}