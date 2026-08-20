import { Fragment, useState } from 'react'
import { BarChart3, Check, ClipboardList, Download, Printer } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  DataTable,
  DateRangeShortcuts,
  EmptyState,
  Modal,
  Page,
  PageContent,
  PageHeader,
  Select,
  Skeleton,
  type Column,
} from '@/shared/design-system'
import { Can } from '@/app/guards/PermissionGuard'
import { Permission } from '@/shared/constants/permissions'
import { formatCurrency, formatDate, toLocalIsoDate } from '@/shared/utils/format'
import { useCostCenterOptions } from '@/modules/cost-centers/hooks/useCostCenters'
import {
  useCashFlowStatement,
  useCategoryReport,
  useCostCenterReport,
  useDailyReport,
  usePayablesReport,
  useProvisionReport,
  useWeeklyReport,
} from '../hooks/useReports'
import type { CashFlowStatement, CostCenterReportRow, PayableAccount } from '../services/reports.service'

const TABS = [
  { id: 'daily', label: 'Diário' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'provision', label: 'Provisão' },
  { id: 'category', label: 'Por categoria' },
  { id: 'cost-center', label: 'Por centro de custo' },
  { id: 'cash-flow', label: 'Demonstrativo' },
  { id: 'payables', label: 'Contas a pagar' },
] as const

type TabId = (typeof TABS)[number]['id']

const today = toLocalIsoDate()

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
        {tab === 'payables' && <PayablesSection />}
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

interface CostCenterGroup {
  costCenter: string
  accounts: PayableAccount[]
}

function groupByCostCenter(accounts: PayableAccount[]): CostCenterGroup[] {
  const map = new Map<string, PayableAccount[]>()

  for (const account of accounts) {
    const key = account.cost_center ?? 'Sem centro de custo'
    const list = map.get(key) ?? []
    list.push(account)
    map.set(key, list)
  }

  return Array.from(map.entries())
    .map(([costCenter, items]) => ({ costCenter, accounts: items }))
    .sort((a, b) => a.costCenter.localeCompare(b.costCenter, 'pt-BR'))
}

