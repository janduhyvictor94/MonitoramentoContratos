import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface ParsedDocument {
  html: string
  text: string
  format: 'docx' | 'pdf'
  fileName: string
}

export interface VariableSuggestion {
  id: string
  texto: string
  tipo: VariableType
  sugestao: string
  ocorrencias: number
  aceito: boolean
  contexto?: string         // texto ao redor do campo (ajuda a nomear)
  precisaNomear?: boolean   // true = sistema não soube nomear, usuário precisa decidir
}

export type VariableType =
  | 'cpf' | 'cnpj' | 'rg' | 'cep' | 'telefone' | 'email'
  | 'data' | 'data_em_branco' | 'valor' | 'valor_em_branco'
  | 'nome_maiusculo' | 'campo_em_branco' | 'parcelas' | 'manual'
  | 'precisa_nomear'

export async function parseWord(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  const text = await mammoth.extractRawText({ arrayBuffer })
  ;(window as any).__debugTexto = text.value
  return {
    html: result.value,
    text: text.value,
    format: 'docx',
    fileName: file.name,
  }
}

export async function parsePDF(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  let html = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(' ')
    text += pageText + '\n\n'
    html += `<p>${pageText.replace(/\n/g, '<br>')}</p>\n`
  }
  return { html, text, format: 'pdf', fileName: file.name }
}

function normalizarRotulo(rotulo: string): string {
  return rotulo
    .trim()
    .replace(/^[\s\*\•\-—–\d\.\)]+/, '')
    .replace(/[\*\:\-—–\s]+$/, '')
    .replace(/\s*\(.*?\)\s*$/g, '')
    .replace(/^[A-ZÁÉÍÓÚÃÕÇ][a-záéíóúãõç]+\/[A-Z]{2}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 30)
}

