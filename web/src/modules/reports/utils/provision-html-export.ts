import { formatCurrency } from '@/shared/utils/format'
import { escapeHtml } from '@/shared/utils/report-export'
import type { ProvisionReport } from '../services/reports.service'
import { formatProvisionAmount } from './provision-format'

function cell(value: number | null | undefined): string {
  return escapeHtml(formatProvisionAmount(value))
}

function columnHeaderRow(headers: string[]): string {
  return `<tr class="column-header-muted">${headers
    .map(
      (header, index) =>
        `<th class="${index === 0 ? '' : index === headers.length - 1 ? 'amount' : 'amount amount-center'}">${escapeHtml(header)}</th>`,
    )
    .join('')}</tr>`
}

function sectionTable(banner: string, headers: string[], bodyRows: string[]): string {
  return `<table class="report-table">
    <thead>
      <tr class="section-banner"><td colspan="${headers.length}">${escapeHtml(banner)}</td></tr>
      ${columnHeaderRow(headers)}
    </thead>
    <tbody>
      ${bodyRows.join('')}
    </tbody>
  </table>`
}

function dataRow(cells: string[]): string {
  return `<tr>${cells
    .map((value, index) => `<td class="${index === 0 ? '' : 'amount'}">${value}</td>`)
    .join('')}</tr>`
}

export function buildProvisionMatrixHtml(data: ProvisionReport, title: string, subtitle: string): string {
  const headers = ['Conta', ...data.columns.map((column) => column.label), 'Total']
  const tables: string[] = []

  for (const group of data.groups) {
    const bodyRows = group.rows.map((row) =>
      dataRow([escapeHtml(row.description), ...data.columns.map((column) => cell(row.amounts[column.key])), '']),
    )

    bodyRows.push(
      `<tr class="subtotal-row">${[
        'Subtotal',
        ...data.columns.map((column) => cell(group.subtotal.amounts[column.key])),
        cell(group.subtotal.total),
      ]
        .map((value, index) => `<td class="${index === 0 ? '' : 'amount'}">${value}</td>`)
        .join('')}</tr>`,
    )

    tables.push(sectionTable(group.cost_center, headers, bodyRows))
  }

  const grandRows = [
    `<tr class="total-row-grand">${[
      'Total geral',
      ...data.columns.map((column) => cell(data.grand_total.amounts[column.key])),
      cell(data.grand_total.total),
    ]
      .map((value, index) => `<td class="${index === 0 ? '' : 'amount'}">${value}</td>`)
      .join('')}</tr>`,
  ]

  tables.push(sectionTable('TOTAL GERAL', headers, grandRows))

  const subtitleLines = subtitle
    .split(' · ')
    .map((line) => line.trim())
    .filter(Boolean)

  const summaryLine = `Total a receber: ${formatCurrency(data.total_in)} | Total a pagar: ${formatCurrency(data.total_out)} | Saldo líquido: ${formatCurrency(data.grand_total.total)}`

  return `
    <h1 class="report-title">${escapeHtml(title)}</h1>
    ${subtitleLines.map((line) => `<p class="report-subtitle">${escapeHtml(line)}</p>`).join('')}
    <p class="report-summary-line">${escapeHtml(summaryLine)}</p>
    ${tables.join('')}
  `
}
