import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button, Card, Spinner } from '@/components/ui'
import SignatureCanvas from '@/components/SignatureCanvas'
import { formatDate } from '@/lib/utils'
import { printElement, generatePDF } from '@/lib/pdf'
import type { SignatureData } from '@/lib/pdf'
import {
  FileText, Printer, CheckCircle2, Heart, ShieldCheck, Download
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PublicSign() {
  const { token } = useParams<{ token: string }>()
  const contractRef = useRef<HTMLDivElement>(null)
  const [showSignature, setShowSignature] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const qc = useQueryClient()

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['public-contract', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, patients(nome,cpf), contract_templates(nome)')
        .eq('signature_token', token)
        .single()
      if (error) throw error
      return data as any
    },
    enabled: !!token,
    retry: false,
  })

  const signMutation = useMutation({
    mutationFn: async ({
      signatureDataUrl,
      signerName,
      signerCpf,
    }: {
      signatureDataUrl: string
      signerName: string
      signerCpf: string
    }) => {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'assinado',
          signature_image: signatureDataUrl,
          signature_signer_name: signerName,
          signature_signer_cpf: signerCpf,
          signature_method: 'digital_canvas',
          signature_date: new Date().toISOString(),
          data_assinatura: new Date().toISOString().split('T')[0],
        })
        .eq('signature_token', token)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public-contract', token] })
      toast.success('Contrato assinado com sucesso!')
      setShowSignature(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  function getSignatureData(): SignatureData | undefined {
    if (contract?.status !== 'assinado' || !contract?.signature_image) return undefined
    return {
      dataUrl: contract.signature_image,
      signerName: contract.signature_signer_name,
      signerCpf: contract.signature_signer_cpf ?? undefined,
      signedAt: formatDate(contract.data_assinatura),
    }
  }

  function handlePrint() {
    if (!contractRef.current) return
    printElement(contractRef.current, contract!.titulo, getSignatureData())
  }

  async function handleDownloadPdf() {
    if (!contractRef.current || !contract) return
    setDownloadingPdf(true)
    try {
      const sigData = getSignatureData()
      await generatePDF(contractRef.current, contract.titulo, {
        signatureImage: sigData?.dataUrl,
        signatureData: sigData,
      })
      toast.success('PDF baixado!')
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + e.message)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Spinner size={32} />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-6">
        <Card className="max-w-md text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <FileText size={24} className="text-red-500" />
          </div>
          <h2 className="heading-serif text-xl mb-2">Link inválido</h2>
          <p className="text-sm text-ink-600">
            Este link de assinatura não foi encontrado ou está expirado.
            Entre em contato com o instituto para receber um novo link.
          </p>
        </Card>
      </div>
    )
  }

  const isSigned = contract.status === 'assinado'

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="bg-ink-950 text-cream-50">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-600">
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <p className="luxury-label text-gold-400">Instituto</p>
            <p className="heading-serif text-xl text-cream-50">Bruna Braga</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-gold-400">
            <ShieldCheck size={16} />
            <span className="text-xs uppercase tracking-wider hidden sm:inline">Assinatura Segura</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {isSigned ? (
          <Card className="bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                <CheckCircle2 size={24} className="text-white" />
              </div>
              <div>
                <h2 className="heading-serif text-xl text-emerald-900 mb-1">Contrato Assinado</h2>
                <p className="text-sm text-emerald-700">
                  Assinado por <strong>{contract.signature_signer_name}</strong>
                  {contract.signature_signer_cpf && <> · CPF {contract.signature_signer_cpf}</>}
                  {' '}em {formatDate(contract.data_assinatura)}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-gold-50 border-gold-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-600">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <p className="luxury-label text-gold-800 mb-1">Para Assinatura</p>
                <h2 className="heading-serif text-xl text-ink-900 mb-1">{contract.titulo}</h2>
                <p className="text-sm text-ink-700">
                  Olá <strong>{contract.patients?.nome}</strong>, leia o documento abaixo com atenção e assine ao final.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            icon={<Download size={15} />}
            onClick={handleDownloadPdf}
            loading={downloadingPdf}
          >
            {isSigned ? 'Baixar PDF assinado' : 'Baixar para assinar manualmente'}
          </Button>
          <Button variant="secondary" icon={<Printer size={15} />} onClick={handlePrint}>
            Imprimir
          </Button>
        </div>

        <Card>
          <div ref={contractRef} className="contract-content">
            {contract.conteudo_html_final ? (
              <div dangerouslySetInnerHTML={{ __html: contract.conteudo_html_final }} />
            ) : (
              <div className="whitespace-pre-wrap">{contract.conteudo_final}</div>
            )}

            {/* ✅ data-signature-block: oculto pelo pdf.ts antes do html2canvas,
                mantido visível na tela para o usuário ver normalmente */}
            {isSigned && contract.signature_image && (
              <div data-signature-block className="mt-12 pt-8 border-t-2 border-ink-200">
                <p className="luxury-label text-gold-700 mb-3">Assinatura do Paciente</p>
                <div className="bg-white border border-ink-100 rounded-lg p-4 inline-block">
                  <img
                    src={contract.signature_image}
                    alt="Assinatura"
                    style={{ maxWidth: 300, maxHeight: 120 }}
                  />
                  <div className="mt-2 pt-2 border-t border-ink-200 text-center">
                    <p className="text-sm font-medium text-ink-900">{contract.signature_signer_name}</p>
                    {contract.signature_signer_cpf && (
                      <p className="text-xs text-ink-600">CPF: {contract.signature_signer_cpf}</p>
                    )}
                    <p className="text-xs text-ink-500 mt-0.5">
                      Assinado em {formatDate(contract.data_assinatura)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {!isSigned && !showSignature && (
          <div className="flex justify-center">
            <Button
              variant="gold"
              size="lg"
              icon={<CheckCircle2 size={18} />}
              onClick={() => setShowSignature(true)}
            >
              Assinar Digitalmente
            </Button>
          </div>
        )}

        {showSignature && !isSigned && (
          <Card>
            <div className="mb-4">
              <p className="luxury-label text-gold-700">Etapa Final</p>
              <h3 className="heading-serif text-xl mt-1">Assine o Documento</h3>
              <p className="text-sm text-ink-600 mt-1">
                Preencha seu nome e CPF, depois desenhe sua assinatura abaixo.
              </p>
            </div>
            <SignatureCanvas
              signerNameDefault={contract.patients?.nome ?? ''}
              signerCpfDefault={contract.patients?.cpf ?? ''}
              loading={signMutation.isPending}
              onConfirm={(signatureDataUrl, signerName, signerCpf) =>
                signMutation.mutate({ signatureDataUrl, signerName, signerCpf })
              }
            />
            <div className="mt-4 pt-4 border-t border-ink-100 flex justify-start">
              <Button variant="ghost" onClick={() => setShowSignature(false)}>← Cancelar</Button>
            </div>
          </Card>
        )}

        <div className="text-center py-8 text-xs text-ink-500">
          <p>Documento gerado pelo Instituto Bruna Braga</p>
          <p className="mt-1">Assinatura digital protegida por criptografia</p>
        </div>
      </main>
    </div>
  )
}