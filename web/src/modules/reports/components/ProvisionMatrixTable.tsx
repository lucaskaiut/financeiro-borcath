import { cn } from '@/shared/utils/cn'
import type { ProvisionReport } from '../services/reports.service'
import { formatProvisionAmount, provisionAccountAmountClass, provisionTotalAmountClass } from '../utils/provision-format'

interface ProvisionMatrixTableProps {
  data: ProvisionReport
  compact?: boolean
  className?: string
}

export function ProvisionMatrixTable({ data, compact = false, className }: ProvisionMatrixTableProps) {
  const cellClass = compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-sm'
  const headerClass = compact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'

  return (
    <div className={cn('space-y-8', className)}>
      {data.groups.map((group) => (
        <section key={group.cost_center} className="overflow-x-auto">
          <div
            className={cn(
              'rounded-t-lg bg-surface-2 px-4 py-3 font-bold uppercase tracking-wide text-foreground',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {group.cost_center}
          </div>

          <table className="min-w-full border-collapse">
            <ColumnHeaderRow columns={data.columns} headerClass={headerClass} />
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.account_id} className="border-b border-surface-3/60">
                  <td className={cn('sticky left-0 z-10 bg-background font-medium text-foreground', cellClass)}>
                    {row.description}
                  </td>
                  {data.columns.map((column) => {
                    const value = row.amounts[column.key]

                    return (
                      <td
                        key={column.key}
                        className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionAccountAmountClass(value))}
                      >
                        {formatProvisionAmount(value)}
                      </td>
                    )
                  })}
                  <td className={cellClass} />
                </tr>
              ))}

              <tr className={cn('border-b border-surface-3 bg-surface-2/70 font-semibold', compact ? 'text-[11px]' : 'text-sm')}>
                <td className={cn('sticky left-0 z-10 bg-surface-2/95 text-foreground', cellClass)}>Subtotal</td>
                {data.columns.map((column) => {
                  const value = group.subtotal.amounts[column.key]

                  return (
                    <td
                      key={column.key}
                      className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionTotalAmountClass(value))}
                    >
                      {formatProvisionAmount(value)}
                    </td>
                  )
                })}
                <td className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionTotalAmountClass(group.subtotal.total))}>
                  {formatProvisionAmount(group.subtotal.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      ))}

      <section className="overflow-x-auto">
        <div
          className={cn(
            'rounded-t-lg bg-surface-2 px-4 py-3 font-bold uppercase tracking-wide text-foreground',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          Total geral
        </div>

        <table className="min-w-full border-collapse">
          <ColumnHeaderRow columns={data.columns} headerClass={headerClass} />
          <tbody>
            <GrandTotalRow grandTotal={data.grand_total} columns={data.columns} cellClass={cellClass} compact={compact} />
          </tbody>
        </table>
      </section>
    </div>
  )
}

function ColumnHeaderRow({
  columns,
  headerClass,
}: {
  columns: ProvisionReport['columns']
  headerClass: string
}) {
  return (
    <thead>
      <tr className="border-b border-surface-3 bg-surface-2/50 text-left uppercase tracking-wide text-muted">
        <th className={cn('sticky left-0 z-20 bg-surface-2/95 font-semibold', headerClass)}>Conta</th>
        {columns.map((column) => (
          <th key={column.key} className={cn('whitespace-nowrap text-right font-semibold', headerClass)}>
            {column.label}
          </th>
        ))}
        <th className={cn('whitespace-nowrap text-right font-semibold', headerClass)}>Total</th>
      </tr>
    </thead>
  )
}

function GrandTotalRow({
  grandTotal,
  columns,
  cellClass,
  compact,
}: {
  grandTotal: ProvisionReport['grand_total']
  columns: ProvisionReport['columns']
  cellClass: string
  compact: boolean
}) {
  return (
    <tr className={cn('border-t-2 border-surface-3 bg-surface-2 font-bold', compact ? 'text-[11px]' : 'text-sm')}>
      <td className={cn('sticky left-0 z-10 bg-surface-2 text-foreground', cellClass)}>Total geral</td>
      {columns.map((column) => {
        const value = grandTotal.amounts[column.key]

        return (
          <td key={column.key} className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionTotalAmountClass(value))}>
            {formatProvisionAmount(value)}
          </td>
        )
      })}
      <td className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionTotalAmountClass(grandTotal.total))}>
        {formatProvisionAmount(grandTotal.total)}
      </td>
    </tr>
  )
}
