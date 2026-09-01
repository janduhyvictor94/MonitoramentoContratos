import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Patient, ClinicSetting } from '@/types'

// ─── Build mapa de variáveis automáticas (paciente + clínica + sistema) ─────
export function buildVariableMap(
  patient: Patient,
  settings: ClinicSetting[],
  extraVars: Record<string, string> = {}
): Record<string, string> {
  const getSetting = (key: string) =>
    settings.find((s) => s.key === key)?.value ?? ''

  const hoje = new Date()

  const map: Record<string, string> = {
    '{{paciente_nome}}': patient.nome,
    '{{paciente_cpf}}': patient.cpf ?? '',
    '{{paciente_rg}}': '',
    '{{paciente_data_nasc}}': patient.data_nascimento
      ? format(new Date(patient.data_nascimento + 'T00:00:00'), 'dd/MM/yyyy')
      : '',
    '{{paciente_email}}': patient.email ?? '',
    '{{paciente_telefone}}': patient.telefone ?? '',
    '{{paciente_plano}}': patient.plano_saude ?? 'Particular',
    '{{paciente_endereco}}': patient.endereco ?? '',
    '{{paciente_bairro}}': '',
    '{{paciente_cep}}': patient.cep ?? '',
    '{{paciente_cidade}}': patient.cidade ?? '',
    '{{paciente_estado}}': patient.estado ?? '',
    '{{paciente_cidade_estado}}': [patient.cidade, patient.estado].filter(Boolean).join(' - '),
    '{{clinica_nome}}': getSetting('nome_clinica'),
    '{{clinica_cnpj}}': getSetting('cnpj'),
    '{{clinica_endereco}}': getSetting('endereco'),
    '{{clinica_telefone}}': getSetting('telefone'),
    '{{clinica_cidade}}': getSetting('cidade_estado'),
    '{{profissional_nome}}': getSetting('profissional_nome'),
    '{{profissional_crf}}': getSetting('crf'),
    '{{data_hoje}}': format(hoje, 'dd/MM/yyyy'),
    '{{data_extenso}}': format(hoje, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
    '{{local_assinatura}}': getSetting('cidade_estado') || 'Petrolina/PE',
    '{{data_assinatura}}': format(hoje, 'dd/MM/yyyy'),
    ...extraVars,
  }

  return map
}

// ─── Aplica variáveis no conteúdo ───────────────────────────────────────────
export function applyVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), value || `[${key}]`)
  }
  return result
}

// ─── Detecta variáveis {{...}} no texto ─────────────────────────────────────
export function detectVariables(content: string): string[] {
  const regex = /\{\{[^}]+\}\}/g
  const matches = content.match(regex) ?? []
  return [...new Set(matches)]
}

// ─── Categorização e labels amigáveis ───────────────────────────────────────
export type VariableCategory =
  | 'paciente' | 'pagamento' | 'procedimento'
  | 'assinatura' | 'testemunha' | 'colaborador' | 'outros'

export interface VariableInfo {
  variable: string        // {{xxx}}
  label: string           // Nome amigável
  category: VariableCategory
  isAuto: boolean         // Preenchida automaticamente do paciente/clínica
  inputType: 'text' | 'date' | 'number' | 'textarea'
  placeholder?: string
}

