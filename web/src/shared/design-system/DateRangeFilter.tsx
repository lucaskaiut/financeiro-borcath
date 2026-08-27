import { cn } from '@/shared/utils/cn'
import type { DateRange } from '@/shared/utils/date'
import { DatePicker } from './DatePicker'
import { DateRangeShortcuts } from './DateRangeShortcuts'

export type { DateRange } from '@/shared/utils/date'

export interface DateRangeFilterProps {
  from: string
  to: string
  onChange: (range: DateRange) => void
  variant?: 'range' | 'single'
  label?: string
  showClear?: boolean
  className?: string
}

/**
 * Filtro de período padronizado: date pickers + atalhos abaixo.
 */
export function DateRangeFilter({
  from,
  to,
  onChange,
  variant = 'range',
  label,
  showClear = false,
  className,
}: DateRangeFilterProps) {
  const hasValue = from !== '' || to !== ''

  if (variant === 'single') {
    return (
      <div className={cn('space-y-2.5', className)}>
        <DatePicker
          aria-label={label ?? 'Data'}
          value={to || from}
          onChange={(event) => {
            const date = event.target.value
            onChange({ from: date, to: date })
          }}
        />
        <DateRangeShortcuts
          variant="single"
          onApply={({ to: nextTo }) => onChange({ from: nextTo, to: nextTo })}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {label && <span className="text-[13px] font-medium text-muted">{label}</span>}

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="date-range-from" className="text-[13px] text-muted">
              De
            </label>
            <DatePicker
              id="date-range-from"
              value={from}
              onChange={(event) => onChange({ from: event.target.value, to })}
            />
          </div>

          <span className="text-[13px] text-muted">até</span>

          <div className="flex items-center gap-2">
            <label htmlFor="date-range-to" className="text-[13px] text-muted">
              Até
            </label>
            <DatePicker
              id="date-range-to"
              value={to}
              onChange={(event) => onChange({ from, to: event.target.value })}
            />
          </div>
        </div>

        {showClear && hasValue && (
          <button
            type="button"
            onClick={() => onChange({ from: '', to: '' })}
            className="text-[13px] font-medium text-muted transition-colors hover:text-foreground"
          >
            Limpar
          </button>
        )}
      </div>

      <DateRangeShortcuts onApply={onChange} />
    </div>
  )
}
