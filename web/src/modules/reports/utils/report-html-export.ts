import { escapeHtml } from '@/shared/utils/report-export'

export interface ReportHtmlSection {
  title?: string
  headers: string[]
  rows: Array<Array<string | number>>
  amountColumns?: number[]
  footer?: { label: string; value: string }
}

export interface ReportHtmlOptions {
  title: string
  subtitle?: string
  sections: ReportHtmlSection[]
  summary?: Array<{ label: string; value: string }>
}

export function buildReportHtml({ title, subtitle, sections, summary }: ReportHtmlOptions): string {
  const sectionsHtml = sections
    .map((section) => {
      const headerRow = section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
      const bodyRows = section.rows
        .map((row) => {
          const cells = row
            .map((cell, index) => {
              const className = section.amountColumns?.includes(index) ? ' class="amount"' : ''
              return `<td${className}>${escapeHtml(cell)}</td>`
            })
            .join('')

          return `<tr>${cells}</tr>`
        })
        .join('')

      const footerRow = section.footer
        ? `<tr><td colspan="${Math.max(section.headers.length - 1, 1)}"><strong>${escapeHtml(section.footer.label)}</strong></td><td class="amount"><strong>${escapeHtml(section.footer.value)}</strong></td></tr>`
        : ''

      const sectionTitle = section.title ? `<h3>${escapeHtml(section.title)}</h3>` : ''

      return `${sectionTitle}<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}${footerRow}</tbody></table>`
    })
    .join('')

  const summaryHtml =
    summary && summary.length > 0
      ? `<div class="summary">${summary.map((item) => `<p>${escapeHtml(item.label)}: <strong>${escapeHtml(item.value)}</strong></p>`).join('')}</div>`
      : ''

  return `
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<h2>${escapeHtml(subtitle)}</h2>` : ''}
    ${sectionsHtml}
    ${summaryHtml}
  `
}
