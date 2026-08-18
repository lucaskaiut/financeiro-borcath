import { useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  DateRangeShortcuts,
  EmptyState,
  Page,
  PageContent,
  PageHeader,
  Select,
  Skeleton,
  type Column,
} from '@/shared/design-system'
import { Can } from '@/app/guards/PermissionGuard'
import { Permission } from '@/shared/constants/permissions'
import { formatCurrency, formatDate } from '@/shared/utils/format'
import { useCostCenterOptions } from '@/modules/cost-centers/hooks/useCostCenters'
import {
  useCashFlowStatement,
  useCategoryReport,
  useCostCenterReport,
  useDailyReport,
  useProvisionReport,
  useWeeklyReport,
} from '../hooks/useReports'
import type { CashFlowStatement, CostCenterReportRow } from '../services/reports.service'

const TABS = [
  { id: 'daily', label: 'Diário' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'provision', label: 'Provisão' },
  { id: 'category', label: 'Por categoria' },
  { id: 'cost-center', label: 'Por centro de custo' },
  { id: 'cash-flow', label: 'Demonstrativo' },
] as const

type TabId = (typeof TABS)[number]['id']

const today = new Date().toISOString().slice(0, 10)

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>('daily')

  return (
    <Page>
      <PageHeader
        title="Relatórios"
        description="Acompanhe a saúde financeira da operação."
        breadcrumb={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Relatórios' }]}
      />

      <PageContent>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                t.id === tab
                  ? 'rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground'
                  : 'rounded-lg bg-surface-2 px-3.5 py-2 text-sm text-muted transition-colors hover:bg-surface-3 hover:text-foreground'
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'daily' && <DailySection />}
        {tab === 'weekly' && <WeeklySection />}
        {tab === 'provision' && <ProvisionSection />}
        {tab === 'category' && <CategorySection />}
        {tab === 'cost-center' && <CostCenterSection />}
        {tab === 'cash-flow' && <CashFlowSection />}
      </PageContent>
    </Page>
  )
}

