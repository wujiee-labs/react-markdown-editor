import TurndownService from 'turndown'

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**'
})

turndown.addRule('strikethrough', {
  filter(node) {
    return ['DEL', 'S', 'STRIKE'].includes(node.nodeName)
  },
  replacement(content) {
    return `~~${content}~~`
  }
})

turndown.addRule('taskCheckbox', {
  filter(node) {
    return node.nodeName === 'INPUT' && (node as HTMLInputElement).type === 'checkbox'
  },
  replacement(_content, node) {
    return (node as HTMLInputElement).checked ? '[x] ' : '[ ] '
  }
})

function wujieeTableCellText(cell: Element): string {
  return (cell.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\|/g, '\\|')
}

turndown.addRule('table', {
  filter: 'table',
  replacement(_content, node) {
    const rows = Array.from(node.querySelectorAll('tr'))
      .map(row => Array.from(row.children)
        .filter(cell => cell.nodeName === 'TH' || cell.nodeName === 'TD')
        .map(wujieeTableCellText))
      .filter(row => row.length)
    if (!rows.length) return ''

    const columnCount = Math.max(...rows.map(row => row.length))
    const firstRowHasHeaders = Boolean(node.querySelector('tr:first-child > th'))
    const header = firstRowHasHeaders ? rows[0] : Array.from({ length: columnCount }, () => '')
    const body = firstRowHasHeaders ? rows.slice(1) : rows
    const normalizeRow = (row: string[]) => [...row, ...Array.from({ length: columnCount - row.length }, () => '')]
    const renderRow = (row: string[]) => `| ${normalizeRow(row).join(' | ')} |`
    const columns = Array.from(node.querySelectorAll('col')) as HTMLElement[]
    const widths = columns
      .map(column => Number.parseFloat(column.style.width || column.getAttribute('width') || ''))
      .filter(width => Number.isFinite(width) && width > 0)
    const widthMetadata = widths.length === columnCount
      ? `\n<!-- wujiee-table-widths: ${widths.map(width => width.toFixed(2)).join(', ')} -->`
      : ''

    return `\n\n${renderRow(header)}\n${renderRow(Array.from({ length: columnCount }, () => '---'))}${body.length ? `\n${body.map(renderRow).join('\n')}` : ''}${widthMetadata}\n\n`
  }
})

export function convertWujieeHtmlToMarkdown(html: string): string {
  return turndown.turndown(html)
    .replace(/^-\s+\[([ xX])\]\s+/gm, '- [$1] ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const htmlToMarkdown = convertWujieeHtmlToMarkdown
