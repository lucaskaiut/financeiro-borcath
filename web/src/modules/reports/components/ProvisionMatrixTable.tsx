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
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-3 bg-surface-2/80">
            <th
              className={cn(
                'sticky left-0 z-20 bg-surface-2/95 text-left font-semibold tracking-wide text-muted uppercase',
                headerClass,
              )}
            >
              Conta
            </th>
            {data.columns.map((column) => (
              <th
                key={column.key}
                className={cn('whitespace-nowrap text-right font-semibold tracking-wide text-muted uppercase', headerClass)}
              >
                {column.label}
              </th>
            ))}
            <th className={cn('whitespace-nowrap text-right font-semibold tracking-wide text-muted uppercase', headerClass)}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.groups.map((group) => (
            <GroupRows
              key={group.cost_center}
              group={group}
              columns={data.columns}
              cellClass={cellClass}
              compact={compact}
            />
          ))}

          <GrandTotalRow grandTotal={data.grand_total} columns={data.columns} cellClass={cellClass} compact={compact} />
        </tbody>
      </table>
    </div>
  )
}

function GroupRows({
  group,
  columns,
  cellClass,
  compact,
}: {
  group: ProvisionReport['groups'][number]
  columns: ProvisionReport['columns']
  cellClass: string
  compact: boolean
}) {
  return (
    <>
      <tr className="border-t border-surface-3 bg-surface-2/50">
        <td
          colSpan={columns.length + 2}
          className={cn('sticky left-0 z-10 bg-surface-2/95 font-semibold text-foreground', cellClass)}
        >
          {group.cost_center}
        </td>
      </tr>

      {group.rows.map((row) => (
        <tr key={row.account_id} className="border-b border-surface-3/60">
          <td className={cn('sticky left-0 z-10 bg-background font-medium text-foreground', cellClass)}>{row.description}</td>
          {columns.map((column) => {
            const value = row.amounts[column.key]

            return (
              <td key={column.key} className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionAccountAmountClass(value))}>
                {formatProvisionAmount(value)}
              </td>
            )
          })}
          <td className={cellClass} />
        </tr>
      ))}

      <tr className={cn('border-b border-surface-3 bg-surface-2/70 font-semibold', compact ? 'text-[11px]' : 'text-sm')}>
        <td className={cn('sticky left-0 z-10 bg-surface-2/95 text-foreground', cellClass)}>Subtotal</td>
        {columns.map((column) => {
          const value = group.subtotal.amounts[column.key]

          return (
            <td key={column.key} className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionTotalAmountClass(value))}>
              {formatProvisionAmount(value)}
            </td>
          )
        })}
        <td className={cn('whitespace-nowrap text-right tabular-nums', cellClass, provisionTotalAmountClass(group.subtotal.total))}>
          {formatProvisionAmount(group.subtotal.total)}
        </td>
      </tr>
    </>
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