function DailySection() {
  const [date, setDate] = useState(today)
  const query = useDailyReport({ date })

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
        </div>

        <DateRangeShortcuts variant="single" onApply={({ to }) => setDate(to)} />

        {query.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Summary label="Total pago" value={query.data?.total_paid ?? 0} accent="text-danger" />
              <Summary label="Total recebido" value={query.data?.total_received ?? 0} accent="text-success" />
              <Summary label="Saldo do dia" value={query.data?.balance ?? 0} />
            </div>
            <MovementsList title="Pagamentos realizados" items={query.data?.payments ?? []} />
            <MovementsList title="Recebimentos realizados" items={query.data?.receipts ?? []} />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function WeeklySection() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const query = useWeeklyReport({ from: from || undefined, to: to || undefined })

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
          <span className="text-muted">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
        </div>

        <DateRangeShortcuts
          onApply={({ from: nextFrom, to: nextTo }) => {
            setFrom(nextFrom)
            setTo(nextTo)
          }}
        />

        {query.isPending ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary label="Total pago" value={query.data?.total_paid ?? 0} accent="text-danger" />
            <Summary label="Total recebido" value={query.data?.total_received ?? 0} accent="text-success" />
            <Summary label="Saldo líquido" value={query.data?.net_balance ?? 0} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProvisionSection() {
  const [days, setDays] = useState(30)
  const [costCenterId, setCostCenterId] = useState('')
  const costCenters = useCostCenterOptions()
  const query = useProvisionReport({ days, cost_center_id: costCenterId || undefined })

  const columns: Array<Column<{ description: string; due_date: string; value: number; direction: 'in' | 'out'; installment: string | null }>> = [
    { key: 'due_date', header: 'Vencimento', render: (i) => <span className="text-muted">{formatDate(i.due_date)}</span> },
    { key: 'description', header: 'Lançamento', render: (i) => <span className="font-medium text-foreground">{i.description}</span> },
    { key: 'installment', header: 'Parcela', render: (i) => (i.installment ? <Badge variant="neutral">{i.installment}</Badge> : <span className="text-muted">—</span>) },
    {
      key: 'value',
      header: 'Valor',
      render: (i) => <span className={i.direction === 'in' ? 'text-success' : 'text-foreground'}>{formatCurrency(i.value)}</span>,
    },
  ]

  const items = [...(query.data?.accounts ?? []), ...(query.data?.installments ?? []), ...(query.data?.recurrences ?? [])].sort((a, b) => a.due_date.localeCompare(b.due_date))

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select
            aria-label="Horizonte"
            className="w-44"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[
              { value: '30', label: '30 dias' },
              { value: '60', label: '60 dias' },
              { value: '90', label: '90 dias' },
              { value: '180', label: '180 dias' },
              { value: '365', label: '365 dias' },
            ]}
          />
          <Select
            aria-label="Centro de custo"
            className="w-52"
            value={costCenterId}
            onChange={(e) => setCostCenterId(e.target.value)}
            options={[{ value: '', label: 'Todos os centros' }, ...(costCenters.data ?? [])]}
          />
        </div>

        <DataTable columns={columns} rows={items} rowKey={(i) => i.id ?? i.description + i.due_date} loading={query.isPending} emptyState={<EmptyState icon={BarChart3} title="Sem provisões futuras" />} />
      </CardContent>
    </Card>
  )
}

function CategorySection() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const query = useCategoryReport({ from: from || undefined, to: to || undefined })

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
          <span className="text-muted">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
        </div>

        <DateRangeShortcuts
          onApply={({ from: nextFrom, to: nextTo }) => {
            setFrom(nextFrom)
            setTo(nextTo)
          }}
        />

        {query.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <CategoryColumn title="Receitas por categoria" rows={query.data?.income ?? []} accent="text-success" />
            <CategoryColumn title="Despesas por categoria" rows={query.data?.expense ?? []} accent="text-danger" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CostCenterSection() {
  const query = useCostCenterReport()

  const columns: Array<Column<CostCenterReportRow>> = [
    { key: 'name', header: 'Centro de custo', render: (r) => <span className="font-medium text-foreground">{r.cost_center}</span> },
    { key: 'initial', header: 'Saldo inicial', render: (r) => <span className="text-muted">{formatCurrency(r.initial_balance)}</span> },
    { key: 'income', header: 'Entradas', render: (r) => <span className="text-success">{formatCurrency(r.income)}</span> },
    { key: 'expense', header: 'Saídas', render: (r) => <span className="text-danger">{formatCurrency(r.expense)}</span> },
    { key: 'balance', header: 'Saldo', render: (r) => <span className="font-medium text-foreground">{formatCurrency(r.balance)}</span> },
  ]

  return (
    <Card>
      <CardContent>
        <DataTable columns={columns} rows={query.data?.rows ?? []} rowKey={(r) => r.cost_center_id} loading={query.isPending} emptyState={<EmptyState icon={BarChart3} title="Sem centros de custo" />} />
      </CardContent>
    </Card>
  )
}

function CashFlowSection() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [days, setDays] = useState(30)
  const [costCenterId, setCostCenterId] = useState('')
  const costCenters = useCostCenterOptions()

  const query = useCashFlowStatement({
    from: from || undefined,
    to: to || undefined,
    days,
    cost_center_id: costCenterId || undefined,
  })

  const downloadCsv = (data: CashFlowStatement) => {
    const rows = [
      ['Indicador', 'Valor'],
      ['Saldo inicial (realizado)', data.realized.opening_balance.toFixed(2)],
      ['Entradas realizadas', data.realized.total_in.toFixed(2)],
      ['Saídas realizadas', data.realized.total_out.toFixed(2)],
      ['Resultado realizado', data.comparative.realized_net.toFixed(2)],
      ['Entradas projetadas', data.projected.total_in.toFixed(2)],
      ['Saídas projetadas', data.projected.total_out.toFixed(2)],
      ['Resultado projetado', data.comparative.projected_net.toFixed(2)],
      ['Saldo final esperado', data.comparative.expected_final_balance.toFixed(2)],
    ]
    const csv = rows.map((r) => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'demonstrativo-fluxo-caixa.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
          <span className="text-muted">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
          <Select
            aria-label="Projeção"
            className="w-40"
            value={String(days)}
            onChange={(e) => setDays(Number(e.target.value))}
            options={[
              { value: '30', label: '30 dias' },
              { value: '60', label: '60 dias' },
              { value: '90', label: '90 dias' },
            ]}
          />
          <Select
            aria-label="Centro de custo"
            className="w-52"
            value={costCenterId}
            onChange={(e) => setCostCenterId(e.target.value)}
            options={[{ value: '', label: 'Todos os centros' }, ...(costCenters.data ?? [])]}
          />
          {query.data && (
            <Can permission={Permission.REPORTS_EXPORT}>
              <Button variant="secondary" onClick={() => downloadCsv(query.data!)}>
                <Download className="size-4" />
                Exportar CSV
              </Button>
            </Can>
          )}
        </div>

        <DateRangeShortcuts
          onApply={({ from: nextFrom, to: nextTo }) => {
            setFrom(nextFrom)
            setTo(nextTo)
          }}
        />

        {query.isPending ? (
          <Skeleton className="h-48" />
        ) : (
          query.data && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Summary label="Resultado realizado" value={query.data.comparative.realized_net} />
              <Summary label="Resultado projetado" value={query.data.comparative.projected_net} />
              <Summary label="Saldo final esperado" value={query.data.comparative.expected_final_balance} />
            </div>
          )
        )}
      </CardContent>
    </Card>
  )
}

function Summary({ label, value, accent = 'text-foreground' }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`text-lg font-semibold ${accent}`}>{formatCurrency(value)}</p>
    </div>
  )
}

function CategoryColumn({ title, rows, accent }: { title: string; rows: Array<{ category: string; total: number }>; accent: string }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nenhum dado no período.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.category} className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2">
              <span className="text-sm text-foreground">{row.category}</span>
              <span className={`text-sm font-medium ${accent}`}>{formatCurrency(row.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MovementsList({ title, items }: { title: string; items: Array<{ description: string; cost_center: string | null; value: number }> }) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-surface-2/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{item.description}</p>
              <p className="truncate text-[13px] text-muted">{item.cost_center ?? '—'}</p>
            </div>
            <span className="text-sm font-medium text-foreground">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
