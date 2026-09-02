// ============================================================
// Modelo da Anamnese Digital — Instituto Bruna Braga
// Fonte única de verdade para: as perguntas do carrossel público
// (PublicAnamnese.tsx) e a leitura/impressão das respostas
// (Anamneses.tsx, Folders.tsx).
//
// A classificação de potencial NÃO usa IA: é uma soma de pontos
// fixa, definida em computeAnamneseScore(). Os pesos abaixo foram
// validados com o Instituto antes da implementação e podem ser
// ajustados livremente aqui — é o único lugar que precisa mudar.
// ============================================================

export type FieldType =
  | 'text' | 'tel' | 'email' | 'date' | 'textarea'
  | 'choice' | 'scale' | 'chips' | 'yesno'

export interface FieldOption {
  v: string
  t: string
}

export interface AnamneseField {
  key: string
  type: FieldType
  label: string | null
  required?: boolean
  placeholder?: string
  options?: FieldOption[]
  /** yesno: chave/placeholder do campo de detalhe exibido quando a resposta é "sim" */
  detailKey?: string
  detailPlaceholder?: string
  /** exibe o campo só se outro campo (choice/yesno) tiver esse valor */
  showIf?: { key: string; eq: string }
  /** exibe o campo só conforme seleção de um campo do tipo chips */
  showIfChips?: { key: string; includes?: string; includesNot?: string }
}

export interface AnamneseStep {
  id: string
  group: string
  title: string
  subtitle?: string
  fields: AnamneseField[]
}

