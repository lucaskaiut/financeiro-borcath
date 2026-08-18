import { formatCurrency } from '@/shared/utils/format'
import type { CategoryTotal } from '../services/dashboard.service'
import { useMounted } from '../hooks/useMounted'

export function CategoryBarList({
  title,
  rows,
  accent = 'bg-danger',
}: {
  title: string
  rows: CategoryTotal[]
  accent?: string
}) {
  const mounted = useMounted()
  const max = Math.max(...rows.map((r) => r.total), 1)

  if (rows.length === 0) {
    return (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[13px] text-muted">Nenhuma movimentação no mês.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.category}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-foreground">{row.category}</span>
              <span className="font-medium text-muted">{formatCurrency(row.total)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${accent}`}
                style={{
                  width: mounted ? `${(row.total / max) * 100}%` : '0%',
                  transition: `width 600ms ease-out ${i * 60}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
