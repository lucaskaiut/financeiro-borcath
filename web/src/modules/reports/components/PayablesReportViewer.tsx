import { useRef, useState } from 'react'
import { Copy, Eye, Smartphone } from 'lucide-react'
import { Button, Modal } from '@/shared/design-system'
import { captureElementToClipboard } from '@/shared/utils/capture-screenshot'
import { toast } from '@/shared/stores/toast.store'
import { cn } from '@/shared/utils/cn'
import { formatCurrency, formatShortDate } from '@/shared/utils/format'
import type { PayablesExportReport } from '../services/reports.service'
import { PayablesReportLayout } from './PayablesReportLayout'

export function PayablesViewButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled}>
      <Eye className="size-4" />
      Visualizar em tela
    </Button>
  )
}

interface PayablesReportViewerProps {
  open: boolean
  onClose: () => void
  data: PayablesExportReport
  costCenterLabel: string
}

const MOBILE_PRINT_WIDTH = 700

export function PayablesReportViewer({ open, onClose, data, costCenterLabel }: PayablesReportViewerProps) {
  const captureRef = useRef<HTMLDivElement>(null)
  const mobileCaptureRef = useRef<HTMLDivElement>(null)
  const [copying, setCopying] = useState(false)
  const [copyingMobile, setCopyingMobile] = useState(false)

  const capture = async (element: HTMLElement | null, setLoading: (loading: boolean) => void) => {
    if (!element) return

    setLoading(true)

    try {
      await captureElementToClipboard(element)
      toast.success('Print copiado', 'A imagem do relatório foi copiada para a área de transferência.')
    } catch {
      toast.error('Falha ao copiar', 'Não foi possível copiar o print. Tente usar a captura de tela do sistema.')
    } finally {
      setLoading(false)
    }
  }

  const copyScreenshot = () => capture(captureRef.current, setCopying)
  const copyMobileScreenshot = () => capture(mobileCaptureRef.current, setCopyingMobile)

  const subtitle = `Referência: ${formatShortDate(data.reference_date)} · Período: ${formatShortDate(data.from)} até ${formatShortDate(data.to)} · ${costCenterLabel}`

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Relatório de contas a pagar"
        description={subtitle}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
            <Button variant="secondary" onClick={copyMobileScreenshot} loading={copyingMobile}>
              <Smartphone className="size-4" />
              Copiar print mobile
            </Button>
            <Button onClick={copyScreenshot} loading={copying}>
              <Copy className="size-4" />
              Copiar print
            </Button>
          </>
        }
      >
        <div ref={captureRef}>
          <PayablesCaptureContent data={data} subtitle={subtitle} />
        </div>
      </Modal>

      {open && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }} aria-hidden="true">
          <div ref={mobileCaptureRef} style={{ width: MOBILE_PRINT_WIDTH }}>
            <PayablesCaptureContent data={data} subtitle={subtitle} mobile />
          </div>
        </div>
      )}
    </>
  )
}

function PayablesCaptureContent({
  data,
  subtitle,
  mobile = false,
}: {
  data: PayablesExportReport
  subtitle: string
  mobile?: boolean
}) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white text-gray-900', mobile ? 'p-3' : 'p-4')}>
      <div className="mb-4 border-b border-gray-300 pb-3">
        <h3 className="text-sm font-bold text-gray-900">Relatório de contas a pagar</h3>
        <p className="text-[11px] text-gray-600">{subtitle}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
          <span className="font-semibold text-red-600">Total em atraso: {formatCurrency(data.total_overdue)}</span>
          <span className="font-semibold text-green-700">Total pago hoje: {formatCurrency(data.total_paid_today)}</span>
        </div>
      </div>

      <PayablesReportLayout data={data} compact mobile={mobile} />
    </div>
  )
}
