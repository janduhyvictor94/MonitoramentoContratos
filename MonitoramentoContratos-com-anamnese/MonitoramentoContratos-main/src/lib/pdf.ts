import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = src
    setTimeout(() => reject(new Error('Timeout')), 8000)
  })
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const imgs = Array.from(element.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) => {
      if (img.src && !img.src.startsWith('data:')) img.crossOrigin = 'anonymous'
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
        setTimeout(() => resolve(), 3000)
      })
    })
  )
}

export interface SignatureData {
  dataUrl: string
  signerName: string
  signerCpf?: string
  signedAt?: string
}

export interface PDFOptions {
  signatureImage?: string
  signatureData?: SignatureData
}

export async function generatePDF(
  element: HTMLElement,
  filename: string,
  options?: PDFOptions
): Promise<void> {
  const signatureBlock = element.querySelector<HTMLElement>('[data-signature-block]')
  if (signatureBlock) signatureBlock.style.display = 'none'

  await waitForImages(element)

  let signatureImg: HTMLImageElement | null = null
  if (options?.signatureImage) {
    try { signatureImg = await loadImage(options.signatureImage) } catch { /* ignora */ }
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth  = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin       = 15
  const footerHeight = 14
  const contentWidth = pageWidth - margin * 2
  const usableTop    = margin
  const usableBottom = pageHeight - margin - footerHeight

  const blocks = collectBlocks(element)

  let cursorY = usableTop
  let pageNum = 1
  const renderedPages: Array<{ img: string; x: number; y: number; w: number; h: number }>[] = [[]]

  for (const block of blocks) {
    const canvas = await html2canvas(block, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 15000,
      foreignObjectRendering: false,
    })

    if (canvas.height === 0) continue

    const blockHeightMM = (canvas.height * contentWidth) / canvas.width
    const imgData       = canvas.toDataURL('image/jpeg', 0.95)
    const maxBlockH     = usableBottom - usableTop

    if (blockHeightMM > maxBlockH) {
      if (renderedPages[pageNum - 1].length > 0) {
        renderedPages.push([])
        pageNum++
        cursorY = usableTop
      }
      let remaining = blockHeightMM
      while (remaining > 0) {
        const sliceH  = Math.min(remaining, maxBlockH)
        const sourceY = ((blockHeightMM - remaining) / blockHeightMM) * canvas.height
        const sourceH = (sliceH / blockHeightMM) * canvas.height

        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width  = canvas.width
        sliceCanvas.height = sourceH
        const ctx = sliceCanvas.getContext('2d')!
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH)

        renderedPages[pageNum - 1].push({
          img: sliceCanvas.toDataURL('image/jpeg', 0.95),
          x: margin, y: usableTop, w: contentWidth, h: sliceH,
        })

        remaining -= sliceH
        if (remaining > 0) {
          renderedPages.push([])
          pageNum++
          cursorY = usableTop
        } else {
          cursorY = usableTop + sliceH
        }
      }
      continue
    }

    if (cursorY + blockHeightMM > usableBottom) {
      renderedPages.push([])
      pageNum++
      cursorY = usableTop
    }

    renderedPages[pageNum - 1].push({
      img: imgData, x: margin, y: cursorY, w: contentWidth, h: blockHeightMM,
    })
    cursorY += blockHeightMM + 1.5
  }

  if (signatureBlock) signatureBlock.style.display = ''

  const totalPages = renderedPages.length

  // Desenha todas as páginas
  renderedPages.forEach((pageBlocks, idx) => {
    if (idx > 0) pdf.addPage()
    for (const b of pageBlocks) pdf.addImage(b.img, 'JPEG', b.x, b.y, b.w, b.h)
    drawFooter(pdf, idx + 1, totalPages, pageWidth, pageHeight, margin, signatureImg)
  })

  // Assinatura: sempre na última página existente, logo acima do rodapé
  if (options?.signatureData) {
    // Vai para a última página (já está lá após o forEach acima)
    // Posiciona a assinatura na parte inferior da última página, acima do rodapé
    await drawSignatureOnLastPage(
      pdf, options.signatureData,
      margin, pageWidth, pageHeight, footerHeight
    )
  }

  pdf.save(`${filename}.pdf`)
}

