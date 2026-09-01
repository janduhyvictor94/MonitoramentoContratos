-- ============================================================
-- Instituto Bruna Braga — Anamnese Digital
-- Ficha de anamnese em carrossel, enviada por link ao paciente,
-- com classificação automática de potencial (sem IA — regras fixas
-- calculadas em src/lib/anamneseModel.ts).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABELA: anamneses
-- ────────────────────────────────────────────────────────────
CREATE TABLE anamneses (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token               uuid UNIQUE NOT NULL DEFAULT uuid_generate_v4(),

  status              text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','preenchida')),

  respostas           jsonb DEFAULT '{}',       -- todas as respostas do paciente

  -- classificação automática (calculada no preenchimento, regra fixa — sem IA)
  interesse_score     int,                      -- 0-100
  investimento_score  int,                      -- 0-100
  potencial           text CHECK (potencial IN ('Alto','Médio','Baixo')),
  mesmo_dia           text CHECK (mesmo_dia IN ('Sim','Não','Talvez')),

  confirm_nome        text,                     -- nome confirmado pelo paciente na última etapa

  sent_at             timestamptz,              -- quando o link foi enviado
  preenchida_em       timestamptz,              -- quando o paciente confirmou o preenchimento

  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_anamneses_patient ON anamneses(patient_id);
CREATE INDEX idx_anamneses_token ON anamneses(token);
CREATE INDEX idx_anamneses_status ON anamneses(status);

CREATE TRIGGER trg_anamneses_updated BEFORE UPDATE ON anamneses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS — desativado por padrão, mesmo critério já usado nas demais tabelas
-- ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
