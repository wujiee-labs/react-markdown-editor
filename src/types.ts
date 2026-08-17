import type { FocusEvent, ReactNode } from 'react'

export type EditorMode = 'edit' | 'split' | 'preview'
export type EditorTheme = 'auto' | 'light' | 'dark'
export type EditorType = 'markdown' | 'wysiwyg'
export type ValueFormat = 'markdown' | 'html'

export interface ImageUploadResult {
  url: string
  alt?: string
}

export type ImageUploadHandler = (file: File) => Promise<string | ImageUploadResult>

export type ToolbarItemName =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'quote'
  | 'unordered-list'
  | 'ordered-list'
  | 'task-list'
  | 'inline-code'
  | 'code-block'
  | 'link'
  | 'image'
  | 'table'
  | 'horizontal-rule'

export type ToolbarControlName = ToolbarItemName | 'edit' | 'split' | 'preview' | 'fullscreen'
export type ToolbarConfig = Partial<Record<ToolbarControlName, boolean>>

export interface EditorColorConfig {
  background: string
  backgroundSoft: string
  text: string
  muted: string
  border: string
  primary: string
  primaryContrast: string
  codeBackground: string
  toolbarBackground: string
  focusRing: string
}

export interface EditorLabels {
  heading: string
  bold: string
  italic: string
  strike: string
  quote: string
  unorderedList: string
  orderedList: string
  taskList: string
  inlineCode: string
  codeBlock: string
  link: string
  image: string
  table: string
  uploadImage: string
  uploadingImage: string
  horizontalRule: string
  edit: string
  split: string
  preview: string
  fullscreen: string
  exitFullscreen: string
  characters: string
  emptyPreview: string
  linkText: string
  imageAlt: string
  linkAddress: string
  linkTextLabel: string
  confirm: string
  cancel: string
  invalidLink: string
  addRow: string
  addColumn: string
  deleteRow: string
  deleteColumn: string
}

export interface InsertPayload {
  before?: string
  after?: string
  placeholder?: string
  block?: boolean
}

export interface ToolbarRenderProps {
  item: ToolbarControlName
  label: string
  disabled: boolean
  active: boolean
  action: () => void
}

export type ToolbarRenderer = (props: ToolbarRenderProps) => ReactNode

export interface MarkdownEditorHandle {
  focus: () => void
  blur: () => void
  insert: (payload: InsertPayload) => void
  triggerImagePicker: () => void
  wujieeFocus: () => void
  wujieeBlur: () => void
  wujieeInsert: (payload: InsertPayload) => void
  wujieeTriggerImagePicker: () => void
  textarea: HTMLTextAreaElement | null
  richEditor: HTMLDivElement | null
  wujieeTextarea: HTMLTextAreaElement | null
  wujieeRichEditor: HTMLDivElement | null
}

export interface MarkdownEditorProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  name?: string
  placeholder?: string
  height?: string | number
  minHeight?: string | number
  maxHeight?: string | number
  resizable?: boolean
  maxlength?: number
  maxLength?: number
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  mode?: EditorMode
  editorType?: EditorType
  valueFormat?: ValueFormat
  theme?: EditorTheme
  bordered?: boolean
  locale?: 'zh-CN' | 'en-US'
  labels?: Partial<EditorLabels>
  toolbar?: ToolbarItemName[]
  toolbarConfig?: ToolbarConfig
  colors?: Partial<EditorColorConfig>
  showToolbar?: boolean
  showStatusbar?: boolean
  showModeSwitch?: boolean
  allowFullscreen?: boolean
  imageUpload?: ImageUploadHandler
  imageAccept?: string
  maxImageSize?: number
  ariaLabel?: string
  className?: string
  toolbarBefore?: ReactNode
  toolbarAfter?: ReactNode
  toolbarSlots?: Partial<Record<ToolbarControlName, ToolbarRenderer>>
  renderToolbarItem?: ToolbarRenderer
  onFocus?: (event: FocusEvent<HTMLElement>) => void
  onBlur?: (event: FocusEvent<HTMLElement>) => void
  onModeChange?: (mode: EditorMode) => void
  onImageUploaded?: (result: ImageUploadResult, file: File) => void
  onImageUploadError?: (error: Error, file: File) => void
  onResize?: (height: number) => void
  onLimit?: (maximum: number) => void
}

export type WujieeMarkdownEditorHandle = MarkdownEditorHandle
export type WujieeMarkdownEditorProps = MarkdownEditorProps

export const wujieeDefaultToolbar: ToolbarItemName[] = [
  'heading',
  'bold',
  'italic',
  'strike',
  'quote',
  'unordered-list',
  'ordered-list',
  'task-list',
  'inline-code',
  'code-block',
  'link',
  'image',
  'table',
  'horizontal-rule'
]

export const wujieeDefaultToolbarConfig: Record<ToolbarControlName, boolean> = {
  heading: true,
  bold: true,
  italic: true,
  strike: true,
  quote: true,
  'unordered-list': true,
  'ordered-list': true,
  'task-list': true,
  'inline-code': true,
  'code-block': true,
  link: true,
  image: true,
  table: true,
  'horizontal-rule': true,
  edit: true,
  split: true,
  preview: true,
  fullscreen: true
}

export const wujieeDefaultEditorColors: EditorColorConfig = {
  background: '#ffffff',
  backgroundSoft: '#f6f7f9',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#d9dde5',
  primary: '#2563eb',
  primaryContrast: '#ffffff',
  codeBackground: '#f3f4f6',
  toolbarBackground: '#f6f7f9',
  focusRing: 'rgb(37 99 235 / 0.24)'
}

export const defaultToolbar = wujieeDefaultToolbar
export const defaultToolbarConfig = wujieeDefaultToolbarConfig
export const defaultEditorColors = wujieeDefaultEditorColors
