import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Banknote, CheckCircle2, Pencil, Plus, Trash2, Undo2, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  ButtonLink,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Page,
  PageContent,
  PageHeader,
  Pagination,
  SearchInput,
  SegmentedControl,
  type Column,
} from '@/shared/design-system'
import { Can } from '@/app/guards/PermissionGuard'
import { Permission } from '@/shared/constants/permissions'
import { usePermissions } from '@/shared/hooks/usePermissions'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useCostCenterOptions } from '@/modules/cost-centers/hooks/useCostCenters'
import { cn } from '@/shared/utils/cn'
import { formatCurrency, formatDate } from '@/shared/utils/format'
import type { Account } from '@/shared/types/models'
import {
  useAccountsQuery,
  useCancelAccount,
  useDeleteAccount,
  useSettleAccount,
  useUnsettleAccount,
} from '../hooks/useAccounts'
import { SettleDialog } from '../components/SettleDialog'

const PER_PAGE = 10

const STATUS_LABELS: Record<Account['status'], { variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'; label: string }> = {
  open: { variant: 'primary', label: 'Aberto' },
  partial: { variant: 'warning', label: 'Parcial' },
  settled: { variant: 'success', label: 'Liquidado' },
  cancelled: { variant: 'neutral', label: 'Cancelado' },
}

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'payable', label: 'A pagar' },
  { value: 'receivable', label: 'A receber' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'open', label: 'Aberto' },
  { value: 'partial', label: 'Parcial' },
  { value: 'settled', label: 'Liquidado' },
  { value: 'cancelled', label: 'Cancelado' },
]

