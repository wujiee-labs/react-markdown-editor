import { describe, expect, it } from 'vitest'
import { htmlToMarkdown } from '../src/htmlToMarkdown'

describe('htmlToMarkdown', () => {
  it('converts rich text formatting back to Markdown', () => {
    const markdown = htmlToMarkdown('<h2>Title</h2><p><strong>bold</strong> and <em>italic</em></p>')
    expect(markdown).toContain('## Title')
    expect(markdown).toContain('**bold**')
    expect(markdown).toContain('_italic_')
  })

  it('preserves strikethrough and task checkboxes', () => {
    const markdown = htmlToMarkdown('<p><s>removed</s></p><ul><li><input type="checkbox" checked disabled>done</li></ul>')
    expect(markdown).toContain('~~removed~~')
    expect(markdown).toContain('[x] done')
  })

  it('converts rich text tables to Markdown tables', () => {
    const markdown = htmlToMarkdown('<table><thead><tr><th>名称</th><th>状态</th></tr></thead><tbody><tr><td>组件</td><td>完成</td></tr></tbody></table>')
    expect(markdown).toContain('| 名称 | 状态 |')
    expect(markdown).toContain('| --- | --- |')
    expect(markdown).toContain('| 组件 | 完成 |')
  })

  it('persists table column widths as WUJIEE metadata', () => {
    const markdown = htmlToMarkdown('<table><colgroup><col style="width:30%"><col style="width:70%"></colgroup><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>')
    expect(markdown).toContain('<!-- wujiee-table-widths: 30.00, 70.00 -->')
  })
})
