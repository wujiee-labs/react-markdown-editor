# @wujiee/react-markdown-editor

一个轻量、可定制的 React Markdown 编辑器，适合直接放入业务表单。

- 支持 Markdown 源码与所见即所得编辑
- 支持图片上传、表格、预览、全屏和字符限制
- 支持亮色、暗色、无边框及 JSON 配色
- 支持自定义工具栏、逐按钮渲染和编辑器高度
- 支持将内容保存为 Markdown 或 HTML
- 支持 React 18 / 19 和 TypeScript

GitHub：[wujiee-labs/react-markdown-editor](https://github.com/wujiee-labs/react-markdown-editor)

其他框架版本：[Vue 3 版本](https://github.com/wujiee-labs/vue3-markdown-editor)

## 安装

```bash
pnpm add @wujiee/react-markdown-editor
```

也可以使用 npm：

```bash
npm install @wujiee/react-markdown-editor
```

## 快速开始

```tsx
import { useState } from 'react'
import { WujieeMarkdownEditor } from '@wujiee/react-markdown-editor'
import '@wujiee/react-markdown-editor/style.css'

export function ContentForm() {
  const [content, setContent] = useState('')

  return (
    <WujieeMarkdownEditor
      value={content}
      onChange={setContent}
      editorType="wysiwyg"
      placeholder="请输入内容"
    />
  )
}
```

组件也支持非受控模式：

```tsx
<WujieeMarkdownEditor defaultValue="# 初始内容" />
```

## 图片上传

通过 `imageUpload` 接入自己的上传服务。未传入时，图片会以 Base64 写入内容，仅建议用于本地测试。

```tsx
async function uploadImage(file: File) {
  const body = new FormData()
  body.append('file', file)

  const result = await fetch('/api/upload', {
    method: 'POST',
    body
  }).then(response => response.json())

  return { url: result.url, alt: file.name }
}

<WujieeMarkdownEditor
  value={content}
  onChange={setContent}
  editorType="wysiwyg"
  imageUpload={uploadImage}
/>
```

## 常用配置

```tsx
<WujieeMarkdownEditor
  value={content}
  onChange={setContent}
  editorType="wysiwyg"
  valueFormat="html"
  theme="auto"
  bordered={false}
  height={360}
  minHeight={200}
  maxLength={5000}
  toolbarConfig={toolbarConfig}
  colors={colors}
/>
```

```ts
const toolbarConfig = {
  heading: true,
  bold: true,
  italic: true,
  link: true,
  image: true,
  table: true,
  preview: false,
  fullscreen: true
}

const colors = {
  background: '#ffffff',
  backgroundSoft: '#f6f7f9',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#d9dde5',
  primary: '#ef8d6f'
}
```

`toolbarConfig` 中未填写的按钮默认显示。通过 `toolbarSlots` 可以逐个替换按钮：

```tsx
<WujieeMarkdownEditor
  value={content}
  onChange={setContent}
  toolbarSlots={{
    image: ({ action, disabled }) => (
      <button type="button" disabled={disabled} onClick={action}>
        上传图片
      </button>
    )
  }}
/>
```

## 主要属性

| 属性 | 默认值 | 说明 |
| --- | --- | --- |
| `value` / `defaultValue` | `''` | 受控值或非受控初始值 |
| `onChange` | - | 内容变化回调 |
| `editorType` | `markdown` | `markdown` 或 `wysiwyg` |
| `valueFormat` | `markdown` | 保存为 `markdown` 或 `html` |
| `mode` | `split` | `edit`、`split` 或 `preview` |
| `theme` | `auto` | `auto`、`light` 或 `dark` |
| `bordered` | `true` | 是否显示边框 |
| `height` | `320` | 编辑器高度 |
| `minHeight` | `200` | 可拖动的最小高度 |
| `maxHeight` | - | 可拖动的最大高度 |
| `resizable` | `true` | 是否允许从底部拖动高度 |
| `maxLength` | - | 最大可见字符数，中文、字母及组合表情均按一个字符统计 |
| `toolbarConfig` | 全部显示 | 使用 JSON 控制按钮是否显示 |
| `toolbarSlots` | `{}` | 逐按钮替换 React 渲染内容 |
| `colors` | 默认配色 | 使用 JSON 覆盖主题颜色 |
| `imageUpload` | Base64 | 自定义图片上传函数 |
| `readOnly` | `false` | 只读模式 |
| `disabled` | `false` | 禁用编辑器 |

组件还提供 `onFocus`、`onBlur`、`onModeChange`、`onResize`、`onLimit`、`onImageUploaded` 和 `onImageUploadError` 等事件。

## 本地开发

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

## License

本项目采用 [WUJIEE Attribution and Backlink License 1.1](./LICENSE)。满足以下任意一种条件允许免费商用：

1. 保留组件右下角可见、可点击的 [WUJIEE](https://wujiee.com) 链接。
2. 在使用该组件的产品或网站中加入可见、可点击且直接指向 [wujiee.com](https://wujiee.com) 的外链；满足后允许自行修改源码，移除组件内的 WUJIEE 署名。

---

<p align="center">
  <strong>招人难、项目等人、远程机会难找？</strong><br>
  来 WUJIEE 云工作，免费发布远程职位与项目需求，连接专业人才与优质机会，从招聘、求职、接单到项目协作，全流程在线搞定。
</p>

<p align="center">
  <img src="https://wujiee.com/logo.svg" width="20" height="20" alt="WUJIEE云工作" align="absmiddle">
  <a href="https://wujiee.com/">主页</a> ·
  <a href="https://wujiee.com/talents">人才市场</a> ·
  <a href="https://wujiee.com/jobs">职位市场</a> ·
  <a href="https://wujiee.com/projects">项目市场</a>
</p>