export default function AccountsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebounce(search)
  const page = Number(searchParams.get('page') ?? 1)
  const type = searchParams.get('type') ?? ''
  const status = searchParams.get('status') ?? ''
  const costCenterId = searchParams.get('cost_center_id') ?? ''

  const navigate = useNavigate()
  const { can } = usePermissions()
  const costCenters = useCostCenterOptions()

  const [toDelete, setToDelete] = useState<Account | null>(null)
  const [toCancel, setToCancel] = useState<Account | null>(null)
  const [toSettle, setToSettle] = useState<Account | null>(null)

  const deleteAccount = useDeleteAccount()
  const cancelAccount = useCancelAccount()
  const settleAccount = useSettleAccount(toSettle?.id ?? '')

  const query = useAccountsQuery({
    page,
    per_page: PER_PAGE,
    search: debouncedSearch || undefined,
    type: type || undefined,
    status: status || undefined,
    cost_center_id: costCenterId || undefined,
  })

  const updateParams = (next: { page?: number; search?: string; type?: string; status?: string; cost_center_id?: string }) => {
    setSearchParams((params) => {
      if (next.type !== undefined) {
        next.type ? params.set('type', next.type) : params.delete('type')
        params.delete('page')
      }
      if (next.status !== undefined) {
        next.status ? params.set('status', next.status) : params.delete('status')
        params.delete('page')
      }
      if (next.cost_center_id !== undefined) {
        next.cost_center_id ? params.set('cost_center_id', next.cost_center_id) : params.delete('cost_center_id')
        params.delete('page')
      }
      if (next.search !== undefined) {
        next.search ? params.set('search', next.search) : params.delete('search')
        params.delete('page')
      }
      if (next.page !== undefined) {
        next.page > 1 ? params.set('page', String(next.page)) : params.delete('page')
      }
      return params
    }, { replace: true })
  }

  const columns: Array<Column<Account>> = [
    {
      key: 'description',
      header: 'Lançamento',
      render: (a) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">{a.description}</p>
            {a.installment_number !== null && (
              <Badge variant="neutral">
                {a.installment_number}/{a.installment_total}
              </Badge>
            )}
          </div>
          <p className="truncate text-[13px] text-muted">{a.counterparty ?? a.cost_center ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'value',
      header: 'Valor',
      render: (a) => (
        <div className="text-right">
          <p className={`font-medium ${a.type === 'receivable' ? 'text-success' : 'text-foreground'}`}>
            {formatCurrency(a.value)}
          </p>
          {a.settled_amount > 0 && a.settled_amount < a.value && (
            <p className="text-[13px] text-muted">{formatCurrency(a.remaining_amount)} restante</p>
          )}
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Vencimento',
      render: (a) => <span className="text-muted">{formatDate(a.due_date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => {
        const s = STATUS_LABELS[a.status]
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Ações</span>,
      className: 'w-36 text-right',
      render: (a: Account) => (
        <div className="flex items-center justify-end gap-1">
          {a.status === 'settled' && a.settlements?.length && can(Permission.ACCOUNTS_SETTLE) && (
            <UnsettleButton account={a} />
          )}
          {(a.status === 'open' || a.status === 'partial') && can(Permission.ACCOUNTS_SETTLE) && (
            <Button variant="ghost" size="sm" onClick={() => setToSettle(a)} aria-label={`Baixar ${a.description}`} className="text-success hover:bg-success-soft hover:text-success">
              <CheckCircle2 className="size-4" />
            </Button>
          )}
          {can(Permission.ACCOUNTS_UPDATE) && (a.status === 'open' || a.status === 'partial') && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/accounts/${a.id}/edit`)} aria-label={`Editar ${a.description}`}>
              <Pencil className="size-4" />
            </Button>
          )}
          {can(Permission.ACCOUNTS_UPDATE) && (a.status === 'open' || a.status === 'partial') && (
            <Button variant="ghost" size="sm" onClick={() => setToCancel(a)} aria-label={`Cancelar ${a.description}`} className="text-warning hover:bg-warning-soft hover:text-warning">
              <XCircle className="size-4" />
            </Button>
          )}
          {can(Permission.ACCOUNTS_DELETE) && (
            <Button variant="ghost" size="sm" onClick={() => setToDelete(a)} aria-label={`Excluir ${a.description}`} className="text-danger hover:bg-danger-soft hover:text-danger">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Contas a pagar e receber"
        description="Gerencie os lançamentos financeiros da operação."
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Contas' }]}
        actions={
          <Can permission={Permission.ACCOUNTS_CREATE}>
            <ButtonLink to="/accounts/create">
              <Plus className="size-4" />
              Novo lançamento
            </ButtonLink>
          </Can>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-3">
          <SearchInput
            placeholder="Buscar por descrição ou fornecedor..."
            aria-label="Buscar contas"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              updateParams({ search: e.target.value })
            }}
          />

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <SegmentedControl
              value={type}
              options={TYPE_OPTIONS}
              onChange={(value) => updateParams({ type: value })}
              className="max-w-md"
            />

            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateParams({ status: option.value })}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                    status === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] text-muted">Centro de custo:</span>
            <button
              type="button"
              onClick={() => updateParams({ cost_center_id: '' })}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                costCenterId === ''
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-foreground',
              )}
            >
              Todos
            </button>
            {(costCenters.data ?? []).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParams({ cost_center_id: option.value })}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  costCenterId === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface-2 text-muted hover:bg-surface-3 hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          caption="Lista de contas"
          columns={columns}
          rows={query.data?.data ?? []}
          rowKey={(a) => a.id}
          loading={query.isPending}
          emptyState={
            <EmptyState
              icon={Banknote}
              title="Nenhum lançamento encontrado"
              description="Crie lançamentos de contas a pagar ou receber."
              action={
                <Can permission={Permission.ACCOUNTS_CREATE}>
                  <ButtonLink to="/accounts/create">
                    <Plus className="size-4" />
                    Novo lançamento
                  </ButtonLink>
                </Can>
              }
            />
          }
        />

        {query.data && <Pagination meta={query.data.meta} onPageChange={(next) => updateParams({ page: next })} />}
      </PageContent>

      <SettleDialog
        account={toSettle}
        open={toSettle !== null}
        submitting={settleAccount.isPending}
        onClose={() => setToSettle(null)}
        onConfirm={async (payload) => {
          await settleAccount.mutateAsync(payload)
          setToSettle(null)
        }}
      />

      <ConfirmDialog
        open={toCancel !== null}
        onClose={() => setToCancel(null)}
        onConfirm={() => {
          if (toCancel) cancelAccount.mutate(toCancel.id, { onSettled: () => setToCancel(null) })
        }}
        loading={cancelAccount.isPending}
        title="Cancelar lançamento"
        description={<>Tem certeza que deseja cancelar <strong>{toCancel?.description}</strong>?</>}
        confirmLabel="Cancelar lançamento"
      />

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteAccount.mutate(toDelete.id, { onSettled: () => setToDelete(null) })
        }}
        loading={deleteAccount.isPending}
        title="Excluir lançamento"
        description={<>Tem certeza que deseja excluir <strong>{toDelete?.description}</strong>?</>}
        confirmLabel="Excluir"
      />
    </Page>
  )
}

function UnsettleButton({ account }: { account: Account }) {
  const unsettle = useUnsettleAccount(account.id)

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        const last = account.settlements?.[account.settlements.length - 1]
        if (last) unsettle.mutate(last.id)
      }}
      aria-label={`Desfazer baixa de ${account.description}`}
      className="text-warning hover:bg-warning-soft hover:text-warning"
    >
      <Undo2 className="size-4" />
    </Button>
  )
}
