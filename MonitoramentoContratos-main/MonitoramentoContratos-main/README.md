# Instituto Bruna Braga — Sistema de Gestão

Sistema web completo para gerenciamento de pacientes, contratos e histórico de consultas.

## Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend/BD**: Supabase (PostgreSQL)
- **Hospedagem**: Vercel

---

## 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/migrations/001_schema.sql`
3. Copie a **Project URL** e a **anon public key** (em Project Settings → API)

---

## 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Instalar e rodar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

---

## 4. Deploy no Vercel

### Via GitHub (recomendado)

1. Suba este projeto para um repositório GitHub
2. No [vercel.com](https://vercel.com), clique em **New Project**
3. Importe o repositório
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` → sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` → sua chave anon
5. Clique em **Deploy**

### Via CLI

```bash
npm i -g vercel
vercel --prod
```

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 📊 Dashboard | Indicadores, pacientes recentes, contratos |
| 👥 Pacientes | Cadastro completo com busca e filtros |
| 📁 Pastas | Pasta virtual por paciente com contratos e histórico |
| 📄 Contratos | Modelos com variáveis, geração automática, PDF e impressão |
| 📅 Histórico | Registro de consultas por paciente |
| ⚙ Variáveis | Gerenciar marcadores para os modelos de contrato |
| 🏥 Configurações | Dados da clínica usados nos contratos |

---

## Usando os Modelos de Contrato

### Variáveis disponíveis por padrão

**Paciente:**
- `{{paciente_nome}}` — Nome completo
- `{{paciente_cpf}}` — CPF
- `{{paciente_data_nasc}}` — Data de nascimento
- `{{paciente_telefone}}` — Telefone
- `{{paciente_email}}` — E-mail
- `{{paciente_plano}}` — Plano de saúde
- `{{paciente_endereco}}` — Endereço
- `{{paciente_cidade_estado}}` — Cidade e estado

**Clínica:**
- `{{clinica_nome}}` — Nome do instituto
- `{{clinica_cnpj}}` — CNPJ
- `{{clinica_endereco}}` — Endereço
- `{{clinica_telefone}}` — Telefone
- `{{profissional_nome}}` — Nome do profissional
- `{{profissional_crf}}` — Registro profissional

**Sistema:**
- `{{data_hoje}}` — Data de hoje (dd/mm/aaaa)
- `{{data_extenso}}` — Data por extenso

### Como criar um modelo

1. Vá em **Contratos → Gerenciar Modelos**
2. Clique em **Novo Modelo**
3. Cole o texto do contrato e insira as variáveis onde necessário
4. O sistema detecta automaticamente as variáveis usadas
5. Ao gerar um contrato, todas as variáveis são substituídas pelos dados reais

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── layout/     # Layout e sidebar
│   ├── pages/      # Páginas da aplicação
│   └── ui/         # Componentes reutilizáveis
├── lib/
│   ├── supabase.ts # Cliente Supabase
│   ├── utils.ts    # Utilitários e variáveis
│   └── pdf.ts      # Geração de PDF e impressão
├── types/          # Tipos TypeScript
└── App.tsx         # Rotas
```
