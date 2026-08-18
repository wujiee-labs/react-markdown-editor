import { act, useState, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownEditor } from '../src/MarkdownEditor'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.body.querySelectorAll('.wujiee-md-tooltip').forEach(node => node.remove())
})

async function render(element: ReactElement) {
  await act(async () => {
    root.render(element)
  })
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function inputTextarea(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('MarkdownEditor', () => {
  it('works as a controlled native form field', async () => {
    const change = vi.fn()
    function Harness() {
      const [value, setValue] = useState('hello')
      return (
        <MarkdownEditor
          value={value}
          onChange={next => {
            change(next)
            setValue(next)
          }}
          name="description"
          required
          maxLength={20}
          mode="edit"
        />
      )
    }
    await render(<Harness />)
    const field = container.querySelector('textarea')!

    expect(field.value).toBe('hello')
    expect(field.name).toBe('description')
    expect(field.required).toBe(true)
    expect(field.hasAttribute('maxlength')).toBe(false)

    inputTextarea(field, 'updated')
    expect(change).toHaveBeenLastCalledWith('updated')
    expect(field.value).toBe('updated')
  })

  it('inserts Markdown formatting around the selection', async () => {
    const change = vi.fn()
    function Harness() {
      const [value, setValue] = useState('hello')
      return <MarkdownEditor value={value} onChange={next => { change(next); setValue(next) }} mode="edit" />
    }
    await render(<Harness />)
    const field = container.querySelector('textarea')!
    field.setSelectionRange(0, 5)
    click(container.querySelector('button[aria-label="粗体"]')!)
    expect(change).toHaveBeenLastCalledWith('**hello**')
  })

  it('escapes raw HTML in preview mode', async () => {
    await render(<MarkdownEditor value="<img src=x onerror=alert(1)>" mode="preview" />)
    const preview = container.querySelector('.wujiee-md-preview')!
    expect(preview.innerHTML).not.toContain('<img')
    expect(preview.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('supports borderless styling and internal tooltips', async () => {
    await render(<MarkdownEditor bordered={false} />)
    expect(container.querySelector('.wujiee-md')?.classList.contains('wujiee-md--borderless')).toBe(true)
    const button = container.querySelector('button[aria-label="粗体"]')!
    act(() => button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    expect(document.body.querySelector('.wujiee-md-tooltip')?.textContent?.trim()).toBe('粗体')
  })

  it('uses its own link dialog', async () => {
    const change = vi.fn()
    function Harness() {
      const [value, setValue] = useState('hello')
      return <MarkdownEditor value={value} onChange={next => { change(next); setValue(next) }} mode="edit" />
    }
    await render(<Harness />)
    const field = container.querySelector('textarea')!
    field.setSelectionRange(0, 5)
    click(container.querySelector('button[aria-label="链接"]')!)
    expect(container.querySelector('.wujiee-md-link-dialog')).not.toBeNull()

    const urlInput = container.querySelector('input[inputmode="url"]') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(urlInput, 'example.com')
      urlInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      container.querySelector('form')!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })
    expect(change).toHaveBeenLastCalledWith('[hello](https://example.com)')
  })

  it('edits formatted content without showing Markdown syntax in wysiwyg mode', async () => {
    const change = vi.fn()
    await render(<MarkdownEditor value="**bold**" editorType="wysiwyg" onChange={change} />)
    const editor = container.querySelector('.wujiee-md-rich-editor') as HTMLDivElement
    expect(editor.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('button[aria-label="编辑"]')).toBeNull()
    expect(container.querySelector('.wujiee-md-statusbar__brand')?.getAttribute('href')).toBe('https://wujiee.com')

    act(() => {
      editor.innerHTML = '<p><strong>updated</strong></p>'
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(change).toHaveBeenLastCalledWith('**updated**')
  })

  it('emits normalized HTML when valueFormat is html', async () => {
    const change = vi.fn()
    await render(
      <MarkdownEditor
        value="<p><strong>bold</strong></p>"
        editorType="wysiwyg"
        valueFormat="html"
        onChange={change}
      />
    )
    const editor = container.querySelector('.wujiee-md-rich-editor') as HTMLDivElement
    act(() => {
      editor.innerHTML = '<h2>标题</h2><p><strong>内容</strong></p>'
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const emitted = String(change.mock.calls.at(-1)?.[0])
    expect(emitted).toContain('<h2>标题</h2>')
    expect(emitted).toContain('<strong>内容</strong>')
    expect(emitted).not.toContain('**')
  })

  it('reflects heading state and toggles it back to a paragraph', async () => {
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    await render(<MarkdownEditor value="## 标题" editorType="wysiwyg" />)
    const editor = container.querySelector('.wujiee-md-rich-editor') as HTMLDivElement
    const headingText = editor.querySelector('h2')!.firstChild!
    const range = document.createRange()
    range.selectNodeContents(headingText)
    await act(async () => {
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    const headingButton = container.querySelector('button[aria-label="标题"]')!
    expect(headingButton.classList.contains('wujiee-md-is-active')).toBe(true)
    expect(headingButton.getAttribute('aria-pressed')).toBe('true')
    click(headingButton)
    expect(execCommand).toHaveBeenCalledWith('formatBlock', false, 'p')
    Reflect.deleteProperty(document, 'execCommand')
  })

  it('exits a code block after Enter on its empty last line', async () => {
    const change = vi.fn()
    await render(<MarkdownEditor value="" editorType="wysiwyg" valueFormat="html" onChange={change} />)
    const editor = container.querySelector('.wujiee-md-rich-editor') as HTMLDivElement
    editor.innerHTML = '<pre>const value = 1\n</pre>'
    const codeText = editor.querySelector('pre')!.firstChild!
    const range = document.createRange()
    range.setStart(codeText, codeText.textContent!.length)
    range.collapse(true)
    await act(async () => {
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
      editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      editor.dispatchEvent(new globalThis.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(editor.querySelector('pre')?.nextElementSibling?.tagName).toBe('P')
    expect(editor.querySelector('pre')?.nextElementSibling?.querySelector('br')).not.toBeNull()
  })

  it('toggles task-list, inline-code and link formatting from the selection', async () => {
    const execCommand = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
    await render(<MarkdownEditor value="" editorType="wysiwyg" valueFormat="html" />)
    const editor = container.querySelector('.wujiee-md-rich-editor') as HTMLDivElement
    editor.innerHTML = '<ul><li class="wujiee-md-task-list-item"><input type="checkbox" disabled> 任务</li></ul><p><code>代码</code>和<a href="https://wujiee.com">链接</a></p>'

    const selectNode = async (node: Node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      await act(async () => {
        window.getSelection()!.removeAllRanges()
        window.getSelection()!.addRange(range)
        editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      })
    }

    await selectNode(editor.querySelector('li')!.lastChild!)
    const taskButton = container.querySelector('button[aria-label="任务列表"]')!
    expect(taskButton.classList.contains('wujiee-md-is-active')).toBe(true)
    click(taskButton)
    expect(editor.querySelector('input[type="checkbox"]')).toBeNull()
    expect(execCommand).toHaveBeenCalledWith('insertUnorderedList')

    await selectNode(editor.querySelector('code')!.firstChild!)
    const codeButton = container.querySelector('button[aria-label="行内代码"]')!
    expect(codeButton.classList.contains('wujiee-md-is-active')).toBe(true)
    click(codeButton)
    expect(editor.querySelector('code')).toBeNull()

    await selectNode(editor.querySelector('a')!.firstChild!)
    const linkButton = container.querySelector('button[aria-label="链接"]')!
    expect(linkButton.classList.contains('wujiee-md-is-active')).toBe(true)
    click(linkButton)
    expect(editor.querySelector('a')).toBeNull()
    expect(editor.textContent).toContain('链接')
    Reflect.deleteProperty(document, 'execCommand')
  })

  it('allows checking task items while editing and persists the checked state', async () => {
    const change = vi.fn()
    await render(<MarkdownEditor value="- [ ] 任务" editorType="wysiwyg" onChange={change} />)
    const checkbox = container.querySelector('.wujiee-md-task-list-checkbox') as HTMLInputElement
    expect(checkbox.disabled).toBe(false)
    act(() => checkbox.click())
    expect(checkbox.checked).toBe(true)
    expect(String(change.mock.calls.at(-1)?.[0])).toContain('- [x] 任务')
  })

  it('supports image uploads and Markdown table insertion', async () => {
    const imageUpload = vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/demo.png', alt: 'demo' })
    const change = vi.fn()
    function Harness() {
      const [value, setValue] = useState('')
      return (
        <MarkdownEditor
          value={value}
          onChange={next => { change(next); setValue(next) }}
          mode="edit"
          imageUpload={imageUpload}
        />
      )
    }
    await render(<Harness />)
    const file = new File(['image'], 'demo.png', { type: 'image/png' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })
    expect(imageUpload).toHaveBeenCalledWith(file)
    expect(change).toHaveBeenLastCalledWith('![demo](https://cdn.example.com/demo.png)')

    click(container.querySelector('button[aria-label="表格"]')!)
    expect(String(change.mock.calls.at(-1)?.[0])).toContain('| 列 1 | 列 2 | 列 3 |')
  })

  it('configures toolbar, colors, and per-button React renderers', async () => {
    await render(
      <MarkdownEditor
        toolbarConfig={{ table: false, fullscreen: false }}
        colors={{ primary: '#ff0000', background: '#fafafa' }}
        toolbarSlots={{
          bold: ({ action }) => <button className="wujiee-custom-bold" type="button" onClick={action}>自定义粗体</button>
        }}
      />
    )
    const rootElement = container.querySelector('.wujiee-md') as HTMLElement
    expect(container.querySelector('button[aria-label="表格"]')).toBeNull()
    expect(container.querySelector('button[aria-label="全屏"]')).toBeNull()
    expect(container.querySelector('.wujiee-custom-bold')?.textContent).toBe('自定义粗体')
    expect(rootElement.style.getPropertyValue('--wujiee-md-primary')).toBe('#ff0000')
    expect(rootElement.style.getPropertyValue('--wujiee-md-bg')).toBe('#fafafa')
  })

  it('keeps attribution and enforces grapheme-aware limits', async () => {
    const change = vi.fn()
    const limit = vi.fn()
    await render(
      <MarkdownEditor
        value="**中A😀**"
        onChange={change}
        maxLength={3}
        mode="edit"
        showStatusbar={false}
        onLimit={limit}
      />
    )
    expect(container.querySelector('.wujiee-md-statusbar > span')).toBeNull()
    expect(container.querySelector('.wujiee-md-statusbar__brand')?.getAttribute('href')).toBe('https://wujiee.com')
    inputTextarea(container.querySelector('textarea')!, '中A😀B')
    expect(limit).toHaveBeenLastCalledWith(3)
    expect(change).not.toHaveBeenCalled()
  })

  it('shows only the character count and limit in the status bar', async () => {
    await render(<MarkdownEditor value="中A😀" maxLength={3} />)
    expect(container.querySelector('.wujiee-md-statusbar > span')?.textContent).toBe('3 / 3')
  })
})
