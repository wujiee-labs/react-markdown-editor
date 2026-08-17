import { describe, expect, it } from 'vitest'
import { markdownToText, renderMarkdown } from '../src/markdown'

describe('renderMarkdown', () => {
  it('renders common markdown', () => {
    const html = renderMarkdown('# Title\n\n**bold** and [link](https://example.com)')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('does not execute raw HTML', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('rejects javascript links', () => {
    const html = renderMarkdown('[bad](javascript:alert(1))')
    expect(html).not.toContain('href=')
  })

  it('renders task list checkboxes', () => {
    const html = renderMarkdown('- [ ] todo\n- [x] done')
    expect(html).toContain('class="wujiee-md-task-list-checkbox"')
    expect(html).toContain('disabled checked')
  })

  it('extracts visible text without Markdown formatting characters', () => {
    expect(markdownToText('## 标题\n\n**粗体**、[链接](https://example.com)')).toBe('标题\n粗体、链接')
  })

  it('restores persisted widths on the matching table', () => {
    const html = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |\n\n| C | D |\n| --- | --- |\n| 3 | 4 |\n<!-- wujiee-table-widths: 30, 70 -->')
    const container = document.createElement('div')
    container.innerHTML = html
    const tables = container.querySelectorAll('table')
    expect(tables[0].querySelectorAll('col')).toHaveLength(0)
    expect(tables[1].querySelectorAll('col')).toHaveLength(2)
    expect((tables[1].querySelector('col') as HTMLElement).style.width).toBe('30.00%')
  })
})
