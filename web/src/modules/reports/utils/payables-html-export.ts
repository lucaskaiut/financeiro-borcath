import { formatCurrency, formatShortDate } from '@/shared/utils/format'
import type { PayableAccount, PayablesExportReport, PayablesReport } from '../services/reports.service'
import { isPayablesReportOverdue } from './payables-report'

const NO_COST_CENTER = 'Sem centro de custo'

function costCenterName(value: string | null | undefined): string {
  return value?.trim() || NO_COST_CENTER
}

export function buildPayablesExportReport(data: PayablesReport, selectedIds: Set<string>): PayablesExportReport {
  const groupsMap = new Map<string, PayablesExportReport['groups'][number]>()

  for (const account of data.accounts) {
    const key = costCenterName(account.cost_center)

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        cost_center: key,
        cost_center_id: account.cost_center_id,
        overdue: { accounts: [], total: 0 },
        due_today: { accounts: [], total: 0 },
        total_overdue: 0,
        total_paid_today: 0,
      })
    }

    const group = groupsMap.get(key)!

    if (isPayablesReportOverdue(account, selectedIds)) {
      group.overdue.accounts.push(account)
      group.overdue.total += account.remaining_amount
      group.total_overdue += account.remaining_amount
    }

    if (selectedIds.has(account.id)) {
      group.due_today.accounts.push(account)
      group.due_today.total += account.remaining_amount
      group.total_paid_today += account.remaining_amount
    }
  }

  const groups = Array.from(groupsMap.values())
    .filter((group) => group.overdue.accounts.length > 0 || group.due_today.accounts.length > 0)
    .map((group) => {
      group.overdue.accounts.sort(compareAccounts)
      group.due_today.accounts.sort(compareAccounts)
      group.overdue.total = round2(group.overdue.total)
      group.due_today.total = round2(group.due_today.total)
      group.total_overdue = round2(group.total_overdue)
      group.total_paid_today = round2(group.total_paid_today)
      return group
    })
    .sort((a, b) => a.cost_center.localeCompare(b.cost_center, 'pt-BR'))

  const paidRows = groups.map((group) => ({ cost_center: group.cost_center, amount: group.total_paid_today }))
  const overdueRows = groups.map((group) => ({ cost_center: group.cost_center, amount: group.total_overdue }))
  const totalPaidToday = round2(paidRows.reduce((sum, row) => sum + row.amount, 0))
  const totalOverdue = round2(overdueRows.reduce((sum, row) => sum + row.amount, 0))

  return {
    reference_date: data.reference_date,
    from: data.from,
    to: data.to,
    groups,
    summary: {
      reference_date: data.reference_date,
      paid_today: { title: 'PAGOS', rows: paidRows, total: totalPaidToday },
      overdue: { title: 'EM ATRASO', rows: overdueRows, total: totalOverdue },
    },
    total_overdue: totalOverdue,
    total_paid_today: totalPaidToday,
  }
}

