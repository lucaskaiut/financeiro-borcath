import { formatCurrency, formatDate } from '@/shared/utils/format'
import type { ProvisionReport } from '../services/reports.service'
import { formatProvisionAmount } from './provision-format'

function cell(value: number | null | undefined): string {
  return formatProvisionAmount(value)
}

function columnHeaderRow(headers: string[]): string {
  return `<tr>${headers
    .map(
      (header, index) =>
        `<th style="padding:8px 6px;text-align:${index === 0 ? 'left' : 'right'};background:#f9fafb;border-bottom:1px solid #d1d5db;font-size:10px;text-transform:uppercase;color:#6b7280;">${header}</th>`,
    )
    .join('')}</tr>`
}

export function buildProvisionMatrixHtml(data: ProvisionReport, title: string, subtitle: string): string {
  const headers = ['Conta', ...data.columns.map((column) => column.label), 'Total']
  const sections: string[] = []

  for (const group of data.groups) {
    sections.push(
      `<tr><td colspan="${headers.length}" style="padding:10px 8px;font-weight:700;background:#e5e7eb;text-transform:uppercase;">${group.cost_center}</td></tr>`,
    )
    sections.push(columnHeaderRow(headers))

    for (const row of group.rows) {
      const cells = [row.description, ...data.columns.map((column) => cell(row.amounts[column.key])), '']

      sections.push(
        `<tr>${cells
          .map(
            (value, index) =>
              `<td style="padding:6px;text-align:${index === 0 ? 'left' : 'right'};border-bottom:1px solid #e5e7eb;">${value}</td>`,
          )
          .join('')}</tr>`,
      )
    }

    const subtotalCells = [
      'Subtotal',
      ...data.columns.map((column) => cell(group.subtotal.amounts[column.key])),
      cell(group.subtotal.total),
    ]

    sections.push(
      `<tr style="font-weight:600;background:#f9fafb;">${subtotalCells
        .map(
          (value, index) =>
            `<td style="padding:6px;text-align:${index === 0 ? 'left' : 'right'};border-bottom:1px solid #d1d5db;">${value}</td>`,
        )
        .join('')}</tr>`,
    )
    sections.push(`<tr><td colspan="${headers.length}" style="height:12px;"></td></tr>`)
  }

  sections.push(
    `<tr><td colspan="${headers.length}" style="padding:10px 8px;font-weight:700;background:#e5e7eb;text-transform:uppercase;">Total geral</td></tr>`,
  )
  sections.push(columnHeaderRow(headers))

  const grandCells = [
    'Total geral',
    ...data.columns.map((column) => cell(data.grand_total.amounts[column.key])),
    cell(data.grand_total.total),
  ]

  sections.push(
    `<tr style="font-weight:700;background:#eef2ff;">${grandCells
      .map(
        (value, index) =>
          `<td style="padding:8px 6px;text-align:${index === 0 ? 'left' : 'right'};border-top:2px solid #c7d2fe;">${value}</td>`,
      )
      .join('')}</tr>`,
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
    .summary { margin-top: 16px; font-size: 12px; }
    .summary div { display: flex; justify-content: space-between; padding: 4px 0; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${subtitle}</p>
  <table>
    <tbody>
      ${sections.join('')}
    </tbody>
  </table>
  <div class="summary">
    <div><span>Total a receber</span><strong>${formatCurrency(data.total_in)}</strong></div>
    <div><span>Total a pagar</span><strong>${formatCurrency(data.total_out)}</strong></div>
    <div><span>Saldo líquido do período</span><strong>${formatCurrency(data.grand_total.total)}</strong></div>
    <div><span>Gerado em</span><span>${formatDate(new Date().toISOString())}</span></div>
  </div>
</body>
</html>`
}
