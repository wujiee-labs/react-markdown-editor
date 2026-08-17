import { useMemo, useState } from 'react'
import {
  wujieeDefaultEditorColors,
  wujieeDefaultToolbarConfig,
  convertWujieeHtmlToMarkdown,
  WujieeMarkdownEditor,
  renderWujieeMarkdown,
  type EditorType,
  type ValueFormat
} from '../src'

const initialContent = `# WUJIEE React Markdown Editor

这是一个轻量、可换肤的 **React Markdown 编辑器**。

- 支持受控与非受控表单
- 支持 Markdown 源码与所见即所得
- 支持图片、表格、主题和工具栏定制

| 能力 | 状态 |
| --- | --- |
| React 18 / 19 | ✅ |
| TypeScript | ✅ |
`

const usageCode = `import { useState } from 'react'
import { WujieeMarkdownEditor } from '@wujiee/react-markdown-editor'
import '@wujiee/react-markdown-editor/style.css'

export function Form() {
  const [content, setContent] = useState('')

  return (
    <WujieeMarkdownEditor
      value={content}
      onChange={setContent}
      editorType="wysiwyg"
      valueFormat="markdown"
      maxLength={5000}
    />
  )
}`

const propRows = [
  ['value / defaultValue', 'string', "''", '受控值或非受控初始值'],
  ['onChange', '(value: string) => void', '-', '内容变化回调'],
  ['editorType', "'markdown' | 'wysiwyg'", "'markdown'", '源码或所见即所得'],
  ['valueFormat', "'markdown' | 'html'", "'markdown'", '保存格式'],
  ['maxLength', 'number', '-', '最大可见 Unicode 字符数'],
  ['height / minHeight', 'string | number', '320 / 200', '高度及最小高度'],
  ['resizable', 'boolean', 'true', '允许从底部拖动高度'],
  ['bordered', 'boolean', 'true', '是否显示边框'],
  ['toolbarConfig', 'Record<string, boolean>', '{}', '控制按钮显示'],
  ['toolbarSlots', 'Record<string, renderer>', '{}', '逐按钮替换渲染'],
  ['colors', 'Partial<EditorColorConfig>', '{}', 'JSON 主题配色'],
  ['imageUpload', '(file: File) => Promise<...>', 'Base64', '图片上传函数']
]

export function App() {
  const [dark, setDark] = useState(false)
  const [editorType, setEditorType] = useState<EditorType>('wysiwyg')
  const [valueFormat, setValueFormat] = useState<ValueFormat>('markdown')
  const [bordered, setBordered] = useState(true)
  const [content, setContent] = useState(initialContent)

  const livePayload = useMemo(() => JSON.stringify({
    field: 'content',
    editorType,
    valueFormat,
    value: content
  }, null, 2), [content, editorType, valueFormat])

  function toggleValueFormat() {
    if (valueFormat === 'markdown') {
      setContent(renderWujieeMarkdown(content))
      setValueFormat('html')
    } else {
      setContent(convertWujieeHtmlToMarkdown(content))
      setValueFormat('markdown')
    }
  }

  return (
    <main className="wujiee-demo" data-theme={dark ? 'dark' : 'light'}>
      <section className="wujiee-demo__card">
        <header className="wujiee-demo__header">
          <div>
            <p className="wujiee-demo__eyebrow">@wujiee/react-markdown-editor</p>
            <h1>React Markdown 在线编辑器</h1>
            <p>不绑定 UI 框架，适合直接放入业务表单。</p>
          </div>
          <div className="wujiee-demo__actions">
            <button className="wujiee-demo__theme" type="button" onClick={() => setEditorType(
              editorType === 'wysiwyg' ? 'markdown' : 'wysiwyg'
            )}>
              {editorType === 'wysiwyg' ? '切换 Markdown 源码' : '切换所见即所得'}
            </button>
            <button className="wujiee-demo__theme" type="button" onClick={() => setBordered(value => !value)}>
              {bordered ? '切换无边框' : '显示边框'}
            </button>
            <button className="wujiee-demo__theme" type="button" onClick={toggleValueFormat}>
              当前保存：{valueFormat === 'markdown' ? 'Markdown' : 'HTML'}
            </button>
            <button className="wujiee-demo__theme" type="button" onClick={() => setDark(value => !value)}>
              {dark ? '切换浅色' : '切换深色'}
            </button>
          </div>
        </header>

        <form onSubmit={event => {
          event.preventDefault()
          window.alert(`已提交 ${content.length} 个字符`)
        }}>
          <label className="wujiee-demo__label" htmlFor="content">项目详情</label>
          <WujieeMarkdownEditor
            value={content}
            onChange={setContent}
            name="content"
            placeholder="请输入内容"
            editorType={editorType}
            valueFormat={valueFormat}
            bordered={bordered}
            showModeSwitch={editorType === 'markdown'}
            theme={dark ? 'dark' : 'light'}
            required
          />
          <button className="wujiee-demo__submit" type="submit">提交表单</button>
        </form>

        <section className="wujiee-docs" aria-labelledby="integration-title">
          <header className="wujiee-docs__header">
            <p className="wujiee-demo__eyebrow">INTEGRATION</p>
            <h2 id="integration-title">组件对接文档</h2>
            <p>编辑方式和保存格式彼此独立，表单通常使用所见即所得，并按接口需要保存 Markdown 或 HTML。</p>
          </header>

          <div className="wujiee-docs__grid">
            <article className="wujiee-docs__panel">
              <h3>安装</h3>
              <pre><code>pnpm add @wujiee/react-markdown-editor</code></pre>
            </article>
            <article className="wujiee-docs__panel">
              <h3>当前表单数据</h3>
              <pre className="wujiee-docs__live"><code>{livePayload}</code></pre>
            </article>
          </div>

          <article className="wujiee-docs__panel wujiee-docs__panel--wide">
            <h3>React 接入示例</h3>
            <pre><code>{usageCode}</code></pre>
          </article>

          <article className="wujiee-docs__panel wujiee-docs__panel--wide">
            <h3>主要参数</h3>
            <div className="wujiee-docs__table-wrap">
              <table className="wujiee-docs__table">
                <thead><tr><th>参数</th><th>类型</th><th>默认值</th><th>说明</th></tr></thead>
                <tbody>
                  {propRows.map(row => (
                    <tr key={row[0]}>
                      <td><code>{row[0]}</code></td>
                      <td><code>{row[1]}</code></td>
                      <td><code>{row[2]}</code></td>
                      <td>{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <div className="wujiee-docs__grid">
            <article className="wujiee-docs__panel">
              <h3>toolbarConfig 完整配置</h3>
              <p>设为 <code>false</code> 隐藏按钮，未传字段默认显示。</p>
              <pre><code>{JSON.stringify(wujieeDefaultToolbarConfig, null, 2)}</code></pre>
            </article>
            <article className="wujiee-docs__panel">
              <h3>colors 完整默认值</h3>
              <p>只传需要覆盖的颜色，其余继续使用默认值或宿主 CSS 变量。</p>
              <pre><code>{JSON.stringify(wujieeDefaultEditorColors, null, 2)}</code></pre>
            </article>
          </div>
        </section>
      </section>
    </main>
  )
}
