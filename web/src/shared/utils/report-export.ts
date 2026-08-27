export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function printHtmlReport(title: string, content: string): void {
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111; margin: 32px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 15px; margin: 0 0 16px; font-weight: normal; color: #444; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f3f3f3; }
      td.amount { text-align: right; white-space: nowrap; }
      .summary { margin-top: 24px; font-size: 13px; border-top: 2px solid #111; padding-top: 12px; }
      .summary strong { font-size: 14px; }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')

  if (!win) {
    return
  }

  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.addEventListener('afterprint', () => win.close())
  win.print()
}