function compareAccounts(a: PayableAccount, b: PayableAccount): number {
  const dateCompare = a.due_date.localeCompare(b.due_date)
  return dateCompare !== 0 ? dateCompare : a.description.localeCompare(b.description, 'pt-BR')
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function rowHtml(cells: string[], alignments: Array<'left' | 'right'>): string {
  return `<tr>${cells
    .map(
      (value, index) =>
        `<td style="padding:6px 8px;text-align:${alignments[index] ?? 'left'};border-bottom:1px solid #e5e7eb;white-space:nowrap;">${value}</td>`,
    )
    .join('')}</tr>`
}

export function buildPayablesReportHtml(data: PayablesExportReport, title: string, subtitle: string): string {
  const referenceDate = formatShortDate(data.reference_date)
  const sections: string[] = []

  for (const group of data.groups) {
    sections.push(
      `<tr><td colspan="4" style="padding:10px 8px;font-weight:700;background:#e5e7eb;text-transform:uppercase;">${group.cost_center}</td></tr>`,
    )
    sections.push(
      rowHtml(['Vencimento', 'Descrição', 'Categoria', 'Valor'], ['left', 'left', 'left', 'right']).replace(
        '<tr>',
        '<tr style="background:#f9fafb;font-size:10px;text-transform:uppercase;color:#6b7280;">',
      ),
    )

    if (group.overdue.accounts.length > 0) {
      sections.push(
        `<tr><td colspan="4" style="padding:8px;font-weight:700;color:#dc2626;text-transform:uppercase;text-align:center;">EM ATRASO</td></tr>`,
      )

      for (const account of group.overdue.accounts) {
        sections.push(
          rowHtml(
            [
              formatShortDate(account.due_date),
              account.description,
              account.category ?? '—',
              formatCurrency(account.remaining_amount),
            ],
            ['left', 'left', 'left', 'right'],
          ),
        )
      }

      sections.push(
        `<tr style="font-weight:700;color:#dc2626;background:#fef2f2;"><td colspan="3" style="padding:8px;text-transform:uppercase;">TOTAL EM ATRASO</td><td style="padding:8px;text-align:right;">${formatCurrency(group.overdue.total)}</td></tr>`,
      )
    }

    if (group.due_today.accounts.length > 0) {
      sections.push(
        `<tr><td colspan="4" style="padding:8px;font-weight:700;color:#15803d;text-transform:uppercase;text-align:center;">PAGOS EM ${referenceDate}</td></tr>`,
      )

      for (const account of group.due_today.accounts) {
        sections.push(
          rowHtml(
            [
              formatShortDate(account.due_date),
              account.description,
              account.category ?? '—',
              formatCurrency(account.remaining_amount),
            ],
            ['left', 'left', 'left', 'right'],
          ),
        )
      }

      sections.push(
        `<tr style="font-weight:700;color:#15803d;background:#f0fdf4;"><td colspan="3" style="padding:8px;text-transform:uppercase;">TOTAL PAGO</td><td style="padding:8px;text-align:right;">${formatCurrency(group.due_today.total)}</td></tr>`,
      )
    }

    sections.push('<tr><td colspan="4" style="height:12px;"></td></tr>')
  }

  const paidSummaryRows = data.summary.paid_today.rows
    .map(
      (row) =>
        `<tr><td style="padding:6px 8px;">${row.cost_center}</td><td style="padding:6px 8px;text-align:right;">${formatCurrency(row.amount)}</td></tr>`,
    )
    .join('')

  const overdueSummaryRows = data.summary.overdue.rows
    .map(
      (row) =>
        `<tr><td style="padding:6px 8px;">${row.cost_center}</td><td style="padding:6px 8px;text-align:right;">${formatCurrency(row.amount)}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { margin: 0 0 16px; color: #4b5563; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
    .summary-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
    .summary-title { font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${subtitle}</p>
  <table>
    <tbody>${sections.join('')}</tbody>
  </table>
  <h2 style="text-align:center;font-size:13px;font-weight:700;text-transform:uppercase;margin:24px 0 16px;">Resumo geral em ${referenceDate}</h2>
  <div class="summary-grid">
    <div class="summary-box">
      <div class="summary-title" style="color:#15803d;">${data.summary.paid_today.title}</div>
      <table style="width:100%;">
        <thead><tr><th style="text-align:left;padding:6px 8px;">Centro de custo</th><th style="text-align:right;padding:6px 8px;">Valor</th></tr></thead>
        <tbody>${paidSummaryRows}
          <tr style="font-weight:700;color:#15803d;"><td style="padding:8px;">TOTAL PAGOS</td><td style="padding:8px;text-align:right;">${formatCurrency(data.summary.paid_today.total)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="summary-box">
      <div class="summary-title" style="color:#dc2626;">Em atraso</div>
      <table style="width:100%;">
        <thead><tr><th style="text-align:left;padding:6px 8px;">Centro de custo</th><th style="text-align:right;padding:6px 8px;">Valor</th></tr></thead>
        <tbody>${overdueSummaryRows}
          <tr style="font-weight:700;color:#dc2626;"><td style="padding:8px;">TOTAL EM ATRASO</td><td style="padding:8px;text-align:right;">${formatCurrency(data.summary.overdue.total)}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`
}
