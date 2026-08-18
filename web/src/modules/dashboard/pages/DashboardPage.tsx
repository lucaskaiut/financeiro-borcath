import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Landmark,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import {
  Badge,
  ButtonLink,
  Card,
  CardContent,
  EmptyState,
  Page,
  PageContent,
  PageHeader,
  SegmentedControl,
  Skeleton,
} from '@/shared/design-system'
import { useSessionStore } from '@/shared/stores/session.store'
import { formatCurrency, formatDate } from '@/shared/utils/format'
import { cn } from '@/shared/utils/cn'
import { useDashboardSummary } from '../hooks/useDashboard'
import { useMounted } from '../hooks/useMounted'
import { MonthlyCashFlowChart } from '../components/MonthlyCashFlowChart'
import { ProjectedBalanceChart } from '../components/ProjectedBalanceChart'
import { CategoryBarList } from '../components/CategoryBarList'
import type { DashboardAccount, DashboardKpis } from '../services/dashboard.service'

function KpiCard({
  label,
  icon: Icon,
  value,
  hint,
  accent,
  index,
  mounted,
}: {
  label: string
  icon: LucideIcon
  value: string
  hint?: string
  accent: string
  index: number
  mounted: boolean
}) {
  return (
    <div
      className="transition-[opacity,transform] duration-500 ease-out will-change-transform"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <Card className="h-full transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-raised">
        <CardContent className="flex items-start gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300',
              accent,
            )}
            style={{ transform: mounted ? 'rotate(0deg)' : 'rotate(-8deg) scale(0.8)', transitionDelay: `${index * 60 + 150}ms` }}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-muted">{label}</p>
            <p className="truncate text-xl font-semibold tracking-tight text-foreground">{value}</p>
            {hint && <p className="truncate text-xs text-muted">{hint}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  const mounted = useMounted()
  const resultPositive = kpis.month_result >= 0
  const projectedPositive = kpis.projected_30d >= 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        mounted={mounted}
        index={0}
        label="Saldo atual"
        icon={Wallet}
        value={formatCurrency(kpis.current_balance)}
        accent="bg-primary-soft text-primary"
      />
      <KpiCard
        mounted={mounted}
        index={1}
        label="Entradas do mês"
        icon={ArrowUpRight}
        value={formatCurrency(kpis.month_income)}
        accent="bg-success-soft text-success"
      />
      <KpiCard
        mounted={mounted}
        index={2}
        label="Saídas do mês"
        icon={ArrowDownLeft}
        value={formatCurrency(kpis.month_expense)}
        accent="bg-danger-soft text-danger"
      />
      <KpiCard
        mounted={mounted}
        index={3}
        label="Resultado do mês"
        icon={Scale}
        value={formatCurrency(kpis.month_result)}
        accent={resultPositive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}
      />
      <KpiCard
        mounted={mounted}
        index={4}
        label="A receber (em aberto)"
        icon={TrendingUp}
        value={formatCurrency(kpis.receivable_open)}
        accent="bg-success-soft text-success"
      />
      <KpiCard
        mounted={mounted}
        index={5}
        label="A pagar (em aberto)"
        icon={ArrowDownLeft}
        value={formatCurrency(kpis.payable_open)}
        accent="bg-danger-soft text-danger"
      />
      <KpiCard
        mounted={mounted}
        index={6}
        label="Vencidas"
        icon={AlertTriangle}
        value={formatCurrency(kpis.overdue_total)}
        hint={`${kpis.overdue_count} ${kpis.overdue_count === 1 ? 'lançamento' : 'lançamentos'} em atraso`}
        accent={kpis.overdue_count > 0 ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-muted'}
      />
      <KpiCard
        mounted={mounted}
        index={7}
        label="Projeção 30 dias"
        icon={CalendarClock}
        value={formatCurrency(kpis.projected_30d)}
        hint={kpis.projected_balance !== null ? `Saldo projetado: ${formatCurrency(kpis.projected_balance)}` : undefined}
        accent={projectedPositive ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}
      />
    </div>
  )
}