// ─── Mapa de rótulos conhecidos ─────────────────────────────────────────────
const ROTULOS_CONHECIDOS: Record<string, { sugestao: string; tipo: VariableType }> = {
  'nome': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'nome completo': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'nome do paciente': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'nome do paciente para assinatura': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'nome do paciente anexo i': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'nome do paciente para autorizacao de imagem': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'nome do contratante': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'paciente': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'contratante': { sugestao: '{{paciente_nome}}', tipo: 'nome_maiusculo' },
  'cpf': { sugestao: '{{paciente_cpf}}', tipo: 'cpf' },
  'cpf do paciente': { sugestao: '{{paciente_cpf}}', tipo: 'cpf' },
  'cpf do paciente para assinatura': { sugestao: '{{paciente_cpf}}', tipo: 'cpf' },
  'cpf do paciente anexo i': { sugestao: '{{paciente_cpf}}', tipo: 'cpf' },
  'cpf do paciente para autorizacao de imagem': { sugestao: '{{paciente_cpf}}', tipo: 'cpf' },
  'rg': { sugestao: '{{paciente_rg}}', tipo: 'rg' },
  'rg do paciente': { sugestao: '{{paciente_rg}}', tipo: 'rg' },
  'identidade': { sugestao: '{{paciente_rg}}', tipo: 'rg' },
  'orgao expedidor': { sugestao: '{{paciente_rg_orgao}}', tipo: 'campo_em_branco' },
  'data de nascimento': { sugestao: '{{paciente_data_nasc}}', tipo: 'data_em_branco' },
  'nascimento': { sugestao: '{{paciente_data_nasc}}', tipo: 'data_em_branco' },
  'telefone': { sugestao: '{{paciente_telefone}}', tipo: 'telefone' },
  'celular': { sugestao: '{{paciente_telefone}}', tipo: 'telefone' },
  'whatsapp': { sugestao: '{{paciente_telefone}}', tipo: 'telefone' },
  'email': { sugestao: '{{paciente_email}}', tipo: 'email' },
  'e-mail': { sugestao: '{{paciente_email}}', tipo: 'email' },
  'endereco': { sugestao: '{{paciente_endereco}}', tipo: 'campo_em_branco' },
  'rua': { sugestao: '{{paciente_endereco}}', tipo: 'campo_em_branco' },
  'cep': { sugestao: '{{paciente_cep}}', tipo: 'cep' },
  'cidade': { sugestao: '{{paciente_cidade}}', tipo: 'campo_em_branco' },
  'estado': { sugestao: '{{paciente_estado}}', tipo: 'campo_em_branco' },
  'uf': { sugestao: '{{paciente_estado}}', tipo: 'campo_em_branco' },
  'bairro': { sugestao: '{{paciente_bairro}}', tipo: 'campo_em_branco' },
  'complemento': { sugestao: '{{paciente_complemento}}', tipo: 'campo_em_branco' },
  'valor': { sugestao: '{{valor_total}}', tipo: 'valor_em_branco' },
  'valor total': { sugestao: '{{valor_total}}', tipo: 'valor_em_branco' },
  'valor total do tratamento': { sugestao: '{{valor_total}}', tipo: 'valor_em_branco' },
  'valor da consulta': { sugestao: '{{valor_consulta}}', tipo: 'valor_em_branco' },
  'valor de cada parcela': { sugestao: '{{valor_parcela}}', tipo: 'valor_em_branco' },
  'valor da parcela': { sugestao: '{{valor_parcela}}', tipo: 'valor_em_branco' },
  'forma de pagamento': { sugestao: '{{forma_pagamento}}', tipo: 'campo_em_branco' },
  'numero de parcelas': { sugestao: '{{num_parcelas}}', tipo: 'campo_em_branco' },
  'dia do vencimento mensal': { sugestao: '{{dia_vencimento}}', tipo: 'campo_em_branco' },
  'dia do vencimento': { sugestao: '{{dia_vencimento}}', tipo: 'campo_em_branco' },
  'data do primeiro vencimento': { sugestao: '{{data_primeiro_vencimento}}', tipo: 'data_em_branco' },
  'primeiro vencimento': { sugestao: '{{data_primeiro_vencimento}}', tipo: 'data_em_branco' },
  'observacoes do pagamento': { sugestao: '{{obs_pagamento}}', tipo: 'campo_em_branco' },
  'descricao do procedimento': { sugestao: '{{procedimento}}', tipo: 'campo_em_branco' },
  'descricao': { sugestao: '{{procedimento}}', tipo: 'campo_em_branco' },
  'complemento da descricao': { sugestao: '{{procedimento_complemento}}', tipo: 'campo_em_branco' },
  'observacoes do procedimento': { sugestao: '{{procedimento_obs}}', tipo: 'campo_em_branco' },
  'observacoes': { sugestao: '{{observacoes}}', tipo: 'campo_em_branco' },
  'observacoes adicionais': { sugestao: '{{observacoes}}', tipo: 'campo_em_branco' },
  'produtos e materiais utilizados': { sugestao: '{{produtos_materiais}}', tipo: 'campo_em_branco' },
  'produtos utilizados': { sugestao: '{{produtos_materiais}}', tipo: 'campo_em_branco' },
  'materiais utilizados': { sugestao: '{{produtos_materiais}}', tipo: 'campo_em_branco' },
  'data prevista': { sugestao: '{{data_procedimento}}', tipo: 'data_em_branco' },
  'data prevista do procedimento': { sugestao: '{{data_procedimento}}', tipo: 'data_em_branco' },
  'numero da sessao': { sugestao: '{{numero_sessao}}', tipo: 'campo_em_branco' },
  'local da assinatura': { sugestao: '{{local_assinatura}}', tipo: 'campo_em_branco' },
  'data da assinatura': { sugestao: '{{data_assinatura}}', tipo: 'data_em_branco' },
  'local e data': { sugestao: '{{local_assinatura}}', tipo: 'campo_em_branco' },
  'local da autorizacao': { sugestao: '{{local_assinatura}}', tipo: 'campo_em_branco' },
  'data da autorizacao': { sugestao: '{{data_assinatura}}', tipo: 'data_em_branco' },
  'local da autorizacao de imagem': { sugestao: '{{local_assinatura}}', tipo: 'campo_em_branco' },
  'data da autorizacao de imagem': { sugestao: '{{data_assinatura}}', tipo: 'data_em_branco' },
  'nome da testemunha': { sugestao: '{{testemunha_nome}}', tipo: 'nome_maiusculo' },
  'cpf da testemunha': { sugestao: '{{testemunha_cpf}}', tipo: 'cpf' },
  'nome da testemunha 1': { sugestao: '{{testemunha_1_nome}}', tipo: 'nome_maiusculo' },
  'cpf da testemunha 1': { sugestao: '{{testemunha_1_cpf}}', tipo: 'cpf' },
  'nome da testemunha 2': { sugestao: '{{testemunha_2_nome}}', tipo: 'nome_maiusculo' },
  'cpf da testemunha 2': { sugestao: '{{testemunha_2_cpf}}', tipo: 'cpf' },
  'nome do colaborador': { sugestao: '{{colaborador_nome}}', tipo: 'nome_maiusculo' },
  'cpf do colaborador': { sugestao: '{{colaborador_cpf}}', tipo: 'cpf' },
  'rg do colaborador': { sugestao: '{{colaborador_rg}}', tipo: 'rg' },
  'cargo': { sugestao: '{{colaborador_cargo}}', tipo: 'campo_em_branco' },
  'funcao': { sugestao: '{{colaborador_funcao}}', tipo: 'campo_em_branco' },
  'setor': { sugestao: '{{colaborador_setor}}', tipo: 'campo_em_branco' },
  'departamento': { sugestao: '{{colaborador_depto}}', tipo: 'campo_em_branco' },
  'data de admissao': { sugestao: '{{colaborador_admissao}}', tipo: 'data_em_branco' },
  'matricula': { sugestao: '{{colaborador_matricula}}', tipo: 'campo_em_branco' },
  'numero de registro': { sugestao: '{{colaborador_registro}}', tipo: 'campo_em_branco' },
  'cnpj': { sugestao: '{{clinica_cnpj}}', tipo: 'cnpj' },
  'razao social': { sugestao: '{{clinica_nome}}', tipo: 'nome_maiusculo' },
  'data da ocorrencia': { sugestao: '{{ocorrencia_data}}', tipo: 'data_em_branco' },
  'descricao detalhada da ocorrencia': { sugestao: '{{ocorrencia_descricao}}', tipo: 'campo_em_branco' },
  'motivo da nao execucao ou execucao incorreta': { sugestao: '{{ocorrencia_motivo}}', tipo: 'campo_em_branco' },
  'medidas corretivas propostas pelo colaborador': { sugestao: '{{ocorrencia_medidas}}', tipo: 'campo_em_branco' },
  'nome do gestor': { sugestao: '{{gestor_nome}}', tipo: 'nome_maiusculo' },
}

