import { describe, expect, it } from 'vitest'
import { insertBlock, prefixLines, wrapSelection } from '../src/editorCommands'

describe('editor commands', () => {
  it('wraps a selection and keeps the content selected', () => {
    expect(wrapSelection({ value: 'hello world', start: 6, end: 11 }, '**', '**', '粗体')).toEqual({
      value: 'hello **world**',
      selectionStart: 8,
      selectionEnd: 13
    })
  })

  it('uses a placeholder when nothing is selected', () => {
    expect(wrapSelection({ value: '', start: 0, end: 0 }, '_', '_', '斜体').value).toBe('_斜体_')
  })

  it('prefixes every selected line', () => {
    expect(prefixLines({ value: 'one\ntwo', start: 0, end: 7 }, (index) => `${index + 1}. `).value)
      .toBe('1. one\n2. two')
  })

  it('places a block on its own lines', () => {
    expect(insertBlock({ value: 'beforeafter', start: 6, end: 6 }, '---').value)
      .toBe('before\n---\nafter')
  })
})
