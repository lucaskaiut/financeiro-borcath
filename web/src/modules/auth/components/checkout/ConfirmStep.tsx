import type { ReactNode } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Checkbox } from '@/shared/design-system'
import { isApiError } from '@/shared/api/errors'
import { onlyDigits } from '@/shared/utils/document'
import { formatDocument } from '@/shared/utils/document'
import { toast } from '@/shared/stores/toast.store'
import { useSessionStore } from '@/shared/stores/session.store'
import { queryKeys } from '@/shared/constants/query-keys'
import { http } from '@/shared/api/http'
import { ensureCsrfCookie } from '@/shared/api/csrf'
import { useRegisterCheckoutStore } from '../../store/register-checkout.store'
import { authService } from '../../services/auth.service'

export function ConfirmStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setSession = useSessionStore((state) => state.setSession)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const company = useRegisterCheckoutStore((state) => state.company)
  const user = useRegisterCheckoutStore((state) => state.user)
  const acceptedTerms = useRegisterCheckoutStore((state) => state.acceptedTerms)
  const setAcceptedTerms = useRegisterCheckoutStore((state) => state.setAcceptedTerms)
  const previousStep = useRegisterCheckoutStore((state) => state.previousStep)
  const reset = useRegisterCheckoutStore((state) => state.reset)

  const canConfirm = acceptedTerms

  const onConfirm = async () => {
    if (!canConfirm) return

    setSubmitting(true)
    setError(null)

    try {
      await ensureCsrfCookie()
      await http.post('/auth/register', {
        company: {
          name: company.name,
          document: onlyDigits(company.document),
          phone: company.phone,
        },
        user: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      })

      reset()

      const session = await authService.me()
      setSession(session)
      await queryClient.invalidateQueries({ queryKey: queryKeys.session })

      toast.success('Conta criada com sucesso', 'Bem-vindo à Nox.')

      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message)
      } else {
        setError('Não foi possível concluir o cadastro. Tente novamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Confirmação</h1>
        <p className="mt-1 text-sm text-muted">Revise os dados antes de finalizar.</p>
      </div>

      {error && <Alert variant="danger" title={error} />}

      <SummaryBlock title="Empresa">
        <Line label="Nome" value={company.name} />
        <Line label="Documento" value={formatDocument(company.document)} />
        <Line label="Telefone" value={company.phone} />
      </SummaryBlock>

      <SummaryBlock title="Usuário">
        <Line label="Nome" value={user.name} />
        <Line label="E-mail" value={user.email} />
      </SummaryBlock>

      <Checkbox
        id="terms"
        label="Li e aceito os termos de uso e a política de privacidade"
        checked={acceptedTerms}
        onChange={(event) => setAcceptedTerms(event.target.checked)}
      />

      <div className="flex justify-between pt-2">
        <Button type="button" variant="secondary" onClick={previousStep} disabled={submitting}>
          Voltar
        </Button>
        <Button type="button" loading={submitting} disabled={!canConfirm} onClick={onConfirm}>
          Confirmar cadastro
        </Button>
      </div>
    </div>
  )
}

function SummaryBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 p-4 shadow-card">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
