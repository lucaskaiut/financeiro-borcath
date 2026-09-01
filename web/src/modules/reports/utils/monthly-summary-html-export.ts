import { formatDate } from '@/shared/utils/format'
import type { MonthlySummaryReport } from '../services/reports.service'
import { formatCategoryAmount } from './category-format'

function cell(value: number | null | undefined): string {
  return formatCategoryAmount(value)
}

export function buildMonthlySummaryHtml(data: MonthlySummaryReport, title: string, subtitle: string): string {
  const headers = ['Centro de custo', ...data.columns.map((column) => column.label), 'Total']
  const sections: string[] = []

  for (const row of data.rows) {
    const cells = [
      row.cost_center,
      ...data.columns.map((column) => cell(row.amounts[column.key])),
      cell(row.total),
    ]

    sections.push(
      `<tr>${cells
        .map(
          (value, index) =>
            `<td style="padding:6px;text-align:${index === 0 ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;${index === 0 ? 'font-weight:600;' : ''}">${value}</td>`,
        )
        .join('')}</tr>`,
    )
  }

  const totalCells = [
    'Total',
    ...data.columns.map((column) => cell(data.grand_total.amounts[column.key])),
    cell(data.grand_total.total),
  ]

  sections.push(
    `<tr style="font-weight:700;background:#dbeafe;">${totalCells
      .map(
        (value, index) =>
          `<td style="padding:8px 6px;text-align:${index === 0 ? 'left' : 'right'};border-top:2px solid #93c5fd;">${value}</td>`,
      )
      .join('')}</tr>`,
  )

  const averageColspan = headers.length - 1

  sections.push(
    `<tr style="font-weight:700;background:#ffedd5;">
      <td colspan="${averageColspan}" style="padding:8px 6px;text-align:center;border-top:8px solid #fff;">Média mês</td>
      <td style="padding:8px 6px;text-align:right;">${cell(data.monthly_average)}</td>
    </tr>`,
  )

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
    th { background: #dbeafe; padding: 8px 6px; text-align: right; border-bottom: 1px solid #93c5fd; font-weight: 700; }
    th:first-child { text-align: left; }
    .summary { margin-top: 16px; font-size: 12px; }
    .summary div { display: flex; justify-content: space-between; padding: 4px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${subtitle}</p>
  <table>
    <thead>
      <tr>${headers
        .map(
          (header, index) =>
            `<th style="text-align:${index === 0 ? 'left' : 'right'};">${header}</th>`,
        )
        .join('')}</tr>
    </thead>
    <tbody>
      ${sections.join('')}
    </tbody>
  </table>
  <div class="summary">
    <div><span>Total geral do período</span><strong>${cell(data.grand_total.total)}</strong></div>
    <div><span>Média mês</span><strong>${cell(data.monthly_average)}</strong></div>
    <div><span>Gerado em</span><span>${formatDate(new Date().toISOString())}</span></div>
  </div>
</body>
</html>`
}