function PayablesSection() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reportOpen, setReportOpen] = useState(false)
  const costCenters = useCostCenterOptions()

  const query = usePayablesReport({
    from: from || undefined,
    to: to || undefined,
    cost_center_id: costCenterId || undefined,
  })

  const accounts = query.data?.accounts ?? []
  const groups = groupByCostCenter(accounts)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allSelected = accounts.length > 0 && accounts.every((a) => selected.has(a.id))

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(accounts.map((a) => a.id)))
  }

  const overdueAccounts = accounts.filter((a) => a.is_overdue)
  const nonOverdueAccounts = accounts.filter((a) => !a.is_overdue)
  const selectedAccounts = nonOverdueAccounts.filter((a) => selected.has(a.id))
  const remainingAccounts = nonOverdueAccounts.filter((a) => !selected.has(a.id))
  const totalOverdue = overdueAccounts.reduce((sum, a) => sum + a.remaining_amount, 0)
  const totalSelected = selectedAccounts.reduce((sum, a) => sum + a.remaining_amount, 0)
  const totalRemaining = remainingAccounts.reduce((sum, a) => sum + a.remaining_amount, 0)
  const totalAnalyzed = accounts.reduce((sum, a) => sum + a.remaining_amount, 0)

  const reportGroups = groups.map((group) => ({
    costCenter: group.costCenter,
    overdue: group.accounts.filter((a) => a.is_overdue),
    others: group.accounts.filter((a) => !a.is_overdue),
  }))

  const costCenterLabel = costCenterId
    ? (costCenters.data?.find((c) => c.value === costCenterId)?.label ?? query.data?.cost_center ?? '')
    : 'Todos os centros de custo'

  const columnsFor = (group: CostCenterGroup, index: number): Array<Column<PayableAccount>> => {
    const allInGroupSelected = group.accounts.every((a) => selected.has(a.id))

    const toggleGroup = () => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (allInGroupSelected) {
          group.accounts.forEach((a) => next.delete(a.id))
        } else {
          group.accounts.forEach((a) => next.add(a.id))
        }
        return next
      })
    }

    return [
      {
        key: 'select',
        header: (
          <Checkbox
            id={`payables-select-all-${index}`}
            checked={allInGroupSelected}
            onChange={toggleGroup}
            aria-label={`Selecionar todas de ${group.costCenter}`}
          />
        ),
        render: (a) => (
          <Checkbox
            id={`payables-${a.id}`}
            checked={selected.has(a.id)}
            onChange={() => toggle(a.id)}
            aria-label={`Selecionar ${a.description}`}
          />
        ),
      },
      {
        key: 'due_date',
        header: 'Vencimento',
        render: (a) => (
          <span className={a.is_overdue ? 'font-medium text-danger' : 'text-muted'}>{formatDate(a.due_date)}</span>
        ),
      },
      {
        key: 'description',
        header: 'Descrição',
        render: (a) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{a.description}</p>
            {a.counterparty && <p className="truncate text-[13px] text-muted">{a.counterparty}</p>}
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Categoria',
        render: (a) => <span className="text-muted">{a.category ?? '—'}</span>,
      },
      {
        key: 'installment',
        header: 'Parcela',
        render: (a) => (a.installment ? <Badge variant="neutral">{a.installment}</Badge> : <span className="text-muted">—</span>),
      },
      {
        key: 'value',
        header: 'Valor',
        render: (a) => <span className="font-medium text-foreground">{formatCurrency(a.remaining_amount)}</span>,
      },
    ]
  }

  const exportCsv = () => {
    const lines: string[] = [
      ['Seção', 'Vencimento', 'Descrição', 'Categoria', 'Valor', 'Centro de custo'].join(';'),
    ]

    const byCostCenter = (a: PayableAccount, b: PayableAccount) =>
      (a.cost_center ?? '').localeCompare(b.cost_center ?? '', 'pt-BR') || a.due_date.localeCompare(b.due_date)

    for (const a of [...overdueAccounts].sort(byCostCenter)) {
      lines.push(['Em atraso', a.due_date, a.description, a.category ?? '', a.remaining_amount.toFixed(2), a.cost_center ?? ''].join(';'))
    }
    for (const a of [...selectedAccounts].sort(byCostCenter)) {
      lines.push(['A pagar hoje', a.due_date, a.description, a.category ?? '', a.remaining_amount.toFixed(2), a.cost_center ?? ''].join(';'))
    }
    for (const a of [...remainingAccounts].sort(byCostCenter)) {
      lines.push(['Em aberto', a.due_date, a.description, a.category ?? '', a.remaining_amount.toFixed(2), a.cost_center ?? ''].join(';'))
    }

    lines.push('')
    lines.push(['Total em atraso', '', '', '', totalOverdue.toFixed(2), ''].join(';'))
    lines.push(['Total a pagar hoje', '', '', '', totalSelected.toFixed(2), ''].join(';'))
    lines.push(['Total em aberto', '', '', '', totalRemaining.toFixed(2), ''].join(';'))
    lines.push(['Valor geral analisado', '', '', '', totalAnalyzed.toFixed(2), ''].join(';'))

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contas-a-pagar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const esc = (value: unknown) =>
      String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

    const accountRow = (a: PayableAccount, marked: boolean) =>
      `<tr><td${a.is_overdue ? ' style="color:#dc2626"' : ''}>${esc(a.due_date)}</td><td>${marked ? '✓ ' : ''}${esc(a.description)}</td><td>${esc(a.category ?? '—')}</td><td style="text-align:right">${esc(formatCurrency(a.remaining_amount))}</td></tr>`

    const reportRows = reportGroups
      .map((group) => {
        const overdue = group.overdue.length
          ? `<tr class="overdue"><td colspan="4">Em atraso</td></tr>
          ${group.overdue.map((a) => accountRow(a, false)).join('')}`
          : ''

        const others = group.others.map((a) => accountRow(a, selected.has(a.id))).join('')

        return `<tr class="cc"><td colspan="4">${esc(group.costCenter)}</td></tr>${overdue}${others}`
      })
      .join('')

    const html = `<!doctype html>
      <html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de contas a pagar</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin: 0 0 16px; font-weight: normal; color: #444; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f3f3f3; }
        .cc td { background: #fafafa; font-weight: bold; }
        .overdue td { color: #dc2626; font-weight: bold; }
        .grand-total { margin-top: 24px; font-size: 13px; border-top: 2px solid #111; padding-top: 12px; }
        .grand-total h3 { margin: 0 0 8px; }
        .grand-total p { margin: 2px 0; }
        .grand-total strong { font-size: 14px; }
      </style></head><body>
        <h1>Relatório de contas a pagar</h1>
        <h2>Período: ${esc(formatDate(query.data?.from))} até ${esc(formatDate(query.data?.to))} · ${esc(costCenterLabel)}</h2>
        <table>
          <thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
          <tbody>
            ${reportRows}
          </tbody>
        </table>
        <div class="grand-total">
          <h3>Resumo geral</h3>
          <p>Qtd. contas em atraso: <strong>${overdueAccounts.length}</strong> — Valor em atraso: <strong>${esc(formatCurrency(totalOverdue))}</strong></p>
          <p>Qtd. contas selecionadas: <strong>${selectedAccounts.length}</strong> — Valor selecionado: <strong>${esc(formatCurrency(totalSelected))}</strong></p>
          <p>Qtd. contas em aberto: <strong>${remainingAccounts.length}</strong> — Valor em aberto: <strong>${esc(formatCurrency(totalRemaining))}</strong></p>
          <p>Valor geral analisado: <strong>${esc(formatCurrency(totalAnalyzed))}</strong></p>
        </div>
      </body></html>`

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()

    win.focus()
    win.addEventListener('afterprint', () => win.close())
    win.print()
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
          <span className="text-muted">até</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg bg-surface-2 px-3 text-sm text-foreground" />
          <Select
            aria-label="Centro de custo"
            className="w-52"
            value={costCenterId}
            onChange={(e) => setCostCenterId(e.target.value)}
            options={[{ value: '', label: 'Todos os centros' }, ...(costCenters.data ?? [])]}
          />
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
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Summary label="Em atraso" value={totalOverdue} accent="text-danger" />
              <Summary label="Selecionadas p/ pagamento" value={totalSelected} accent="text-success" />
              <Summary label="Permanecerão em aberto" value={totalRemaining} />
              <Summary label="Valor geral analisado" value={totalAnalyzed} />
            </div>

            {accounts.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Sem contas em aberto no período" description="Não há contas a pagar para o filtro selecionado." />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {allSelected ? 'Limpar seleção' : 'Selecionar todas'}
                  </Button>
                  <span className="text-[13px] text-muted">
                    {selected.size} de {accounts.length} selecionadas
                  </span>
                </div>
                {groups.map((group, index) => (
                  <div key={group.costCenter}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{group.costCenter}</h3>
                      <span className="text-[13px] font-medium text-foreground">
                        {formatCurrency(group.accounts.reduce((sum, a) => sum + a.remaining_amount, 0))}
                      </span>
                    </div>
                    <DataTable columns={columnsFor(group, index)} rows={group.accounts} rowKey={(a) => a.id} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Can permission={Permission.REPORTS_EXPORT}>
                <Button onClick={() => setReportOpen(true)}>
                  <ClipboardList className="size-4" />
                  Gerar relatório
                </Button>
              </Can>
            </div>
          </>
        )}
      </CardContent>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Relatório de contas a pagar"
        description={`Período: ${formatDate(query.data?.from)} até ${formatDate(query.data?.to)} · ${costCenterLabel}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Fechar
            </Button>
            <Can permission={Permission.REPORTS_EXPORT}>
              <Button variant="secondary" onClick={exportCsv}>
                <Download className="size-4" />
                Exportar CSV
              </Button>
              <Button onClick={printReport}>
                <Printer className="size-4" />
                Imprimir
              </Button>
            </Can>
          </>
        }
      >
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-surface-2/60 text-left text-xs tracking-wide text-muted uppercase">
                    <th className="px-4 py-2.5 font-medium">Vencimento</th>
                    <th className="px-4 py-2.5 font-medium">Descrição</th>
                    <th className="px-4 py-2.5 font-medium">Categoria</th>
                    <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {reportGroups.map((group) => (
                    <Fragment key={group.costCenter}>
                      <tr>
                        <td colSpan={4} className="px-4 pt-3 pb-1 text-[13px] font-semibold text-foreground">
                          {group.costCenter}
                        </td>
                      </tr>
                      {group.overdue.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={4} className="px-4 py-1.5 text-[13px] font-medium text-danger">
                              Em atraso
                            </td>
                          </tr>
                          {group.overdue.map((a) => (
                            <tr key={a.id}>
                              <td className="px-4 py-1.5 text-danger">{formatDate(a.due_date)}</td>
                              <td className="px-4 py-1.5">{a.description}</td>
                              <td className="px-4 py-1.5 text-muted">{a.category ?? '—'}</td>
                              <td className="px-4 py-1.5 text-right font-medium">{formatCurrency(a.remaining_amount)}</td>
                            </tr>
                          ))}
                        </>
                      )}
                      {group.others.map((a) => (
                        <tr key={a.id}>
                          <td className="px-4 py-1.5 text-muted">{formatDate(a.due_date)}</td>
                          <td className="px-4 py-1.5">
                            {selected.has(a.id) && <Check className="mr-1.5 inline size-3.5 text-success" />}
                            {a.description}
                          </td>
                          <td className="px-4 py-1.5 text-muted">{a.category ?? '—'}</td>
                          <td className="px-4 py-1.5 text-right font-medium">{formatCurrency(a.remaining_amount)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="rounded-xl bg-surface-2/60 p-4 text-sm">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Resumo geral</h3>
            <div className="flex items-center justify-between">
              <span className="text-muted">Contas em atraso</span>
              <span className="font-medium text-foreground">{overdueAccounts.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Valor em atraso</span>
              <span className="font-medium text-danger">{formatCurrency(totalOverdue)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted">Contas selecionadas</span>
              <span className="font-medium text-foreground">{selectedAccounts.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Valor selecionado</span>
              <span className="font-medium text-foreground">{formatCurrency(totalSelected)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted">Contas em aberto</span>
              <span className="font-medium text-foreground">{remainingAccounts.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Valor em aberto</span>
              <span className="font-medium text-foreground">{formatCurrency(totalRemaining)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-surface-3 pt-2">
              <span className="font-semibold text-foreground">Valor geral analisado</span>
              <span className="text-lg font-semibold text-foreground">{formatCurrency(totalAnalyzed)}</span>
            </div>
          </div>
        </div>
      </Modal>
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
