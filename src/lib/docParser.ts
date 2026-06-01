import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

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
  contexto?: string
  precisaNomear?: boolean
}

export type VariableType =
  | 'cpf' | 'cnpj' | 'rg' | 'cep' | 'telefone' | 'email'
  | 'data' | 'data_em_branco' | 'valor' | 'valor_em_branco'
  | 'nome_maiusculo' | 'campo_em_branco' | 'parcelas' | 'manual'
  | 'precisa_nomear'

const CONTRACT_STYLES = `
<style>
  .contract-doc {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000000;
    max-width: 100%;
  }
  .contract-doc p {
    margin: 0 0 8pt 0;
    text-align: justify;
  }
  .contract-doc p.sem-espaco {
    margin: 0;
  }
  .contract-doc p.centralizado {
    text-align: center;
  }
  .contract-doc p.direita {
    text-align: right;
  }
  .contract-doc h1 {
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    margin: 12pt 0 6pt;
    text-transform: uppercase;
  }
  .contract-doc h2 {
    font-size: 11pt;
    font-weight: bold;
    margin: 10pt 0 4pt;
  }
  .contract-doc h3 {
    font-size: 11pt;
    font-weight: bold;
    margin: 8pt 0 4pt;
  }
  .contract-doc h4 {
    font-size: 11pt;
    font-weight: bold;
    margin: 6pt 0 2pt;
  }
  .contract-doc ul {
    margin: 4pt 0 8pt 0;
    padding-left: 28pt;
    list-style-type: disc;
  }
  .contract-doc ol {
    margin: 4pt 0 8pt 0;
    padding-left: 28pt;
  }
  .contract-doc li {
    margin-bottom: 3pt;
    text-align: justify;
  }
  .contract-doc table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    font-size: 11pt;
  }
  .contract-doc td, .contract-doc th {
    border: 1px solid #000;
    padding: 3pt 6pt;
    vertical-align: top;
  }
  .contract-doc strong, .contract-doc b { font-weight: bold; }
  .contract-doc em, .contract-doc i { font-style: italic; }
  .contract-doc u { text-decoration: underline; }
  .contract-doc .linha-assinatura {
    display: inline-block;
    border-bottom: 1px solid #000;
    vertical-align: bottom;
    min-height: 1em;
  }
</style>
`