const VARIABLE_INFO: Record<string, Omit<VariableInfo, 'variable'>> = {
  // ─── Paciente (auto) ───
  '{{paciente_nome}}':         { label: 'Nome do Paciente',     category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_cpf}}':          { label: 'CPF do Paciente',      category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_rg}}':           { label: 'RG do Paciente',       category: 'paciente', isAuto: false, inputType: 'text', placeholder: '00.000.000-0' },
  '{{paciente_rg_orgao}}':     { label: 'Órgão Expedidor',      category: 'paciente', isAuto: false, inputType: 'text', placeholder: 'SSP/PE' },
  '{{paciente_data_nasc}}':    { label: 'Data de Nascimento',   category: 'paciente', isAuto: true,  inputType: 'date' },
  '{{paciente_email}}':        { label: 'E-mail',                category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_telefone}}':     { label: 'Telefone',              category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_plano}}':        { label: 'Plano de Saúde',        category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_endereco}}':     { label: 'Endereço',              category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_bairro}}':       { label: 'Bairro',                category: 'paciente', isAuto: false, inputType: 'text' },
  '{{paciente_complemento}}':  { label: 'Complemento',           category: 'paciente', isAuto: false, inputType: 'text' },
  '{{paciente_cep}}':          { label: 'CEP',                   category: 'paciente', isAuto: true,  inputType: 'text', placeholder: '00000-000' },
  '{{paciente_cidade}}':       { label: 'Cidade',                category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{paciente_estado}}':       { label: 'UF',                    category: 'paciente', isAuto: true,  inputType: 'text', placeholder: 'PE' },
  '{{paciente_cidade_estado}}':{ label: 'Cidade/Estado',         category: 'paciente', isAuto: true,  inputType: 'text' },

  // ─── Pagamento ───
  '{{valor_total}}':            { label: 'Valor Total (R$)',     category: 'pagamento', isAuto: false, inputType: 'number', placeholder: '0,00' },
  '{{valor_consulta}}':         { label: 'Valor da Consulta (R$)', category: 'pagamento', isAuto: false, inputType: 'number', placeholder: '0,00' },
  '{{valor_parcela}}':          { label: 'Valor de Cada Parcela (R$)', category: 'pagamento', isAuto: false, inputType: 'number', placeholder: '0,00' },
  '{{num_parcelas}}':           { label: 'Número de Parcelas',    category: 'pagamento', isAuto: false, inputType: 'number', placeholder: '12' },
  '{{forma_pagamento}}':        { label: 'Forma de Pagamento',    category: 'pagamento', isAuto: false, inputType: 'text', placeholder: 'PIX, Cartão, Boleto...' },
  '{{dia_vencimento}}':         { label: 'Dia do Vencimento Mensal', category: 'pagamento', isAuto: false, inputType: 'number', placeholder: '10' },
  '{{data_primeiro_vencimento}}': { label: 'Data do 1º Vencimento', category: 'pagamento', isAuto: false, inputType: 'date' },
  '{{obs_pagamento}}':          { label: 'Observações do Pagamento', category: 'pagamento', isAuto: false, inputType: 'textarea' },

  // ─── Procedimento ───
  '{{procedimento}}':              { label: 'Descrição do Procedimento', category: 'procedimento', isAuto: false, inputType: 'textarea' },
  '{{procedimento_complemento}}':  { label: 'Complemento da Descrição',  category: 'procedimento', isAuto: false, inputType: 'textarea' },
  '{{procedimento_obs}}':          { label: 'Observações do Procedimento', category: 'procedimento', isAuto: false, inputType: 'textarea' },
  '{{observacoes}}':               { label: 'Observações Adicionais',     category: 'procedimento', isAuto: false, inputType: 'textarea' },
  '{{produtos_materiais}}':        { label: 'Produtos e Materiais Utilizados', category: 'procedimento', isAuto: false, inputType: 'textarea' },
  '{{data_procedimento}}':         { label: 'Data Prevista do Procedimento', category: 'procedimento', isAuto: false, inputType: 'date' },
  '{{numero_sessao}}':             { label: 'Número da Sessão',           category: 'procedimento', isAuto: false, inputType: 'number', placeholder: '1' },

  // ─── Assinatura ───
  '{{local_assinatura}}':       { label: 'Local da Assinatura',  category: 'assinatura', isAuto: true,  inputType: 'text' },
  '{{data_assinatura}}':        { label: 'Data da Assinatura',   category: 'assinatura', isAuto: true,  inputType: 'date' },
  '{{data_hoje}}':              { label: 'Data de Hoje',          category: 'assinatura', isAuto: true,  inputType: 'date' },
  '{{data_extenso}}':           { label: 'Data por Extenso',      category: 'assinatura', isAuto: true,  inputType: 'text' },

  // ─── Testemunhas ───
  '{{testemunha_nome}}':        { label: 'Nome da Testemunha',    category: 'testemunha', isAuto: false, inputType: 'text' },
  '{{testemunha_cpf}}':         { label: 'CPF da Testemunha',     category: 'testemunha', isAuto: false, inputType: 'text', placeholder: '000.000.000-00' },
  '{{testemunha_1_nome}}':      { label: 'Nome da Testemunha 1',  category: 'testemunha', isAuto: false, inputType: 'text' },
  '{{testemunha_1_cpf}}':       { label: 'CPF da Testemunha 1',   category: 'testemunha', isAuto: false, inputType: 'text', placeholder: '000.000.000-00' },
  '{{testemunha_2_nome}}':      { label: 'Nome da Testemunha 2',  category: 'testemunha', isAuto: false, inputType: 'text' },
  '{{testemunha_2_cpf}}':       { label: 'CPF da Testemunha 2',   category: 'testemunha', isAuto: false, inputType: 'text', placeholder: '000.000.000-00' },

  // ─── Colaborador ───
  '{{colaborador_nome}}':       { label: 'Nome do Colaborador',   category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_cpf}}':        { label: 'CPF do Colaborador',    category: 'colaborador', isAuto: false, inputType: 'text', placeholder: '000.000.000-00' },
  '{{colaborador_rg}}':         { label: 'RG do Colaborador',     category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_cargo}}':      { label: 'Cargo',                  category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_funcao}}':     { label: 'Função',                 category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_setor}}':      { label: 'Setor',                  category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_depto}}':      { label: 'Departamento',           category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_admissao}}':   { label: 'Data de Admissão',       category: 'colaborador', isAuto: false, inputType: 'date' },
  '{{colaborador_matricula}}':  { label: 'Matrícula',              category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{colaborador_registro}}':   { label: 'Número de Registro',     category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{gestor_nome}}':            { label: 'Nome do Gestor',         category: 'colaborador', isAuto: false, inputType: 'text' },
  '{{ocorrencia_data}}':        { label: 'Data da Ocorrência',     category: 'colaborador', isAuto: false, inputType: 'date' },
  '{{ocorrencia_descricao}}':   { label: 'Descrição da Ocorrência', category: 'colaborador', isAuto: false, inputType: 'textarea' },
  '{{ocorrencia_motivo}}':      { label: 'Motivo da Ocorrência',   category: 'colaborador', isAuto: false, inputType: 'textarea' },
  '{{ocorrencia_medidas}}':     { label: 'Medidas Corretivas',     category: 'colaborador', isAuto: false, inputType: 'textarea' },

  // ─── Clínica (auto) ───
  '{{clinica_nome}}':           { label: 'Nome da Clínica',       category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{clinica_cnpj}}':           { label: 'CNPJ da Clínica',       category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{clinica_endereco}}':       { label: 'Endereço da Clínica',   category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{clinica_telefone}}':       { label: 'Telefone da Clínica',   category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{clinica_cidade}}':         { label: 'Cidade da Clínica',     category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{profissional_nome}}':      { label: 'Nome do Profissional',  category: 'paciente', isAuto: true,  inputType: 'text' },
  '{{profissional_crf}}':       { label: 'CRF do Profissional',   category: 'paciente', isAuto: true,  inputType: 'text' },
}

