import { formatCurrency } from '@/shared/utils/format'

export function formatCategoryAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-'
  }

  return formatCurrency(value)
}

export function categoryAmountClass(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'text-muted'
  }

  return 'text-foreground'
}

export function categoryTotalAmountClass(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'text-muted'
  }

  return 'text-danger font-semibold'
}
