-- ============================================================
-- Instituto Bruna Braga — WhatsApp da doutora (envio da anamnese)
-- Adiciona o campo de configuração usado pelo botão "Enviar para
-- a doutora" na ficha de anamnese preenchida (Anamneses.tsx).
-- ============================================================

INSERT INTO clinic_settings (key, label, value, category)
VALUES (
  'profissional_whatsapp',
  'WhatsApp da Doutora (recebe as anamneses preenchidas)',
  '',
  'profissional'
)
ON CONFLICT (key) DO NOTHING;