function getRotuloMatch(rotulo: string): { sugestao: string; tipo: VariableType } | null {
  const semAcento = normalizarRotulo(rotulo)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (ROTULOS_CONHECIDOS[semAcento]) return ROTULOS_CONHECIDOS[semAcento]
  const comAcento = normalizarRotulo(rotulo).toLowerCase()
  if (ROTULOS_CONHECIDOS[comAcento]) return ROTULOS_CONHECIDOS[comAcento]
  return null
}

function isRotuloValido(rotulo: string): boolean {
  const limpo = normalizarRotulo(rotulo)
  if (limpo.length < 2 || limpo.length > 60) return false
  if (/^\d+$/.test(limpo)) return false
  if (/^(cláusula|clausula|parágrafo|paragrafo|§|art\.|artigo)/i.test(limpo)) return false
  if (!/[a-zA-ZáéíóúãõçÁÉÍÓÚÃÕÇ]/.test(limpo)) return false
  if (limpo.split(/\s+/).length > 7) return false
  return true
}

// ═════════════════════════════════════════════════════════════════════════════
// DETECÇÃO PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export function detectVariableSuggestions(text: string): VariableSuggestion[] {
  const sugestoesMap = new Map<string, VariableSuggestion>()
  const occupiedRanges: Array<[number, number]> = []
  let idCounter = 0

  function isOverlap(start: number, end: number): boolean {
    return occupiedRanges.some(([s, e]) => !(end <= s || start >= e))
  }

  function add(
    texto: string,
    sugestao: string,
    tipo: VariableType,
    range: [number, number],
    contexto?: string,
    precisaNomear?: boolean
  ): void {
    occupiedRanges.push(range)
    const existing = sugestoesMap.get(sugestao)
    if (existing) {
      existing.ocorrencias++
      return
    }
    sugestoesMap.set(sugestao, {
      id: `var-${++idCounter}-${Math.random().toString(36).slice(2, 7)}`,
      texto,
      tipo,
      sugestao,
      ocorrencias: 1,
      aceito: !precisaNomear,  // só aceita automaticamente se SOUBER o nome
      contexto,
      precisaNomear,
    })
  }

  let match: RegExpExecArray | null

  // ─── ETAPA 1: RÓTULO + R$ + UNDERLINE ───
  const labelMoneyRegex = /([A-ZÁÉÍÓÚÃÕÇa-záéíóúãõç][A-ZÁÉÍÓÚÃÕÇa-záéíóúãõçA-Za-z \t\-]{1,50}?)\s*:\s*R\$\s*_{2,}/g
  while ((match = labelMoneyRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const rotulo = match[1].trim().replace(/\s+/g, ' ')
    if (!isRotuloValido(rotulo)) continue
    const knownMatch = getRotuloMatch(rotulo)
    const slug = slugify(normalizarRotulo(rotulo))
    if (!slug) continue
    add(match[0], knownMatch?.sugestao ?? `{{${slug}}}`, 'valor_em_branco', range)
  }

  // ─── ETAPA 2: RÓTULO + DATA EM BRANCO ───
  const labelDateRegex = /([A-ZÁÉÍÓÚÃÕÇa-záéíóúãõç][A-ZÁÉÍÓÚÃÕÇa-záéíóúãõçA-Za-z \t\-]{1,50}?)\s*:\s*_{2,}\s*\/\s*_{2,}\s*\/\s*_{2,}/g
  while ((match = labelDateRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const rotulo = match[1].trim().replace(/\s+/g, ' ')
    if (!isRotuloValido(rotulo)) continue
    const knownMatch = getRotuloMatch(rotulo)
    const slug = slugify(normalizarRotulo(rotulo))
    if (!slug) continue
    add(match[0], knownMatch?.sugestao ?? `{{data_${slug}}}`, 'data_em_branco', range)
  }

  // ─── ETAPA 3: RÓTULO + UNDERLINE (mesma linha) ───
  const labelUnderlineRegex = /([A-ZÁÉÍÓÚÃÕÇa-záéíóúãõç][A-ZÁÉÍÓÚÃÕÇa-záéíóúãõçA-Za-z0-9 \t\/\-]{1,50}?)\s*:\s*_{3,}/g
  while ((match = labelUnderlineRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const rotulo = match[1].trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')
    if (!isRotuloValido(rotulo)) continue
    const knownMatch = getRotuloMatch(rotulo)
    const slug = slugify(normalizarRotulo(rotulo))
    if (!slug) continue
    const sugestao = knownMatch?.sugestao ?? `{{${slug}}}`
    const tipo = knownMatch?.tipo ?? 'campo_em_branco'
    add(match[0], sugestao, tipo, range)
  }

  // ─── ETAPA 3.5: RÓTULO EM UMA LINHA + UNDERLINE NA LINHA DE BAIXO ───
  const labelMultilineRegex = /([A-ZÁÉÍÓÚÃÕÇa-záéíóúãõç][A-ZÁÉÍÓÚÃÕÇa-záéíóúãõçA-Za-z0-9 \t\-]{1,60}?)\s*:\s*\n+\s*_{5,}/g
  while ((match = labelMultilineRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const rotulo = match[1].trim().replace(/\s+/g, ' ')
    if (!isRotuloValido(rotulo)) continue
    const knownMatch = getRotuloMatch(rotulo)
    const slug = slugify(normalizarRotulo(rotulo))
    if (!slug) continue
    const sugestao = knownMatch?.sugestao ?? `{{${slug}}}`
    const tipo = knownMatch?.tipo ?? 'campo_em_branco'
    add(match[0], sugestao, tipo, range)
  }

  // ─── ETAPA 4: PADRÕES BR PREENCHIDOS ───
  const dataPatterns: Array<{ regex: RegExp; tipo: VariableType; sugestao: string }> = [
    { regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, tipo: 'cpf', sugestao: '{{paciente_cpf}}' },
    { regex: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, tipo: 'cnpj', sugestao: '{{clinica_cnpj}}' },
    { regex: /\b\d{2}\/\d{2}\/\d{4}\b/g, tipo: 'data', sugestao: '{{data_hoje}}' },
    { regex: /R\$\s*[\d.,]+/g, tipo: 'valor', sugestao: '{{valor_total}}' },
    { regex: /\b\d{5}-\d{3}\b/g, tipo: 'cep', sugestao: '{{paciente_cep}}' },
    { regex: /\(\d{2}\)\s*\d{4,5}-\d{4}/g, tipo: 'telefone', sugestao: '{{paciente_telefone}}' },
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, tipo: 'email', sugestao: '{{paciente_email}}' },
  ]

  for (const { regex, tipo, sugestao } of dataPatterns) {
    const re = new RegExp(regex.source, 'g')
    while ((match = re.exec(text)) !== null) {
      if (match[0].includes('{{')) continue
      const range: [number, number] = [match.index, match.index + match[0].length]
      if (isOverlap(range[0], range[1])) continue
      add(match[0], sugestao, tipo, range)
    }
  }

  // ─── ETAPA 5: DATAS EM BRANCO ISOLADAS ───
  const isolatedDateRegex = /_{2,}\s*\/\s*_{2,}\s*\/\s*_{2,}/g
  while ((match = isolatedDateRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    add(match[0], '{{data_assinatura}}', 'data_em_branco', range)
  }

  // ─── ETAPA 6: CAMPOS EM BRANCO ISOLADOS — PRECISAM SER NOMEADOS ───
  // Em vez de criar {{campo_1}} automaticamente, marca como "precisa nomear"
  // O usuário decide o nome no editor
  const isolatedBlankRegex = /_{8,}/g
  let blankCount = 1
  while ((match = isolatedBlankRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue

    const lineStart = text.lastIndexOf('\n', match.index) + 1
    const lineEnd = text.indexOf('\n', match.index)
    const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    const lineWithoutUnderscores = line.replace(/_/g, '').trim()
    if (lineWithoutUnderscores.length < 2) continue  // pula linhas só com _

    // Pega contexto: 80 chars antes do underline (geralmente tem alguma pista do que é o campo)
    const contextStart = Math.max(0, match.index - 80)
    const contextEnd = Math.min(text.length, range[1] + 20)
    const contexto = text.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim()

    add(
      match[0],
      `{{campo_pendente_${blankCount}}}`,
      'precisa_nomear',
      range,
      contexto,
      true  // precisaNomear = true
    )
    blankCount++
  }

  return Array.from(sugestoesMap.values())
}

export function applySuggestions(content: string, suggestions: VariableSuggestion[]): string {
  let result = content
  const accepted = suggestions
    .filter((s) => s.aceito)
    .sort((a, b) => b.texto.length - a.texto.length)
  for (const s of accepted) {
    const escaped = s.texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), s.sugestao)
  }
  return result
}

export const tipoLabels: Record<VariableType, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
  cep: 'CEP',
  telefone: 'Telefone',
  email: 'E-mail',
  data: 'Data',
  data_em_branco: 'Data em branco',
  valor: 'Valor',
  valor_em_branco: 'Valor a preencher',
  nome_maiusculo: 'Nome',
  campo_em_branco: 'Campo em branco',
  parcelas: 'Parcelas',
  manual: 'Manual',
  precisa_nomear: '⚠️ Precisa nomear',
}

export const tipoColors: Record<VariableType, string> = {
  cpf: 'bg-blue-50 text-blue-700 border-blue-200',
  cnpj: 'bg-violet-50 text-violet-700 border-violet-200',
  rg: 'bg-pink-50 text-pink-700 border-pink-200',
  cep: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  telefone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  email: 'bg-teal-50 text-teal-700 border-teal-200',
  data: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  data_em_branco: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  valor: 'bg-amber-50 text-amber-700 border-amber-200',
  valor_em_branco: 'bg-amber-50 text-amber-700 border-amber-200',
  nome_maiusculo: 'bg-rose-50 text-rose-700 border-rose-200',
  campo_em_branco: 'bg-gold-50 text-gold-800 border-gold-200',
  parcelas: 'bg-orange-50 text-orange-700 border-orange-200',
  manual: 'bg-ink-100 text-ink-700 border-ink-200',
  precisa_nomear: 'bg-red-50 text-red-700 border-red-300',
}