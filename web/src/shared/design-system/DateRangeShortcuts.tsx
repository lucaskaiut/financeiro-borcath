import { cn } from '@/shared/utils/cn'
import { buildDateRangePresets, type DateRange } from '@/shared/utils/date'

export type { DateRange } from '@/shared/utils/date'

/**
 * Atalhos de período para filtros de data.
 * Em `single`, exibe apenas atalhos de dia único (Hoje, Ontem, Amanhã).
 */
export function DateRangeShortcuts({
  onApply,
  variant = 'range',
  className,
}: {
  onApply: (range: DateRange) => void
  variant?: 'range' | 'single'
  className?: string
}) {
  const presets = variant === 'single'
    ? buildDateRangePresets().filter((preset) => preset.single)
    : buildDateRangePresets()

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onApply({ from: preset.from, to: preset.to })}
          className="rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