// ─── Assinatura sempre na última página, posição fixa acima do rodapé ────────
async function drawSignatureOnLastPage(
  pdf: jsPDF,
  sig: SignatureData,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  footerHeight: number,
): Promise<void> {
  // Bloco compacto: 42mm de altura total
  const BLOCK_H = 42
  const boxW    = 75
  const boxH    = 20

  // Posição Y: acima do rodapé com folga
  const baseY = pageHeight - margin - footerHeight - BLOCK_H - 2

  let y = baseY

  // Linha separadora
  pdf.setDrawColor(200, 200, 200)
  pdf.setLineWidth(0.3)
  pdf.line(margin, y, margin + boxW + 10, y)
  y += 5

  // Label dourado
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.setTextColor(180, 140, 80)
  pdf.text('ASSINATURA DO PACIENTE', margin, y)
  y += 4

  // Caixa
  pdf.setDrawColor(210, 210, 210)
  pdf.setLineWidth(0.3)
  pdf.setFillColor(255, 255, 255)
  pdf.roundedRect(margin, y, boxW, boxH, 2, 2, 'FD')

  // Imagem da assinatura
  try {
    await new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight
        const sigH  = boxH - 4
        const sigW  = Math.min(sigH * ratio, boxW - 8)
        const sigX  = margin + (boxW - sigW) / 2
        const sigY  = y + (boxH - sigH) / 2
        pdf.addImage(sig.dataUrl, 'PNG', sigX, sigY, sigW, sigH)
        resolve()
      }
      img.onerror = () => resolve()
      img.src = sig.dataUrl
      setTimeout(() => resolve(), 8000)
    })
  } catch { /* vazio */ }

  y += boxH + 1

  // Linha base
  pdf.setDrawColor(100, 100, 100)
  pdf.setLineWidth(0.2)
  pdf.line(margin, y, margin + boxW, y)
  y += 3.5

  // Nome
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(20, 20, 20)
  pdf.text(sig.signerName, margin, y)
  y += 4

  // CPF e data na mesma linha para economizar espaço
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(100, 100, 100)
  const infoLine = [
    sig.signerCpf ? `CPF: ${sig.signerCpf}` : '',
    sig.signedAt  ? `Assinado em ${sig.signedAt}` : '',
  ].filter(Boolean).join('   ·   ')
  if (infoLine) pdf.text(infoLine, margin, y)
}

function collectBlocks(element: HTMLElement): HTMLElement[] {
  const blocks: HTMLElement[] = []
  const children = Array.from(element.children) as HTMLElement[]
  for (const child of children) {
    const tag = child.tagName.toLowerCase()
    if (tag === 'div' && child.children.length > 0 && !child.classList.length) {
      blocks.push(...collectBlocks(child))
    } else {
      blocks.push(child)
    }
  }
  return blocks.length > 0 ? blocks : [element]
}

function drawFooter(
  pdf: jsPDF,
  currentPage: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  signatureImg: HTMLImageElement | null
): void {
  const footerBaseY = pageHeight - margin

  pdf.setDrawColor(210, 210, 210)
  pdf.setLineWidth(0.2)
  pdf.line(margin, footerBaseY - 9, pageWidth - margin, footerBaseY - 9)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(130, 130, 130)
  pdf.text(`Página ${currentPage} de ${totalPages}`, margin, footerBaseY - 4)

  if (signatureImg) {
    const rubricaH = 9
    const ratio    = signatureImg.width / signatureImg.height
    const rubricaW = rubricaH * ratio
    const rubricaX = pageWidth - margin - rubricaW
    const rubricaY = footerBaseY - 8
    try {
      pdf.addImage(signatureImg, 'PNG', rubricaX, rubricaY, rubricaW, rubricaH)
      pdf.setFontSize(5.5)
      pdf.setTextColor(150, 150, 150)
      const legenda = 'Documento assinado digitalmente'
      const legW    = pdf.getTextWidth(legenda)
      pdf.text(legenda, pageWidth - margin - legW, footerBaseY - 1)
    } catch { /* ignora */ }
  }
}

export function printElement(element: HTMLElement, title: string, sig?: SignatureData): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') }
      catch { return '' }
    })
    .join('\n')

  const clone = element.cloneNode(true) as HTMLElement
  const sigBlockInClone = clone.querySelector('[data-signature-block]')
  if (sigBlockInClone) sigBlockInClone.remove()

  // Bloco de assinatura inline — sem position fixed para não sobrepor conteúdo
  const signatureHtml = sig ? `
    <div style="margin-top:28px; padding-top:14px; border-top:1.5px solid #d1d5db; page-break-inside:avoid;">
      <p style="font-size:8px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#b48c50; margin:0 0 8px;">
        Assinatura do Paciente
      </p>
      <div style="display:inline-block; border:1px solid #e5e7eb; border-radius:8px; padding:10px 14px; background:#fff;">
        <img src="${sig.dataUrl}" style="display:block; max-width:220px; max-height:80px; margin:0 auto;" />
        <div style="margin-top:6px; padding-top:6px; border-top:1px solid #e5e7eb; text-align:center;">
          <p style="font-size:11px; font-weight:600; color:#111; margin:0 0 2px;">${sig.signerName}</p>
          <p style="font-size:9px; color:#666; margin:0;">
            ${sig.signerCpf ? `CPF: ${sig.signerCpf}` : ''}
            ${sig.signerCpf && sig.signedAt ? ' · ' : ''}
            ${sig.signedAt ? `Assinado em ${sig.signedAt}` : ''}
          </p>
        </div>
      </div>
    </div>
    <!-- Rodapé inline: aparece abaixo da assinatura, em todas as páginas via repeat -->
    <div style="margin-top:18px; padding-top:6px; border-top:1px solid #e0e0e0; display:flex; align-items:center; justify-content:space-between;">
      <span style="font-size:8px; color:#999;">Documento assinado digitalmente</span>
      <img src="${sig.dataUrl}" style="height:18px; width:auto; opacity:0.6;" />
    </div>` : ''

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        ${styles}
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 15mm 20mm 15mm;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #1a1a1a;
        }
        .no-print { display: none !important; }
        img { max-width: 100%; }
        p, li, h1, h2, h3, h4 { page-break-inside: avoid; }
        @media print {
          body { padding: 15mm 20mm 15mm; }
          @page { margin: 15mm 20mm; }
        }
      </style>
    </head>
    <body>
      ${clone.innerHTML}
      ${signatureHtml}
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print(); printWindow.close() }, 900)
}