export async function parseWord(file: File): Promise<ParsedDocument> {
  const arrayBuffer = await file.arrayBuffer()

  const styleMap = [
    "p[style-name='heading 1'] => h1:fresh",
    "p[style-name='heading 2'] => h2:fresh",
    "p[style-name='heading 3'] => h3:fresh",
    "p[style-name='heading 4'] => h4:fresh",
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Heading 4'] => h4:fresh",
    "p[style-name='Title'] => h1:fresh",
    "p[style-name='Título'] => h1:fresh",
    "p[style-name='Subtitle'] => h2:fresh",
    "p[style-name='Subtítulo'] => h2:fresh",
    "p[style-name='List Paragraph'] => li:fresh",
    "p[style-name='List Bullet'] => li:fresh",
    "p[style-name='List Number'] => li:fresh",
    "p[style-name='Parágrafo da Lista'] => li:fresh",
    "p[style-name='Com marcadores'] => li:fresh",
    "p[style-name='Numerada'] => li:fresh",
    "p[style-name='Lista'] => li:fresh",
    "p[style-name='Body Text'] => p:fresh",
    "p[style-name='Corpo de texto'] => p:fresh",
    "p[style-name='Body Text 2'] => p:fresh",
    "p[style-name='Normal'] => p:fresh",
    "p[style-name='Default'] => p:fresh",
    "p[style-name='No Spacing'] => p.sem-espaco:fresh",
    "p[style-name='Sem Espaçamento'] => p.sem-espaco:fresh",
    "r[style-name='Strong'] => strong",
    "r[style-name='Forte'] => strong",
    "r[style-name='Emphasis'] => em",
    "r[style-name='Ênfase'] => em",
    "p[style-name='Header'] => !",
    "p[style-name='Cabeçalho'] => !",
    "p[style-name='Footer'] => !",
    "p[style-name='Rodapé'] => !",
  ]

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap,
      convertImage: mammoth.images.imgElement(async (image: any) => {
        const base64 = await image.read('base64')
        return { src: `data:${image.contentType};base64,${base64}` }
      }),
    }
  )

  const textResult = await mammoth.extractRawText({ arrayBuffer })
  ;(window as any).__debugTexto = textResult.value

  let html = result.value

  // Parágrafos vazios → espaçadores
  html = html.replace(/<p>\s*<\/p>/g, '<p style="margin:4pt 0;">&nbsp;</p>')

  // Underlines (___) → linha visual
  html = html.replace(/_{3,}/g, (match) => {
    const width = Math.min(match.length * 5.5, 320)
    return `<span class="linha-assinatura" style="width:${width}px;">&nbsp;</span>`
  })

  const finalHtml = `${CONTRACT_STYLES}<div class="contract-doc">${html}</div>`

  return {
    html: finalHtml,
    text: textResult.value,
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
  const finalHtml = `${CONTRACT_STYLES}<div class="contract-doc">${html}</div>`
  return { html: finalHtml, text, format: 'pdf', fileName: file.name }
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
      aceito: !precisaNomear,
      contexto,
      precisaNomear,
    })
  }

  let match: RegExpExecArray | null

  // ─── ETAPA 1: RÓTULO + R$ + UNDERLINE ───────────────────────────────────────
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

  // ─── ETAPA 2: RÓTULO + DATA EM BRANCO ───────────────────────────────────────
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

  // ─── ETAPA 3: RÓTULO + UNDERLINE (mesma linha) ──────────────────────────────
  const labelUnderlineRegex = /([A-ZÁÉÍÓÚÃÕÇa-záéíóúãõç][A-ZÁÉÍÓÚÃÕÇa-záéíóúãõçA-Za-z0-9 \t\/\-]{1,50}?)\s*:\s*_{3,}/g
  while ((match = labelUnderlineRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const rotulo = match[1].trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ')
    if (!isRotuloValido(rotulo)) continue
    const knownMatch = getRotuloMatch(rotulo)
    const slug = slugify(normalizarRotulo(rotulo))
    if (!slug) continue
    add(match[0], knownMatch?.sugestao ?? `{{${slug}}}`, knownMatch?.tipo ?? 'campo_em_branco', range)
  }

  // ─── ETAPA 3.5: RÓTULO + UNDERLINE (linha de baixo) ─────────────────────────
  const labelMultilineRegex = /([A-ZÁÉÍÓÚÃÕÇa-záéíóúãõç][A-ZÁÉÍÓÚÃÕÇa-záéíóúãõçA-Za-z0-9 \t\-]{1,60}?)\s*:\s*\n+\s*_{5,}/g
  while ((match = labelMultilineRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const rotulo = match[1].trim().replace(/\s+/g, ' ')
    if (!isRotuloValido(rotulo)) continue
    const knownMatch = getRotuloMatch(rotulo)
    const slug = slugify(normalizarRotulo(rotulo))
    if (!slug) continue
    add(match[0], knownMatch?.sugestao ?? `{{${slug}}}`, knownMatch?.tipo ?? 'campo_em_branco', range)
  }

  // ─── ETAPA 4: DATAS EM BRANCO ISOLADAS ──────────────────────────────────────
  // ⚠️ REMOVIDA a detecção automática de CPF, CNPJ, telefone, email e datas
  // preenchidas — esses dados pertencem ao instituto e NÃO devem virar variáveis.
  // Apenas campos em branco (___) são convertidos em variáveis.
  const isolatedDateRegex = /_{2,}\s*\/\s*_{2,}\s*\/\s*_{2,}/g
  while ((match = isolatedDateRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    add(match[0], '{{data_assinatura}}', 'data_em_branco', range)
  }

  // ─── ETAPA 5: CAMPOS EM BRANCO ISOLADOS ─────────────────────────────────────
  const isolatedBlankRegex = /_{8,}/g
  let blankCount = 1
  while ((match = isolatedBlankRegex.exec(text)) !== null) {
    const range: [number, number] = [match.index, match.index + match[0].length]
    if (isOverlap(range[0], range[1])) continue
    const lineStart = text.lastIndexOf('\n', match.index) + 1
    const lineEnd = text.indexOf('\n', match.index)
    const line = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
    const lineWithoutUnderscores = line.replace(/_/g, '').trim()
    if (lineWithoutUnderscores.length < 2) continue
    const contextStart = Math.max(0, match.index - 80)
    const contextEnd = Math.min(text.length, range[1] + 20)
    const contexto = text.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim()
    add(match[0], `{{campo_pendente_${blankCount}}}`, 'precisa_nomear', range, contexto, true)
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
  cpf: 'CPF', cnpj: 'CNPJ', rg: 'RG', cep: 'CEP', telefone: 'Telefone',
  email: 'E-mail', data: 'Data', data_em_branco: 'Data em branco',
  valor: 'Valor', valor_em_branco: 'Valor a preencher', nome_maiusculo: 'Nome',
  campo_em_branco: 'Campo em branco', parcelas: 'Parcelas', manual: 'Manual',
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