export const ANAMNESE_STEPS: AnamneseStep[] = [
  {
    id: 'dados_pessoais', group: 'Dados pessoais', title: 'Vamos começar com você',
    subtitle: 'Só precisamos de alguns dados de contato.',
    fields: [
      { key: 'nome', type: 'text', label: 'Nome completo', required: true, placeholder: 'Seu nome completo' },
      { key: 'nascimento', type: 'date', label: 'Data de nascimento' },
      { key: 'telefone', type: 'tel', label: 'WhatsApp / telefone', required: true, placeholder: '(00) 00000-0000' },
      { key: 'email', type: 'email', label: 'E-mail', placeholder: 'seuemail@exemplo.com' },
    ],
  },
  {
    id: 'como_conheceu', group: 'Como nos conheceu', title: 'Como você chegou até nós?',
    fields: [
      { key: 'conheceu', type: 'choice', label: null, options: [
        { v: 'instagram', t: 'Instagram' }, { v: 'indicacao', t: 'Indicação de alguém' },
        { v: 'google', t: 'Busca no Google' }, { v: 'outro', t: 'Outro' },
      ] },
      { key: 'conheceu_outro', type: 'text', label: 'Qual?', placeholder: 'Conte pra gente',
        showIf: { key: 'conheceu', eq: 'outro' } },
    ],
  },
  {
    id: 'queixa', group: 'Queixa principal', title: 'O que te trouxe até aqui?',
    subtitle: 'Conte com suas palavras o que gostaria de resolver ou melhorar.',
    fields: [
      { key: 'queixa', type: 'textarea', label: null, required: true, placeholder: 'Descreva livremente...' },
      { key: 'queixa_tags', type: 'chips', label: 'Se ajudar, marque o que mais combina (opcional)', options: [
        { v: 'rejuvenescimento', t: 'Rejuvenescimento' }, { v: 'manchas_acne', t: 'Manchas / acne' },
        { v: 'ocasiao', t: 'Ocasião especial' }, { v: 'prevencao', t: 'Prevenção / cuidado contínuo' },
        { v: 'outro', t: 'Outro' },
      ] },
    ],
  },
  {
    id: 'vaidade', group: 'Sobre você', title: 'Qual frase mais combina com você?',
    subtitle: 'Isso nos ajuda a entender que tipo de cuidado faz sentido pra sua rotina.',
    fields: [
      { key: 'vaidade', type: 'scale', label: null, options: [
        { v: '1', t: 'Cuido do básico, vaidade não é prioridade pra mim' },
        { v: '2', t: 'Gosto de me cuidar, sem exageros' },
        { v: '3', t: 'Vaidade faz parte da minha rotina' },
        { v: '4', t: 'É prioridade no meu dia a dia, invisto bastante em mim' },
      ] },
    ],
  },
  {
    id: 'evento', group: 'Ocasião especial', title: 'Tem alguma data especial se aproximando?',
    subtitle: 'Casamento, viagem, formatura, aniversário... (opcional)',
    fields: [
      { key: 'evento', type: 'yesno', label: 'Você já tem essa data em mente?',
        detailKey: 'evento_detalhe', detailPlaceholder: 'Qual e para quando, aproximadamente?' },
    ],
  },
  {
    id: 'mesmo_dia', group: 'Seu interesse', title: 'Sobre o seu atendimento',
    subtitle: 'Se, na avaliação, você estiver apta(o) para o procedimento indicado:',
    fields: [
      { key: 'mesmo_dia', type: 'choice', label: null, options: [
        { v: 'sim', t: 'Gostaria de já sair com o procedimento feito, se possível' },
        { v: 'depois', t: 'Prefiro decidir com calma após a avaliação' },
      ] },
    ],
  },
  {
    id: 'confianca_hoje', group: 'Seu interesse', title: 'O que ajudaria você a se sentir pronta(o) para começar hoje?',
    fields: [
      { key: 'confianca_hoje', type: 'choice', label: null, options: [
        { v: 'ja_pronta', t: 'Já estou pronta(o), só falta agendar' },
        { v: 'ver_resultados', t: 'Ver resultados reais de outras pacientes' },
        { v: 'entender_passos', t: 'Entender bem cada etapa do procedimento' },
        { v: 'conversar_equipe', t: 'Conversar com a equipe durante a consulta' },
      ] },
    ],
  },
  {
    id: 'procedimentos', group: 'Histórico', title: 'Você já realizou algum procedimento estético?',
    subtitle: 'Marque todos que se aplicam.',
    fields: [
      { key: 'procedimentos', type: 'chips', label: null, options: [
        { v: 'botox', t: 'Botox' }, { v: 'preenchimento', t: 'Preenchimento facial' },
        { v: 'bioestimulador', t: 'Bioestimulador de colágeno' }, { v: 'peeling', t: 'Peeling químico' },
        { v: 'laser', t: 'Laser' }, { v: 'skinbooster', t: 'Skinbooster' },
        { v: 'tecnologias', t: 'Tecnologias (radiofrequência, ultrassom, etc.)' },
        { v: 'nunca', t: 'Nunca realizei' }, { v: 'outro', t: 'Outro' },
      ] },
      { key: 'procedimentos_outro', type: 'text', label: 'Qual?', placeholder: 'Conte pra gente',
        showIfChips: { key: 'procedimentos', includes: 'outro' } },
    ],
  },
  {
    id: 'abordagem', group: 'Seu perfil', title: 'Qual frase combina mais com você?',
    fields: [
      { key: 'abordagem', type: 'choice', label: null, options: [
        { v: 'de_uma_vez', t: 'Prefiro resolver tudo de uma vez, mesmo que seja um investimento maior' },
        { v: 'aos_poucos', t: 'Prefiro ir fazendo aos poucos, um procedimento de cada vez' },
        { v: 'conhecendo', t: 'Ainda estou conhecendo as possibilidades antes de decidir' },
      ] },
    ],
  },
  {
    id: 'prioridade', group: 'Seu perfil', title: 'Qual desses caminhos mais combina com você?',
    fields: [
      { key: 'prioridade', type: 'choice', label: null, options: [
        { v: 'resultado', t: 'Quero o melhor resultado possível, e estou pronta(o) para investir nisso' },
        { v: 'custo', t: 'Prefiro começar agora e ir construindo minha jornada aos poucos' },
      ] },
    ],
  },
  {
    id: 'rotina', group: 'Seu perfil', title: 'E sobre frequência de cuidados?',
    fields: [
      { key: 'rotina', type: 'choice', label: null, options: [
        { v: 'definida', t: 'Já tenho uma rotina definida (a cada alguns meses, por exemplo)' },
        { v: 'as_vezes', t: 'Faço de vez em quando, sem periodicidade fixa' },
        { v: 'primeira_vez', t: 'Essa seria minha primeira experiência' },
      ] },
    ],
  },
  {
    id: 'anamnese_clinica', group: 'Segurança & saúde', title: 'Antes de continuar, alguns pontos de segurança',
    subtitle: 'Confidencial — usado apenas pela equipe clínica para um atendimento seguro.',
    fields: [
      { key: 'anestesia', type: 'yesno', label: 'Já se submeteu a anestesia odontológica ou local?', detailKey: 'anestesia_detalhe', detailPlaceholder: 'Qual?' },
      { key: 'alergia_medicamento', type: 'yesno', label: 'É alérgico(a) a algum medicamento?', detailKey: 'alergia_detalhe', detailPlaceholder: 'Qual?' },
      { key: 'uso_medicamento', type: 'yesno', label: 'Está fazendo uso de algum medicamento?', detailKey: 'uso_medicamento_detalhe', detailPlaceholder: 'Qual?' },
      { key: 'filtro_solar', type: 'yesno', label: 'Faz uso regular de protetor solar?', detailKey: 'filtro_solar_detalhe', detailPlaceholder: 'Qual o fator (FPS)?' },
      { key: 'acido_peeling', type: 'yesno', label: 'Usa algum ácido ou peeling químico atualmente?', detailKey: 'acido_detalhe', detailPlaceholder: 'Qual?' },
      { key: 'cancer_pele', type: 'yesno', label: 'Já teve algum tipo de câncer de pele?' },
      { key: 'diabetes', type: 'yesno', label: 'É diabético(a)?' },
      { key: 'gestante', type: 'yesno', label: 'Está grávida ou amamentando?' },
      { key: 'coagulacao', type: 'yesno', label: 'Tem problemas de coagulação sanguínea?' },
      { key: 'anamnese_obs', type: 'textarea', label: 'Informação adicional (opcional)', placeholder: 'Se quiser complementar algo...' },
    ],
  },
  {
    id: 'pele', group: 'Sua pele', title: 'Agora, me conta da sua pele',
    fields: [
      { key: 'cor_pele', type: 'choice', label: 'Cor da pele', options: [{ v: 'branca', t: 'Branca' }, { v: 'parda', t: 'Parda' }, { v: 'preta', t: 'Preta' }] },
      { key: 'biotipo', type: 'choice', label: 'Biótipo', options: [{ v: 'normal', t: 'Normal' }, { v: 'mista', t: 'Mista' }, { v: 'oleosa', t: 'Oleosa' }, { v: 'seca', t: 'Seca' }] },
      { key: 'hidratacao', type: 'choice', label: 'Grau de hidratação', options: [{ v: 'hidratada', t: 'Hidratada' }, { v: 'semi', t: 'Semi-hidratada' }, { v: 'desidratada', t: 'Desidratada' }] },
      { key: 'acne', type: 'choice', label: 'Acne', options: [{ v: 'grau1', t: 'Grau I' }, { v: 'grau2', t: 'Grau II' }, { v: 'grau3', t: 'Grau III' }, { v: 'nenhuma', t: 'Não tenho' }] },
      { key: 'textura', type: 'chips', label: 'Textura da pele', options: [{ v: 'fina', t: 'Fina' }, { v: 'aspera', t: 'Áspera' }, { v: 'normal', t: 'Normal' }, { v: 'com_rugas', t: 'Com rugas' }, { v: 'espessa', t: 'Espessa' }, { v: 'flacida', t: 'Flácida' }] },
      { key: 'envelhecimento', type: 'choice', label: 'Grau de envelhecimento (global)', options: [{ v: 'leve', t: 'Leve' }, { v: 'moderado', t: 'Moderado' }, { v: 'avancado', t: 'Avançado' }, { v: 'severo', t: 'Severo' }] },
      { key: 'rugas', type: 'chips', label: 'Rugas', options: [{ v: 'superficiais', t: 'Superficiais' }, { v: 'medias', t: 'Médias' }, { v: 'profundas', t: 'Profundas' }, { v: 'nao_tenho', t: 'Não tenho' }] },
      { key: 'rugas_onde', type: 'text', label: 'Onde?', placeholder: 'Ex: testa, ao redor dos olhos...',
        showIfChips: { key: 'rugas', includesNot: 'nao_tenho' } },
    ],
  },
  {
    id: 'estilo', group: 'Experiência BB', title: 'Um pouco do seu estilo',
    fields: [
      { key: 'estilo_pessoal', type: 'choice', label: 'Estilo pessoal', options: [
        { v: 'discricao', t: 'Discrição / minimalismo' }, { v: 'extravagancia', t: 'Extravagância / ousadia' },
        { v: 'elegancia', t: 'Elegância sofisticada' }, { v: 'naturalidade', t: 'Naturalidade acima de tudo' },
      ] },
      { key: 'comunicacao', type: 'choice', label: 'Como prefere que a gente se comunique com você', options: [
        { v: 'objetiva', t: 'De forma objetiva e prática (informações essenciais)' },
        { v: 'detalhada', t: 'De forma detalhada (entendendo cada etapa)' },
      ] },
    ],
  },
  {
    id: 'observacoes', group: 'Observações', title: 'Mais alguma coisa que gostaria de contar?',
    subtitle: 'Fique à vontade — este espaço é livre.',
    fields: [
      { key: 'observacoes_gerais', type: 'textarea', label: null, placeholder: 'Escreva aqui...' },
    ],
  },
]