function AccountRow({ account }: { account: DashboardAccount }) {
  const isReceivable = account.type === 'receivable'

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2/60 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{account.description}</p>
        <p className="truncate text-[13px] text-muted">
          {formatDate(account.due_date)}
          {account.cost_center ? ` · ${account.cost_center}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={isReceivable ? 'success' : 'warning'}>{isReceivable ? 'A receber' : 'A pagar'}</Badge>
        <span className={cn('text-sm font-medium', isReceivable ? 'text-success' : 'text-foreground')}>
          {formatCurrency(account.remaining_amount)}
        </span>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent>
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useSessionStore((state) => state.user)
  const tenant = useSessionStore((state) => state.tenant)
  const [costCenterId, setCostCenterId] = useState('')

  const { data, isPending } = useDashboardSummary(costCenterId || undefined)

  const filterOptions = [
    { value: '', label: 'Todos' },
    ...(data?.cost_centers.map((cc) => ({ value: cc.id, label: cc.name })) ?? []),
  ]

  return (
    <Page>
      <PageHeader
        title={`Olá, ${user?.name.split(' ')[0] ?? ''}`}
        description={`Visão geral da saúde financeira de ${tenant?.name ?? 'sua organização'}.`}
      />

      <PageContent>
        <SegmentedControl value={costCenterId} options={filterOptions} onChange={setCostCenterId} />

        {isPending && <DashboardSkeleton />}

        {!isPending && !data && (
          <Card>
            <EmptyState
              icon={Wallet}
              title="Sem dados financeiros"
              description="Cadastre centros de custo e lançamentos para começar a acompanhar seu fluxo de caixa."
              action={
                <ButtonLink to="/accounts/create">Criar primeiro lançamento</ButtonLink>
              }
            />
          </Card>
        )}

        {data && (
          <div key={costCenterId || 'all'} className="flex flex-col gap-5">
            <KpiGrid kpis={data.kpis} />

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent>
                  <h2 className="mb-4 text-sm font-semibold text-foreground">Fluxo de caixa realizado</h2>
                  <MonthlyCashFlowChart data={data.cash_flow_series} />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <ProjectedBalanceChart data={data.projected_series} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardContent>
                  <CategoryBarList title="Despesas por categoria" rows={data.expense_by_category} accent="bg-danger" />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <CategoryBarList title="Receitas por categoria" rows={data.income_by_category} accent="bg-success" />
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="mb-3 flex items-center gap-2">
                    <Landmark className="size-4 text-muted" />
                    <h3 className="text-sm font-semibold text-foreground">Saldo por centro de custo</h3>
                  </div>
                  {data.balance_by_cost_center.length === 0 ? (
                    <p className="text-[13px] text-muted">Nenhum centro de custo cadastrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.balance_by_cost_center.map((row) => (
                        <div key={row.cost_center_id} className="rounded-lg bg-surface-2/60 p-3">
                          <p className="text-[13px] font-medium text-foreground">{row.cost_center}</p>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted">
                            <span>
                              <span className="text-success">+{formatCurrency(row.income)}</span>
                              {' · '}
                              <span className="text-danger">-{formatCurrency(row.expense)}</span>
                            </span>
                            <span className={cn('text-[13px] font-semibold', row.balance >= 0 ? 'text-success' : 'text-danger')}>
                              {formatCurrency(row.balance)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertTriangle className="size-4 text-danger" />
                      Lançamentos vencidos
                    </h2>
                    <ButtonLink to="/accounts?status=open" variant="ghost" size="sm">
                      Ver todos
                    </ButtonLink>
                  </div>
                  {data.overdue.length === 0 ? (
                    <p className="text-[13px] text-muted">Nenhum lançamento em atraso.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.overdue.map((account) => (
                        <AccountRow key={account.id} account={account} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CalendarClock className="size-4 text-primary" />
                      Próximos vencimentos
                    </h2>
                    <ButtonLink to="/accounts" variant="ghost" size="sm">
                      Ver todos
                    </ButtonLink>
                  </div>
                  {data.upcoming.length === 0 ? (
                    <p className="text-[13px] text-muted">Nenhum vencimento nos próximos 30 dias.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.upcoming.map((account) => (
                        <AccountRow key={account.id} account={account} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </PageContent>
    </Page>
  )
}
