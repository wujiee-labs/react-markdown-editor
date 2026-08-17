import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'

const parser = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: false
})

const tableWidthsPattern = /<!--\s*wujiee-table-widths:\s*([\d.,\s]+)\s*-->/gi

function wujieeExtractTableWidths(source: string, preserveMarkers = false): { source: string; widths: number[][] } {
  const widths: number[][] = []
  const cleaned = source.replace(tableWidthsPattern, (_match, values: string) => {
    const parsed = values.split(',')
      .map(value => Number.parseFloat(value.trim()))
      .filter(value => Number.isFinite(value) && value > 0)
    if (!parsed.length) return ''
    const index = widths.push(parsed) - 1
    return preserveMarkers ? `\n\nWUJIEE_TABLE_WIDTHS_TOKEN_${index}\n\n` : ''
  })
  return { source: cleaned, widths }
}

function wujieeApplyTableWidths(html: string, tables: number[][]): string {
  let output = html
  tables.forEach((widths, index) => {
    const total = widths.reduce((sum, width) => sum + width, 0)
    const columns = widths
      .map(width => `<col style="width:${Math.max(4, width / total * 100).toFixed(2)}%">`)
      .join('')
    const marker = `WUJIEE_TABLE_WIDTHS_TOKEN_${index}`
    const markerHtml = `<p>${marker}</p>`
    const markerStart = output.indexOf(markerHtml)
    if (markerStart < 0) return

    const tableEnd = output.lastIndexOf('</table>', markerStart)
    const tableStart = tableEnd < 0 ? -1 : output.lastIndexOf('<table>', tableEnd)
    if (tableStart < 0 || tableEnd < tableStart) return

    const tableContentStart = tableStart + '<table>'.length
    const tableContent = output.slice(tableContentStart, tableEnd)
    const replacement = `<table data-wujiee-md-resizable-table="true"><colgroup>${columns}</colgroup>${tableContent}</table>`
    output = output.slice(0, tableStart) + replacement + output.slice(tableEnd + '</table>'.length, markerStart) + output.slice(markerStart + markerHtml.length)
  })
  return output.replace(/<p>WUJIEE_TABLE_WIDTHS_TOKEN_\d+<\/p>/g, '')
}

const defaultLinkOpen = parser.renderer.rules.link_open

parser.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const token = tokens[index]
  const href = token.attrGet('href') || ''

  if (/^(?:https?:)?\/\//i.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
  }

  return defaultLinkOpen
    ? defaultLinkOpen(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
}

export function renderWujieeMarkdown(source: string): string {
  if (!source.trim()) return ''
  const extracted = wujieeExtractTableWidths(source, true)
  const html = parser.render(extracted.source).replace(
    /<li>\[([ xX])\]\s/g,
    (_, checked: string) => `<li class="wujiee-md-task-list-item"><input class="wujiee-md-task-list-checkbox" type="checkbox" disabled${checked.toLowerCase() === 'x' ? ' checked' : ''}> `
  )
  return wujieeApplyTableWidths(html, extracted.widths)
}

function wujieeTokenText(tokens: Token[]): string[] {
  const lines: string[] = []

  for (const token of tokens) {
    if (token.type === 'inline' && token.children) {
      lines.push(wujieeTokenText(token.children).join(''))
    } else if (['text', 'code_inline', 'code_block', 'fence'].includes(token.type)) {
      lines.push(token.content.replace(/^\[[ xX]\]\s+/, ''))
    } else if (token.type === 'image') {
      lines.push(token.content)
    } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
      lines.push('\n')
    }
  }

  return lines
}

export function wujieeMarkdownToText(source: string): string {
  if (!source.trim()) return ''
  const blocks = parser.parse(wujieeExtractTableWidths(source).source, {})
  const lines: string[] = []

  for (const token of blocks) {
    if (token.type === 'inline' && token.children) lines.push(wujieeTokenText(token.children).join(''))
    else if (token.type === 'code_block' || token.type === 'fence') lines.push(token.content.replace(/\n$/, ''))
  }

  return lines.join('\n')
}

export const renderMarkdown = renderWujieeMarkdown
export const markdownToText = wujieeMarkdownToText