// ─── Classificação automática (regra fixa, sem IA) ──────────────────────────

export interface AnamneseScore {
  interesseScore: number      // 0-100
  investimentoScore: number   // 0-100
  potencial: 'Alto' | 'Médio' | 'Baixo'
  mesmoDia: 'Sim' | 'Não' | 'Talvez'
}

export function computeAnamneseScore(answers: Record<string, any>): AnamneseScore {
  let interesse = 0
  if (answers.queixa && String(answers.queixa).trim().length > 0) interesse += 15
  if (answers.mesmo_dia === 'sim') interesse += 30
  else if (answers.mesmo_dia === 'depois') interesse += 15
  if (answers.evento === 'sim') interesse += 20
  const vaidadeTier = parseInt(answers.vaidade || '0', 10)
  interesse += vaidadeTier * 5
  if (answers.confianca_hoje === 'ja_pronta') interesse += 15
  else if (answers.confianca_hoje === 'ver_resultados') interesse += 8
  else if (answers.confianca_hoje === 'entender_passos') interesse += 5
  else if (answers.confianca_hoje === 'conversar_equipe') interesse += 5
  const interesseScore = Math.min(100, Math.round((interesse / 100) * 100))

  let invest = 0
  if (answers.prioridade === 'resultado') invest += 35
  else if (answers.prioridade === 'custo') invest += 5
  if (answers.abordagem === 'de_uma_vez') invest += 25
  else if (answers.abordagem === 'aos_poucos') invest += 15
  else if (answers.abordagem === 'conhecendo') invest += 5
  if (answers.rotina === 'definida') invest += 20
  else if (answers.rotina === 'as_vezes') invest += 10
  else if (answers.rotina === 'primeira_vez') invest += 5
  const procs: string[] = answers.procedimentos || []
  if (procs.length > 0 && !procs.includes('nunca')) invest += 20
  const investimentoScore = Math.min(100, Math.round(invest))

  const geral = interesseScore * 0.5 + investimentoScore * 0.5
  const potencial: AnamneseScore['potencial'] = geral >= 70 ? 'Alto' : geral >= 40 ? 'Médio' : 'Baixo'

  let mesmoDia: AnamneseScore['mesmoDia'] = 'Talvez'
  if (answers.mesmo_dia === 'sim') mesmoDia = 'Sim'
  else if (answers.mesmo_dia === 'depois') mesmoDia = 'Não'

  return { interesseScore, investimentoScore, potencial, mesmoDia }
}

// ─── Helpers de exibição ─────────────────────────────────────────────────────

export function optionLabel(fieldKey: string, value: string): string {
  for (const step of ANAMNESE_STEPS) {
    for (const field of step.fields) {
      if (field.key === fieldKey && field.options) {
        const found = field.options.find((o) => o.v === value)
        if (found) return found.t
      }
    }
  }
  return value
}

export function potencialColor(potencial?: string): string {
  if (potencial === 'Alto') return 'bg-gold-100 text-gold-800 ring-gold-600/30'
  if (potencial === 'Médio') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-ink-100 text-ink-600 ring-ink-400/20'
}

export function mesmoDiaColor(mesmoDia?: string): string {
  if (mesmoDia === 'Sim') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (mesmoDia === 'Talvez') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-ink-100 text-ink-600 ring-ink-400/20'
}
