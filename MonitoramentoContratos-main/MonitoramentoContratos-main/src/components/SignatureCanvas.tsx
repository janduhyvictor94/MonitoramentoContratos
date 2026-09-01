import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui'
import { Eraser, Check, Pen } from 'lucide-react'

interface Props {
  onConfirm: (signatureDataUrl: string, signerName: string, signerCpf: string) => void
  signerNameDefault?: string
  signerCpfDefault?: string
  loading?: boolean
}

// ─── Máscara de CPF: 000.000.000-00 ─────────────────────────────────────────
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  let formatted = digits
  if (digits.length > 3) formatted = digits.slice(0, 3) + '.' + digits.slice(3)
  if (digits.length > 6) formatted = formatted.slice(0, 7) + '.' + digits.slice(6)
  if (digits.length > 9) formatted = formatted.slice(0, 11) + '-' + digits.slice(9)
  return formatted
}

export default function SignatureCanvas({
  onConfirm,
  signerNameDefault = '',
  signerCpfDefault = '',
  loading,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [signerName, setSignerName] = useState(signerNameDefault)
  const [signerCpf, setSignerCpf] = useState(formatCpf(signerCpfDefault))
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Inicializa o canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f0f0f'
    ctx.lineWidth = 2.5
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const pos = getPos(e)
    setIsDrawing(true)
    lastPos.current = pos
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return

    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasSignature(true)
  }

  function stopDrawing() {
    setIsDrawing(false)
    lastPos.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasSignature(false)
  }

  // Valida CPF: precisa ter 11 dígitos
  const cpfDigits = signerCpf.replace(/\D/g, '')
  const cpfValido = cpfDigits.length === 11
  const nomeValido = signerName.trim().length > 0
  const podeConfirmar = hasSignature && nomeValido && cpfValido

  function handleConfirm() {
    if (!podeConfirmar) return
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onConfirm(dataUrl, signerName.trim(), signerCpf)
  }

  return (
    <div className="space-y-4">
      {/* Nome e CPF lado a lado */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-ink-700 uppercase tracking-wider mb-1.5">
            Nome completo *
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Digite seu nome completo"
            className="w-full rounded-md border border-ink-200 bg-cream-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-700 uppercase tracking-wider mb-1.5">
            CPF *
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={signerCpf}
            onChange={(e) => setSignerCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            className={`w-full rounded-md border bg-cream-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-500 ${
              signerCpf.length > 0 && !cpfValido
                ? 'border-red-300'
                : 'border-ink-200'
            }`}
          />
          {signerCpf.length > 0 && !cpfValido && (
            <p className="text-xs text-red-500 mt-1">CPF incompleto</p>
          )}
        </div>
      </div>

      {/* Canvas de assinatura */}
      <div>
        <label className="block text-xs font-medium text-ink-700 uppercase tracking-wider mb-1.5">
          Desenhe sua assinatura *
        </label>
        <div className="relative rounded-lg border-2 border-dashed border-ink-200 bg-white overflow-hidden">
          {!hasSignature && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-ink-300">
              <Pen size={28} className="mb-2" />
              <p className="text-sm">Use o mouse ou o dedo para assinar aqui</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-56 cursor-crosshair touch-none"
            style={{ display: 'block' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex items-center gap-2 mt-2 px-2">
          <div className="flex-1 h-px bg-ink-300" />
          <span className="text-xs text-ink-500 uppercase tracking-wider">Assinatura</span>
          <div className="flex-1 h-px bg-ink-300" />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Eraser size={14} />}
          onClick={clearCanvas}
          disabled={!hasSignature}
        >
          Limpar
        </Button>

        <Button
          variant="gold"
          icon={<Check size={15} />}
          onClick={handleConfirm}
          disabled={!podeConfirmar}
          loading={loading}
        >
          Confirmar Assinatura
        </Button>
      </div>

      {/* Aviso legal */}
      <p className="text-[11px] text-ink-500 text-center leading-relaxed mt-3 px-4">
        Ao confirmar, você concorda que sua assinatura digital tem o mesmo valor jurídico
        de uma assinatura manuscrita, conforme a Lei nº 14.063/2020 e o Marco Civil da Internet.
      </p>
    </div>
  )
}