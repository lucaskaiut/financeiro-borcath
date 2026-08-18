import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link2, Plus } from 'lucide-react'
import {
  Badge,
  Button,
  Form,
  Modal,
  RadioGroupField,
  SelectField,
  Skeleton,
  TextField,
} from '@/shared/design-system'
import { formatCurrency, formatDate } from '@/shared/utils/format'
import { useCategoryOptions } from '@/modules/categories/hooks/useCategories'
import type { BankTransaction } from '@/shared/types/models'
import { useCandidates, useCreateAccountFromTransaction, useReconcile } from '../hooks/useReconciliation'

const createSchema = z.object({
  type: z.enum(['payable', 'receivable']),
  description: z.string().min(1, 'Informe a descrição'),
  category_id: z.string().min(1, 'Selecione a categoria'),
})

type CreateFormValues = z.infer<typeof createSchema>

export function MatchDialog({
  transaction,
  open,
  onClose,
}: {
  transaction: BankTransaction | null
  open: boolean
  onClose: () => void
}) {
  const candidates = useCandidates(open && transaction ? transaction.id : undefined)
  const reconcile = useReconcile()
  const createAccount = useCreateAccountFromTransaction()

  const [creating, setCreating] = useState(false)

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: 'payable', description: '', category_id: '' },
  })

  const type = form.watch('type')
  const categories = useCategoryOptions(type === 'receivable' ? 'income' : 'expense')

  const hasCandidates = (candidates.data?.candidates.length ?? 0) > 0

  const handlePick = (accountId: string) => {
    if (!transaction) return
    reconcile.mutate({ id: transaction.id, accountId }, { onSettled: onClose })
  }

  const handleCreate = async (values: CreateFormValues) => {
    if (!transaction) return
    await createAccount.mutateAsync({
      id: transaction.id,
      payload: { type: values.type, description: values.description, category_id: values.category_id },
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conciliação"
      description={transaction ? `Transação de ${formatCurrency(transaction.value)} em ${formatDate(transaction.date)}` : undefined}
      size="lg"
    >
      {candidates.isPending && <Skeleton className="h-40" />}

      {!candidates.isPending && !creating && hasCandidates && (
        <div className="space-y-2">
          <p className="text-sm text-muted">Selecione o lançamento correspondente:</p>
          {candidates.data?.candidates.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => handlePick(account.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{account.description}</p>
                <p className="truncate text-[13px] text-muted">
                  {account.cost_center} · vencimento {formatDate(account.due_date)}
                </p>
              </div>
              <Badge variant={account.type === 'receivable' ? 'success' : 'warning'}>
                {formatCurrency(account.remaining_amount)}
              </Badge>
            </button>
          ))}
        </div>
      )}

      {!candidates.isPending && !creating && !hasCandidates && (
        <div className="space-y-3">
          <p className="text-sm text-muted">Nenhum lançamento correspondente encontrado.</p>
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Criar lançamento a partir do extrato
          </Button>
        </div>
      )}

      {!candidates.isPending && creating && (
        <Form form={form} onSubmit={handleCreate} className="space-y-4">
          <RadioGroupField
            name="type"
            options={[
              { value: 'payable', label: 'Despesa' },
              { value: 'receivable', label: 'Receita' },
            ]}
          />
          <TextField name="description" label="Descrição" required />
          <SelectField name="category_id" label="Categoria" options={categories.data ?? []} placeholder="Selecione" required />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Voltar
            </Button>
            <Button type="submit" loading={createAccount.isPending}>
              Criar lançamento
            </Button>
          </div>
        </Form>
      )}

      {!creating && hasCandidates && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setCreating(true)}>
            <Link2 className="size-4" />
            Criar novo lançamento
          </Button>
        </div>
      )}
    </Modal>
  )
}