// Retorna info amigável de uma variável (ou gera info padrão se não conhecida)
export function getVariableInfo(variable: string): VariableInfo {
  const info = VARIABLE_INFO[variable]
  if (info) return { variable, ...info }

  // Variável desconhecida — tenta categorizar pela chave
  const key = variable.replace(/[{}]/g, '').toLowerCase()
  let category: VariableCategory = 'outros'
  if (key.startsWith('paciente') || key.startsWith('clinica') || key.startsWith('profissional')) category = 'paciente'
  else if (key.includes('valor') || key.includes('pagamento') || key.includes('parcela') || key.includes('vencimento')) category = 'pagamento'
  else if (key.includes('procedimento') || key.includes('produto') || key.includes('sessao') || key.includes('material')) category = 'procedimento'
  else if (key.includes('testemunha')) category = 'testemunha'
  else if (key.includes('colaborador') || key.includes('ocorrencia') || key.includes('gestor')) category = 'colaborador'
  else if (key.includes('data') || key.includes('local') || key.includes('assinatura')) category = 'assinatura'

  // Detecta tipo de input
  let inputType: VariableInfo['inputType'] = 'text'
  if (key.includes('data') || key.includes('nascimento') || key.includes('vencimento') || key.includes('admissao')) inputType = 'date'
  else if (key.includes('valor') || key.includes('parcela') || key.includes('numero')) inputType = 'number'
  else if (key.includes('descricao') || key.includes('observa') || key.includes('motivo') || key.includes('medida') || key.includes('material')) inputType = 'textarea'

  // Label amigável: capitaliza palavras
  const label = key
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return { variable, label, category, isAuto: false, inputType }
}

// Agrupa variáveis em seções, na ordem de exibição
export function groupVariables(
  variables: string[]
): Record<VariableCategory, VariableInfo[]> {
  const groups: Record<VariableCategory, VariableInfo[]> = {
    paciente: [],
    pagamento: [],
    procedimento: [],
    assinatura: [],
    testemunha: [],
    colaborador: [],
    outros: [],
  }

  for (const v of variables) {
    const info = getVariableInfo(v)
    groups[info.category].push(info)
  }

  return groups
}

export const CATEGORY_LABELS: Record<VariableCategory, string> = {
  paciente: 'Dados do Paciente',
  pagamento: 'Pagamento',
  procedimento: 'Procedimento',
  assinatura: 'Local e Data',
  testemunha: 'Testemunhas',
  colaborador: 'Colaborador / Ocorrência',
  outros: 'Outros Campos',
}

export const CATEGORY_ICONS: Record<VariableCategory, string> = {
  paciente: '👤',
  pagamento: '💰',
  procedimento: '📋',
  assinatura: '✍️',
  testemunha: '👥',
  colaborador: '🏢',
  outros: '📌',
}

// ─── Utilitários gerais ──────────────────────────────────────────────────────
export function formatCurrency(value?: number): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr + 'T00:00:00'), 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Ativo: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Inativo: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    Aguardando: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Alta: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    gerado: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    assinado: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    cancelado: 'bg-red-50 text-red-700 ring-red-600/20',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600 ring-gray-500/20'
}