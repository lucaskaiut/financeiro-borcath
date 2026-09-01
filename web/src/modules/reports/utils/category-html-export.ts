import { formatDate } from '@/shared/utils/format'
import type { CategoryMatrix, CategoryMatrixTotals } from '../services/reports.service'
import { formatCategoryAmount } from './category-format'

function cell(value: number | null | undefined): string {
  return formatCategoryAmount(value)
}

function amountCells(totals: CategoryMatrixTotals, matrix: CategoryMatrix, highlightAllValues = false): string {
  const periodStyle = 'padding:6px;text-align:right;border-bottom:1px solid #e5e7eb;color:#111827;'
  const totalColumnStyle = 'padding:6px;text-align:right;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:600;'
  const grandTotalStyle = 'padding:6px;text-align:right;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:700;'

  const values = [
    ...matrix.columns.map((column) => ({
      value: cell(totals.amounts[column.key]),
      style: highlightAllValues ? grandTotalStyle : periodStyle,
    })),
    {
      value: cell(totals.total),
      style: highlightAllValues ? grandTotalStyle : totalColumnStyle,
    },
  ]

  return values.map(({ value, style }) => `<td style="${style}">${value}</td>`).join('')
}

function totalRow(
  label: string,
  totals: CategoryMatrixTotals,
  matrix: CategoryMatrix,
  style: string,
  paddingLeft = '6px',
  highlightAllValues = false,
): string {
  return `<tr style="${style}">
    <td style="padding:6px;padding-left:${paddingLeft};text-align:left;border-bottom:1px solid #93c5fd;">${label}</td>
    ${amountCells(totals, matrix, highlightAllValues)}
  </tr>`
}

export function buildCategoryMatrixHtml(
  matrix: CategoryMatrix,
  title: string,
  subtitle: string,
): string {
  const headers = ['Descrição', ...matrix.columns.map((column) => column.label), 'Total geral']
  const sections: string[] = []

  for (const group of matrix.groups) {
    sections.push(
      `<tr><td colspan="${headers.length}" style="font-weight:700;padding:8px 6px;background:#dbeafe;">${group.cost_center}</td></tr>`,
    )

    for (const category of group.categories) {
      sections.push(
        totalRow(`${category.category} - Totais`, category.subtotal, matrix, 'font-weight:600;background:#dbeafe;'),
      )

      for (const subcategory of category.subcategories) {
        sections.push(
          totalRow(`${subcategory.subcategory} - Totais`, subcategory.subtotal, matrix, 'font-weight:600;background:#eff6ff;', '24px'),
        )
      }
    }

    sections.push(
      totalRow(`${group.cost_center} - Totais`, group.subtotal, matrix, 'font-weight:700;background:#bfdbfe;'),
    )
    sections.push(`<tr><td colspan="${headers.length}" style="height:8px;"></td></tr>`)
  }

  sections.push(
    totalRow('Total geral', matrix.grand_total, matrix, 'font-weight:700;background:#93c5fd;border-top:2px solid #60a5fa;', '6px', true),
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
    th { background: #e0e7ff; padding: 8px 6px; text-align: right; border-bottom: 1px solid #93c5fd; }
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
    <div><span>Total geral do período</span><strong>${cell(matrix.grand_total.total)}</strong></div>
    <div><span>Gerado em</span><span>${formatDate(new Date().toISOString())}</span></div>
  </div>
</body>
</html>`
}
