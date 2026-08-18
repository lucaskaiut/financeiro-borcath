import { cn } from '@/shared/utils/cn'

export interface DateRange {
  from: string
  to: string
}

interface RangePreset extends DateRange {
  label: string
  single?: boolean
}

function iso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date)

  copy.setDate(copy.getDate() + amount)

  return copy
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  const day = copy.getDay()

  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day))

  return copy
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function buildPresets(): RangePreset[] {
  const today = new Date()
  const yesterday = addDays(today, -1)

  const monday = startOfWeek(today)
  const sunday = addDays(monday, 6)
  const prevMonday = addDays(monday, -7)
  const prevSunday = addDays(monday, -1)
  const nextMonday = addDays(monday, 7)
  const nextSunday = addDays(monday, 13)

  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const prevMonthEnd = addDays(monthStart, -1)
  const prevMonthStart = startOfMonth(prevMonthEnd)

  return [
    { label: 'Hoje', from: iso(today), to: iso(today), single: true },
    { label: 'Ontem', from: iso(yesterday), to: iso(yesterday), single: true },
    { label: 'Últimos 7 dias', from: iso(addDays(today, -6)), to: iso(today) },
    { label: 'Próximos 7 dias', from: iso(today), to: iso(addDays(today, 6)) },
    { label: 'Esta semana', from: iso(monday), to: iso(sunday) },
    { label: 'Semana passada', from: iso(prevMonday), to: iso(prevSunday) },
    { label: 'Próxima semana', from: iso(nextMonday), to: iso(nextSunday) },
    { label: 'Este mês', from: iso(monthStart), to: iso(monthEnd) },
    { label: 'Mês passado', from: iso(prevMonthStart), to: iso(prevMonthEnd) },
    { label: 'Últimos 30 dias', from: iso(addDays(today, -29)), to: iso(today) },
    { label: 'Últimos 90 dias', from: iso(addDays(today, -89)), to: iso(today) },
  ]
}

/**
 * Atalhos de período para filtros de data.
 * Em `single`, exibe apenas atalhos de dia único (Hoje/Ontem).
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
    ? buildPresets().filter((preset) => preset.single)
    : buildPresets()

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
