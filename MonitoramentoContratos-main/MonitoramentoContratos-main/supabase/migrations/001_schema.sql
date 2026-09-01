-- ============================================================
-- Instituto Bruna Braga — Schema Completo
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABELA: clinic_settings
-- Dados da clínica usados nos contratos
-- ────────────────────────────────────────────────────────────
CREATE TABLE clinic_settings (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         text UNIQUE NOT NULL,
  value       text,
  label       text NOT NULL,
  category    text NOT NULL DEFAULT 'geral',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

INSERT INTO clinic_settings (key, label, value, category) VALUES
  ('nome_clinica',     'Nome do Instituto',         'Instituto Bruna Braga',  'geral'),
  ('cnpj',             'CNPJ',                      '',                        'geral'),
  ('crf',              'CRF / Registro Profissional','',                        'geral'),
  ('especialidade',    'Especialidade',              'Nutrição e Saúde',        'geral'),
  ('endereco',         'Endereço',                   '',                        'geral'),
  ('cidade_estado',    'Cidade / Estado',            'Petrolina - PE',          'geral'),
  ('cep',              'CEP',                        '',                        'geral'),
  ('telefone',         'Telefone',                   '',                        'contato'),
  ('whatsapp',         'WhatsApp',                   '',                        'contato'),
  ('email',            'E-mail',                     '',                        'contato'),
  ('site',             'Site',                       '',                        'contato'),
  ('horario',          'Horário de Atendimento',     'Seg a Sex – 08h às 18h', 'geral'),
  ('profissional_nome','Nome do Profissional',        'Bruna Braga',             'profissional'),
  ('profissional_titulo','Título / Formação',         '',                        'profissional');

-- ────────────────────────────────────────────────────────────
-- TABELA: patients (pacientes)
-- ────────────────────────────────────────────────────────────
CREATE TABLE patients (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo          serial UNIQUE,
  nome            text NOT NULL,
  cpf             text,
  data_nascimento date,
  sexo            text CHECK (sexo IN ('Masculino','Feminino','Outro')),
  telefone        text,
  email           text,
  plano_saude     text,
  endereco        text,
  cidade          text,
  estado          text,
  cep             text,
  cid             text,
  observacoes     text,
  status          text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Inativo','Aguardando','Alta')),
  proxima_consulta date,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- TABELA: contract_templates (modelos de contrato)
-- ────────────────────────────────────────────────────────────
CREATE TABLE contract_templates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        text NOT NULL,
  descricao   text,
  conteudo    text NOT NULL,  -- HTML/texto com variáveis {{campo}}
  variaveis   jsonb DEFAULT '[]',  -- lista das variáveis detectadas
  ativo       boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- TABELA: template_variables (variáveis customizadas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE template_variables (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave       text UNIQUE NOT NULL,  -- ex: {{valor_consulta}}
  label       text NOT NULL,          -- ex: Valor da Consulta
  descricao   text,
  valor_padrao text,
  categoria   text DEFAULT 'custom',
  created_at  timestamptz DEFAULT now()
);

INSERT INTO template_variables (chave, label, descricao, categoria) VALUES
  ('{{paciente_nome}}',         'Nome do Paciente',       'Nome completo do paciente',        'paciente'),
  ('{{paciente_cpf}}',          'CPF do Paciente',        'CPF do paciente',                  'paciente'),
  ('{{paciente_data_nasc}}',    'Data de Nascimento',     'Data de nascimento do paciente',   'paciente'),
  ('{{paciente_email}}',        'E-mail do Paciente',     'E-mail de contato',                'paciente'),
  ('{{paciente_telefone}}',     'Telefone do Paciente',   'Telefone de contato',              'paciente'),
  ('{{paciente_plano}}',        'Plano de Saúde',         'Plano de saúde do paciente',       'paciente'),
  ('{{paciente_endereco}}',     'Endereço do Paciente',   'Endereço completo',                'paciente'),
  ('{{paciente_cidade_estado}}','Cidade/Estado Paciente',  'Cidade e estado do paciente',      'paciente'),
  ('{{clinica_nome}}',          'Nome da Clínica',        'Nome do instituto',                'clinica'),
  ('{{clinica_cnpj}}',          'CNPJ da Clínica',        'CNPJ do instituto',                'clinica'),
  ('{{clinica_endereco}}',      'Endereço da Clínica',    'Endereço do instituto',            'clinica'),
  ('{{clinica_telefone}}',      'Telefone da Clínica',    'Telefone de contato',              'clinica'),
  ('{{clinica_cidade}}',        'Cidade da Clínica',      'Cidade e estado',                  'clinica'),
  ('{{profissional_nome}}',     'Nome do Profissional',   'Nome do profissional responsável', 'clinica'),
  ('{{profissional_crf}}',      'CRF do Profissional',    'Registro profissional',            'clinica'),
  ('{{data_hoje}}',             'Data de Hoje',           'Data atual formatada',             'sistema'),
  ('{{data_extenso}}',          'Data por Extenso',       'Data atual por extenso',           'sistema');

-- ────────────────────────────────────────────────────────────
-- TABELA: contracts (contratos assinados / gerados)
-- ────────────────────────────────────────────────────────────
CREATE TABLE contracts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  template_id         uuid REFERENCES contract_templates(id),
  titulo              text NOT NULL,
  conteudo_final      text NOT NULL,  -- HTML já preenchido
  variaveis_usadas    jsonb DEFAULT '{}',
  status              text DEFAULT 'gerado' CHECK (status IN ('gerado','assinado','cancelado')),
  data_assinatura     date,
  observacoes         text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- TABELA: appointments (histórico de consultas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  data_consulta   date NOT NULL,
  tipo            text,
  procedimento    text,
  cid             text,
  valor           numeric(10,2),
  forma_pagamento text,
  observacoes     text,
  created_at      timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- ÍNDICES para performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_patients_nome ON patients(nome);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_contracts_patient ON contracts(patient_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_data ON appointments(data_consulta);

-- ────────────────────────────────────────────────────────────
-- FUNÇÃO: atualizar updated_at automaticamente
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- RLS (Row Level Security) — desativado por padrão
-- Ative se adicionar autenticação de usuários
-- ────────────────────────────────────────────────────────────
-- ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
