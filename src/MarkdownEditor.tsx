import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent
} from 'react'
import { createPortal } from 'react-dom'
import { countWujieeMarkdownCharacters } from './characterCount'
import { wujieeInsertBlock, wujieeInsertTab, wujieePrefixLines, wujieeWrapSelection, type CommandResult } from './editorCommands'
import { convertWujieeHtmlToMarkdown } from './htmlToMarkdown'
import { WujieeIcon } from './Icon'
import { wujieeEnUSLabels, wujieeZhCNLabels } from './labels'
import { renderWujieeMarkdown } from './markdown'
import {
  wujieeDefaultToolbar,
  type EditorLabels,
  type EditorMode,
  type ImageUploadResult,
  type InsertPayload,
  type MarkdownEditorHandle,
  type MarkdownEditorProps,
  type ToolbarControlName,
  type ToolbarItemName,
  type ToolbarRenderProps
} from './types'

type WujieeEditorStyle = CSSProperties & Record<`--wujiee-md-${string}`, string>

const wujieeToolbarLabelKeys: Record<ToolbarItemName, keyof EditorLabels> = {
  heading: 'heading',
  bold: 'bold',
  italic: 'italic',
  strike: 'strike',
  quote: 'quote',
  'unordered-list': 'unorderedList',
  'ordered-list': 'orderedList',
  'task-list': 'taskList',
  'inline-code': 'inlineCode',
  'code-block': 'codeBlock',
  link: 'link',
  image: 'uploadImage',
  table: 'table',
  'horizontal-rule': 'horizontalRule'
}

function wujieeSizeValue(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

function wujieeConfiguredPixels(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && /^\d+(?:\.\d+)?px$/.test(value.trim())) return Number.parseFloat(value)
  return fallback
}

function wujieeEscapeHtml(value: string): string {
  const element = document.createElement('span')
  element.textContent = value
  return element.innerHTML
}

function wujieeNormalizedLink(value: string): string | undefined {
  const input = value.trim()
  if (!input) return undefined
  if (/^(?:\/|#|\.\/|\.\.\/)/.test(input)) return input
  if (/^(?:mailto:|tel:)/i.test(input)) return input.split(':', 2)[1] ? input : undefined
  const candidate = /^https?:/i.test(input) ? input : `https://${input}`
  try {
    const parsed = new URL(candidate)
    return parsed.hostname ? candidate : undefined
  } catch {
    return undefined
  }
}

function wujieeFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('Unable to read image'))
    reader.readAsDataURL(file)
  })
}

export const WujieeMarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function WujieeMarkdownEditor({
  value,
  defaultValue = '',
  onChange,
  name,
  placeholder = '',
  height = 320,
  minHeight = 200,
  maxHeight,
  resizable = true,
  maxlength,
  maxLength,
  required = false,
  disabled = false,
  readOnly = false,
  autoFocus = false,
  mode = 'split',
  editorType = 'markdown',
  valueFormat = 'markdown',
  theme = 'auto',
  bordered = true,
  locale = 'zh-CN',
  labels: wujieeLabelOverrides = {},
  toolbar = wujieeDefaultToolbar,
  toolbarConfig = {},
  colors = {},
  showToolbar = true,
  showStatusbar = true,
  showModeSwitch = true,
  allowFullscreen = true,
  imageUpload,
  imageAccept = 'image/png,image/jpeg,image/webp,image/gif',
  maxImageSize = 10 * 1024 * 1024,
  ariaLabel = 'Markdown editor',
  className = '',
  toolbarBefore,
  toolbarAfter,
  toolbarSlots = {},
  renderToolbarItem,
  onFocus,
  onBlur,
  onModeChange,
  onImageUploaded,
  onImageUploadError,
  onResize,
  onLimit
}, forwardedRef) {
  const [wujieeInternalValue, setWujieeInternalValue] = useState(defaultValue)
  const [wujieeCurrentMode, setWujieeCurrentMode] = useState<EditorMode>(mode)
  const [wujieeIsFullscreen, setWujieeIsFullscreen] = useState(false)
  const [wujieeIsUploadingImage, setWujieeIsUploadingImage] = useState(false)
  const [wujieeTooltip, setWujieeTooltip] = useState<{ text: string; left: number; top: number }>()
  const [wujieeLinkDialogOpen, setWujieeLinkDialogOpen] = useState(false)
  const [wujieeLinkUrl, setWujieeLinkUrl] = useState('')
  const [wujieeLinkText, setWujieeLinkText] = useState('')
  const [wujieeLinkError, setWujieeLinkError] = useState('')
  const [wujieeDraggedHeight, setWujieeDraggedHeight] = useState<number>()
  const [wujieeActiveTableCell, setWujieeActiveTableCell] = useState<HTMLTableCellElement>()
  const [wujieeActiveToolbarItems, setWujieeActiveToolbarItems] = useState<Partial<Record<ToolbarItemName, boolean>>>({})

  const wujieeTextareaRef = useRef<HTMLTextAreaElement>(null)
  const wujieeRichEditorRef = useRef<HTMLDivElement>(null)
  const wujieeFileInputRef = useRef<HTMLInputElement>(null)
  const wujieeLinkUrlInputRef = useRef<HTMLInputElement>(null)
  const wujieeWorkspaceRef = useRef<HTMLDivElement>(null)
  const wujieeSavedRichRangeRef = useRef<Range | null>(null)
  const wujieeSavedMarkdownSelectionRef = useRef<{ value: string; start: number; end: number } | null>(null)
  const wujieeRichValueToPreserveRef = useRef<string | undefined>(undefined)
  const wujieeSyncRichValueRef = useRef<(preserve?: boolean) => void>(() => undefined)
  const wujieeResizeListenersCleanupRef = useRef<() => void>(() => undefined)
  const wujieeColumnListenersCleanupRef = useRef<() => void>(() => undefined)
  const wujieeResizeStateRef = useRef<{ startY: number; startHeight: number; min: number; max: number } | null>(null)
  const wujieeColumnResizeStateRef = useRef<{
    columns: HTMLTableColElement[]
    index: number
    startX: number
    tableWidth: number
    leftWidth: number
    rightWidth: number
  } | null>(null)
  const wujieeOnResizeRef = useRef(onResize)

  const wujieeModelValue = value ?? wujieeInternalValue
  const wujieeCharacterLimit = maxLength ?? maxlength
  const wujieeLabels = useMemo<EditorLabels>(() => ({
    ...(locale === 'en-US' ? wujieeEnUSLabels : wujieeZhCNLabels),
    ...wujieeLabelOverrides
  }), [wujieeLabelOverrides, locale])
  const wujieeMarkdownValue = useMemo(
    () => valueFormat === 'html' ? convertWujieeHtmlToMarkdown(wujieeModelValue) : wujieeModelValue,
    [wujieeModelValue, valueFormat]
  )
  const wujieeRenderedHtml = useMemo(() => renderWujieeMarkdown(wujieeMarkdownValue), [wujieeMarkdownValue])
  const wujieeCharacterCount = useMemo(() => countWujieeMarkdownCharacters(wujieeMarkdownValue), [wujieeMarkdownValue])
  const wujieeVisibleToolbar = useMemo(
    () => toolbar.filter(item => toolbarConfig[item] !== false),
    [toolbar, toolbarConfig]
  )
  const wujieeImageEnabled = useMemo(
    () => toolbar.includes('image') && toolbarConfig.image !== false,
    [toolbar, toolbarConfig]
  )
  const wujieeVisibleViewModes = useMemo(
    () => (['edit', 'split', 'preview'] as EditorMode[]).filter(view => toolbarConfig[view] !== false),
    [toolbarConfig]
  )

  useEffect(() => setWujieeCurrentMode(mode), [mode])
  useEffect(() => setWujieeDraggedHeight(undefined), [height])
  useEffect(() => { wujieeOnResizeRef.current = onResize }, [onResize])

  const wujieeEditorStyle = useMemo<WujieeEditorStyle>(() => ({
    '--wujiee-md-height': wujieeDraggedHeight === undefined ? wujieeSizeValue(height) : `${wujieeDraggedHeight}px`,
    '--wujiee-md-min-height': wujieeSizeValue(minHeight),
    '--wujiee-md-max-height': maxHeight === undefined ? 'none' : wujieeSizeValue(maxHeight),
    ...(colors.background ? { '--wujiee-md-bg': colors.background } : {}),
    ...(colors.backgroundSoft ? { '--wujiee-md-bg-soft': colors.backgroundSoft } : {}),
    ...(colors.text ? { '--wujiee-md-color': colors.text } : {}),
    ...(colors.muted ? { '--wujiee-md-muted': colors.muted } : {}),
    ...(colors.border ? { '--wujiee-md-border': colors.border } : {}),
    ...(colors.primary ? { '--wujiee-md-primary': colors.primary } : {}),
    ...(colors.primaryContrast ? { '--wujiee-md-primary-contrast': colors.primaryContrast } : {}),
    ...(colors.codeBackground ? { '--wujiee-md-code-bg': colors.codeBackground } : {}),
    ...(colors.toolbarBackground ? { '--wujiee-md-toolbar-bg': colors.toolbarBackground } : {}),
    ...(colors.focusRing ? { '--wujiee-md-focus-ring': colors.focusRing } : {})
  }), [colors, wujieeDraggedHeight, height, maxHeight, minHeight])

  const wujieeEmitValue = useCallback((markdown: string): boolean => {
    if (wujieeCharacterLimit !== undefined && countWujieeMarkdownCharacters(markdown) > wujieeCharacterLimit) {
      onLimit?.(wujieeCharacterLimit)
      return false
    }
    const formatted = valueFormat === 'html' ? renderWujieeMarkdown(markdown) : markdown
    if (value === undefined) setWujieeInternalValue(formatted)
    onChange?.(formatted)
    return true
  }, [wujieeCharacterLimit, onChange, onLimit, value, valueFormat])

  const wujieeSyncRichEditorFromModel = useCallback(() => {
    const editor = wujieeRichEditorRef.current
    if (editor && editor.innerHTML !== wujieeRenderedHtml) {
      setWujieeActiveTableCell(undefined)
      editor.innerHTML = wujieeRenderedHtml
      editor.querySelectorAll<HTMLInputElement>('.wujiee-md-task-list-checkbox').forEach(checkbox => {
        checkbox.disabled = false
        checkbox.removeAttribute('disabled')
      })
    }
  }, [wujieeRenderedHtml])

  const wujieeSyncRichValue = useCallback((preserveRichDom = false) => {
    const editor = wujieeRichEditorRef.current
    if (!editor) return
    const markdown = convertWujieeHtmlToMarkdown(editor.innerHTML)
    wujieeRichValueToPreserveRef.current = preserveRichDom
      ? valueFormat === 'html' ? renderWujieeMarkdown(markdown) : markdown
      : undefined
    if (!wujieeEmitValue(markdown)) {
      wujieeRichValueToPreserveRef.current = undefined
      queueMicrotask(wujieeSyncRichEditorFromModel)
    }
  }, [wujieeEmitValue, wujieeSyncRichEditorFromModel, valueFormat])
  wujieeSyncRichValueRef.current = wujieeSyncRichValue

  useEffect(() => {
    if (wujieeRichValueToPreserveRef.current !== undefined) {
      if (wujieeModelValue === wujieeRichValueToPreserveRef.current) {
        wujieeRichValueToPreserveRef.current = undefined
        return
      }
      wujieeRichValueToPreserveRef.current = undefined
    }
    if (editorType !== 'wysiwyg' || document.activeElement === wujieeRichEditorRef.current) return
    wujieeSyncRichEditorFromModel()
  }, [editorType, wujieeModelValue, wujieeRenderedHtml, wujieeSyncRichEditorFromModel])

  useEffect(() => {
    if (editorType === 'wysiwyg') wujieeSyncRichEditorFromModel()
  }, [editorType, wujieeSyncRichEditorFromModel])

  const wujieeSelection = useCallback(() => ({
    value: wujieeMarkdownValue,
    start: wujieeTextareaRef.current?.selectionStart ?? wujieeMarkdownValue.length,
    end: wujieeTextareaRef.current?.selectionEnd ?? wujieeMarkdownValue.length
  }), [wujieeMarkdownValue])

  const wujieeApplyResult = useCallback((result: CommandResult) => {
    if (disabled || readOnly || !wujieeEmitValue(result.value)) return
    queueMicrotask(() => {
      const textarea = wujieeTextareaRef.current
      if (!textarea) return
      const end = Math.min(result.selectionEnd, result.value.length)
      textarea.focus()
      textarea.setSelectionRange(Math.min(result.selectionStart, end), end)
    })
  }, [disabled, wujieeEmitValue, readOnly])

  const wujieeSelectionBelongsToRichEditor = useCallback(() => {
    const selected = window.getSelection()
    const range = selected?.rangeCount ? selected.getRangeAt(0) : undefined
    return Boolean(range && wujieeRichEditorRef.current?.contains(range.commonAncestorContainer))
  }, [])

  const wujieeRichSelectionElement = useCallback(() => {
    const selected = window.getSelection()
    const node = selected?.focusNode
    const element = node instanceof Element ? node : node?.parentElement
    return element && wujieeRichEditorRef.current?.contains(element) ? element : undefined
  }, [])

  const wujieeQueryCommandState = useCallback((command: string) => {
    try {
      return document.queryCommandState(command)
    } catch {
      return false
    }
  }, [])

  const wujieeUpdateRichToolbarState = useCallback(() => {
    if (editorType !== 'wysiwyg' || !wujieeSelectionBelongsToRichEditor()) return
    const element = wujieeRichSelectionElement()
    const code = element?.closest('code')
    const taskListItem = element?.closest('li')?.querySelector('input[type="checkbox"]')
    setWujieeActiveToolbarItems({
      heading: Boolean(element?.closest('h1, h2, h3, h4, h5, h6')),
      bold: wujieeQueryCommandState('bold') || Boolean(element?.closest('strong, b')),
      italic: wujieeQueryCommandState('italic') || Boolean(element?.closest('em, i')),
      strike: wujieeQueryCommandState('strikeThrough') || Boolean(element?.closest('s, strike, del')),
      quote: Boolean(element?.closest('blockquote')),
      'unordered-list': !taskListItem && (wujieeQueryCommandState('insertUnorderedList') || Boolean(element?.closest('ul'))),
      'ordered-list': wujieeQueryCommandState('insertOrderedList') || Boolean(element?.closest('ol')),
      'task-list': Boolean(taskListItem),
      'inline-code': Boolean(code && !code.closest('pre')),
      'code-block': Boolean(element?.closest('pre')),
      link: Boolean(element?.closest('a'))
    })
  }, [editorType, wujieeQueryCommandState, wujieeRichSelectionElement, wujieeSelectionBelongsToRichEditor])

  const wujieeSaveRichSelection = useCallback(() => {
    if (wujieeSelectionBelongsToRichEditor()) {
      wujieeSavedRichRangeRef.current = window.getSelection()!.getRangeAt(0).cloneRange()
      wujieeUpdateRichToolbarState()
    }
  }, [wujieeSelectionBelongsToRichEditor, wujieeUpdateRichToolbarState])

  useEffect(() => {
    document.addEventListener('selectionchange', wujieeSaveRichSelection)
    return () => document.removeEventListener('selectionchange', wujieeSaveRichSelection)
  }, [wujieeSaveRichSelection])

  const wujieeRestoreRichSelection = useCallback(() => {
    if (!wujieeSavedRichRangeRef.current) return
    const selected = window.getSelection()
    selected?.removeAllRanges()
    selected?.addRange(wujieeSavedRichRangeRef.current)
  }, [])

  const wujieeFocusEditor = useCallback(() => {
    if (editorType === 'wysiwyg') wujieeRichEditorRef.current?.focus()
    else wujieeTextareaRef.current?.focus()
  }, [editorType])

  const wujieeBlurEditor = useCallback(() => {
    if (editorType === 'wysiwyg') wujieeRichEditorRef.current?.blur()
    else wujieeTextareaRef.current?.blur()
  }, [editorType])

  useEffect(() => {
    if (autoFocus) wujieeFocusEditor()
  }, [autoFocus, wujieeFocusEditor])

  useEffect(() => {
    if (!wujieeLinkDialogOpen) return
    wujieeLinkUrlInputRef.current?.focus()
    wujieeLinkUrlInputRef.current?.select()
  }, [wujieeLinkDialogOpen])

  const wujieeOpenLinkDialog = useCallback(() => {
    setWujieeTooltip(undefined)
    setWujieeLinkError('')
    setWujieeLinkUrl('https://')
    if (editorType === 'wysiwyg') {
      wujieeSaveRichSelection()
      setWujieeLinkText(window.getSelection()?.toString().trim() || wujieeLabels.linkText)
    } else {
      const current = wujieeSelection()
      wujieeSavedMarkdownSelectionRef.current = current
      setWujieeLinkText(current.value.slice(current.start, current.end) || wujieeLabels.linkText)
    }
    setWujieeLinkDialogOpen(true)
  }, [editorType, wujieeLabels.linkText, wujieeSaveRichSelection, wujieeSelection])

  const wujieeCloseLinkDialog = useCallback(() => {
    setWujieeLinkDialogOpen(false)
    setWujieeLinkError('')
    queueMicrotask(wujieeFocusEditor)
  }, [wujieeFocusEditor])

  const wujieeConfirmLink = useCallback(() => {
    const url = wujieeNormalizedLink(wujieeLinkUrl)
    if (!url) {
      setWujieeLinkError(wujieeLabels.invalidLink)
      wujieeLinkUrlInputRef.current?.focus()
      return
    }
    const text = wujieeLinkText.trim() || url
    setWujieeLinkDialogOpen(false)
    setWujieeLinkError('')
    if (editorType === 'wysiwyg') {
      wujieeRichEditorRef.current?.focus()
      wujieeRestoreRichSelection()
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${wujieeEscapeHtml(url)}" target="_blank" rel="noopener noreferrer">${wujieeEscapeHtml(text)}</a>`
      )
      wujieeSaveRichSelection()
      wujieeSyncRichValue()
      return
    }
    const current = wujieeSavedMarkdownSelectionRef.current || wujieeSelection()
    const replacement = `[${text}](${url})`
    wujieeApplyResult({
      value: current.value.slice(0, current.start) + replacement + current.value.slice(current.end),
      selectionStart: current.start + 1,
      selectionEnd: current.start + 1 + text.length
    })
  }, [wujieeApplyResult, editorType, wujieeLabels.invalidLink, wujieeLinkText, wujieeLinkUrl, wujieeRestoreRichSelection, wujieeSaveRichSelection, wujieeSelection, wujieeSyncRichValue])

  const wujieeRunMarkdownCommand = useCallback((command: Exclude<ToolbarItemName, 'image'>) => {
    const current = wujieeSelection()
    let result: CommandResult
    switch (command) {
      case 'heading': result = wujieePrefixLines(current, '## ', wujieeLabels.heading); break
      case 'bold': result = wujieeWrapSelection(current, '**', '**', wujieeLabels.bold); break
      case 'italic': result = wujieeWrapSelection(current, '_', '_', wujieeLabels.italic); break
      case 'strike': result = wujieeWrapSelection(current, '~~', '~~', wujieeLabels.strike); break
      case 'quote': result = wujieePrefixLines(current, '> ', wujieeLabels.quote); break
      case 'unordered-list': result = wujieePrefixLines(current, '- ', wujieeLabels.unorderedList); break
      case 'ordered-list': result = wujieePrefixLines(current, index => `${index + 1}. `, wujieeLabels.orderedList); break
      case 'task-list': result = wujieePrefixLines(current, '- [ ] ', wujieeLabels.taskList); break
      case 'inline-code': result = wujieeWrapSelection(current, '`', '`', 'code'); break
      case 'code-block': {
        const selected = current.value.slice(current.start, current.end) || 'code'
        result = wujieeInsertBlock(current, `\`\`\`\n${selected}\n\`\`\``)
        break
      }
      case 'link': wujieeOpenLinkDialog(); return
      case 'table':
        result = wujieeInsertBlock(current, '| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |')
        break
      case 'horizontal-rule': result = wujieeInsertBlock(current, '---'); break
    }
    wujieeApplyResult(result)
  }, [wujieeApplyResult, wujieeLabels, wujieeOpenLinkDialog, wujieeSelection])

  const wujieeWrapRichSelection = useCallback(() => {
    const selected = window.getSelection()
    if (!selected?.rangeCount || !wujieeSelectionBelongsToRichEditor()) return
    const range = selected.getRangeAt(0)
    const element = document.createElement('code')
    if (range.collapsed) {
      element.textContent = 'code'
      range.insertNode(element)
    } else {
      element.append(range.extractContents())
      range.insertNode(element)
    }
    range.selectNodeContents(element)
    selected.removeAllRanges()
    selected.addRange(range)
  }, [wujieeSelectionBelongsToRichEditor])

  const wujieeUnwrapRichElement = useCallback((element: Element) => {
    const children = Array.from(element.childNodes)
    const first = children[0]
    const last = children[children.length - 1]
    if (!first || !last) return
    element.replaceWith(...children)
    const range = document.createRange()
    range.setStartBefore(first)
    range.setEndAfter(last)
    const selected = window.getSelection()
    selected?.removeAllRanges()
    selected?.addRange(range)
  }, [])

  const wujieeToggleRichInlineCode = useCallback(() => {
    const code = wujieeRichSelectionElement()?.closest('code')
    if (code && !code.closest('pre')) wujieeUnwrapRichElement(code)
    else wujieeWrapRichSelection()
  }, [wujieeRichSelectionElement, wujieeUnwrapRichElement, wujieeWrapRichSelection])

  const wujieeToggleRichTaskList = useCallback((active: boolean) => {
    if (!active) {
      document.execCommand('insertHTML', false, `<ul><li class="wujiee-md-task-list-item"><input class="wujiee-md-task-list-checkbox" type="checkbox"> ${wujieeEscapeHtml(wujieeLabels.taskList)}</li></ul>`)
      return
    }
    const item = wujieeRichSelectionElement()?.closest('li')
    const checkbox = item?.querySelector('input[type="checkbox"]')
    if (!item || !checkbox) return
    checkbox.remove()
    item.classList.remove('wujiee-md-task-list-item')
    if (item.firstChild?.nodeType === Node.TEXT_NODE) {
      item.firstChild.textContent = item.firstChild.textContent?.replace(/^\s+/, '') || ''
    }
    document.execCommand('insertUnorderedList')
  }, [wujieeLabels.taskList, wujieeRichSelectionElement])

  const wujieeRunRichCommand = useCallback((command: Exclude<ToolbarItemName, 'image'>) => {
    if (!wujieeRichEditorRef.current) return
    wujieeRichEditorRef.current.focus()
    wujieeRestoreRichSelection()
    wujieeUpdateRichToolbarState()
    const wasActive = Boolean(wujieeActiveToolbarItems[command])
    switch (command) {
      case 'heading': document.execCommand('formatBlock', false, wasActive ? 'p' : 'h2'); break
      case 'bold': document.execCommand('bold'); break
      case 'italic': document.execCommand('italic'); break
      case 'strike': document.execCommand('strikeThrough'); break
      case 'quote': document.execCommand('formatBlock', false, wasActive ? 'p' : 'blockquote'); break
      case 'unordered-list': document.execCommand('insertUnorderedList'); break
      case 'ordered-list': document.execCommand('insertOrderedList'); break
      case 'task-list': wujieeToggleRichTaskList(wasActive); break
      case 'inline-code': wujieeToggleRichInlineCode(); break
      case 'code-block': document.execCommand('formatBlock', false, wasActive ? 'p' : 'pre'); break
      case 'link': {
        const link = wujieeRichSelectionElement()?.closest('a')
        if (wasActive && link) wujieeUnwrapRichElement(link)
        else { wujieeOpenLinkDialog(); return }
        break
      }
      case 'table':
        document.execCommand('insertHTML', false, '<table data-wujiee-md-resizable-table="true"><colgroup><col style="width:33.33%"><col style="width:33.33%"><col style="width:33.34%"></colgroup><thead><tr><th>列 1</th><th>列 2</th><th>列 3</th></tr></thead><tbody><tr><td>内容</td><td>内容</td><td>内容</td></tr><tr><td>内容</td><td>内容</td><td>内容</td></tr></tbody></table><p><br></p>')
        break
      case 'horizontal-rule': document.execCommand('insertHorizontalRule'); break
    }
    wujieeSaveRichSelection()
    wujieeSyncRichValue()
  }, [wujieeActiveToolbarItems, wujieeOpenLinkDialog, wujieeRestoreRichSelection, wujieeRichSelectionElement, wujieeSaveRichSelection, wujieeSyncRichValue, wujieeToggleRichInlineCode, wujieeToggleRichTaskList, wujieeUnwrapRichElement, wujieeUpdateRichToolbarState])

  const wujieeTriggerImagePicker = useCallback(() => {
    if (!wujieeImageEnabled || disabled || readOnly || wujieeIsUploadingImage) return
    if (editorType === 'wysiwyg') wujieeSaveRichSelection()
    if (wujieeFileInputRef.current) {
      wujieeFileInputRef.current.value = ''
      wujieeFileInputRef.current.click()
    }
  }, [disabled, editorType, wujieeImageEnabled, wujieeIsUploadingImage, readOnly, wujieeSaveRichSelection])

  const wujieeRunCommand = useCallback((command: ToolbarItemName) => {
    if (disabled || readOnly) return
    if (command === 'image') {
      wujieeTriggerImagePicker()
      return
    }
    if (editorType === 'wysiwyg') wujieeRunRichCommand(command)
    else if (command === 'link') wujieeOpenLinkDialog()
    else wujieeRunMarkdownCommand(command)
  }, [disabled, editorType, wujieeOpenLinkDialog, readOnly, wujieeRunMarkdownCommand, wujieeRunRichCommand, wujieeTriggerImagePicker])

  const wujieeInsert = useCallback((payload: InsertPayload) => {
    if (editorType === 'wysiwyg') {
      wujieeRichEditorRef.current?.focus()
      wujieeRestoreRichSelection()
      document.execCommand('insertText', false, `${payload.before || ''}${payload.placeholder || ''}${payload.after || ''}`)
      wujieeSyncRichValue()
      return
    }
    const current = wujieeSelection()
    if (payload.block) wujieeApplyResult(wujieeInsertBlock(current, payload.placeholder || payload.before || ''))
    else wujieeApplyResult(wujieeWrapSelection(current, payload.before || '', payload.after || '', payload.placeholder || ''))
  }, [wujieeApplyResult, editorType, wujieeRestoreRichSelection, wujieeSelection, wujieeSyncRichValue])

  useImperativeHandle(forwardedRef, () => ({
    focus: wujieeFocusEditor,
    blur: wujieeBlurEditor,
    insert: wujieeInsert,
    triggerImagePicker: wujieeTriggerImagePicker,
    wujieeFocus: wujieeFocusEditor,
    wujieeBlur: wujieeBlurEditor,
    wujieeInsert,
    wujieeTriggerImagePicker,
    get textarea() { return wujieeTextareaRef.current },
    get richEditor() { return wujieeRichEditorRef.current },
    get wujieeTextarea() { return wujieeTextareaRef.current },
    get wujieeRichEditor() { return wujieeRichEditorRef.current }
  }), [wujieeBlurEditor, wujieeFocusEditor, wujieeInsert, wujieeTriggerImagePicker])

  const wujieeSetMode = useCallback((nextMode: EditorMode) => {
    setWujieeCurrentMode(nextMode)
    onModeChange?.(nextMode)
    if (nextMode !== 'preview') queueMicrotask(() => wujieeTextareaRef.current?.focus())
  }, [onModeChange])

  const wujieeToggleFullscreen = useCallback(() => {
    if (!allowFullscreen) return
    setWujieeIsFullscreen(current => {
      const next = !current
      document.body.classList.toggle('wujiee-md-body-locked', next)
      return next
    })
  }, [allowFullscreen])

  const wujieeTableFromCell = useCallback((cell = wujieeActiveTableCell) => (
    cell?.closest('table') as HTMLTableElement | undefined
  ), [wujieeActiveTableCell])

  const wujieeRebuildEqualColumns = useCallback((table: HTMLTableElement) => {
    const columnCount = table.rows[0]?.cells.length || 0
    let group = table.querySelector('colgroup')
    if (!group) {
      group = document.createElement('colgroup')
      table.insertBefore(group, table.firstChild)
    }
    group.replaceChildren()
    const width = columnCount ? 100 / columnCount : 100
    return Array.from({ length: columnCount }, () => {
      const column = document.createElement('col')
      column.style.width = `${width.toFixed(2)}%`
      group!.append(column)
      return column
    })
  }, [])

  const wujieeEnsureTableColumns = useCallback((table: HTMLTableElement) => {
    const expected = table.rows[0]?.cells.length || 0
    const existing = Array.from(table.querySelectorAll<HTMLTableColElement>('colgroup > col'))
    return existing.length === expected && expected > 0 ? existing : wujieeRebuildEqualColumns(table)
  }, [wujieeRebuildEqualColumns])

  const wujieeCellAtResizableEdge = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element
    const cell = target.closest('th, td') as HTMLTableCellElement | null
    if (!cell || !wujieeRichEditorRef.current?.contains(cell) || cell.cellIndex >= cell.parentElement!.children.length - 1) return undefined
    return Math.abs(event.clientX - cell.getBoundingClientRect().right) <= 7 ? cell : undefined
  }, [])

  const wujieeStopColumnResize = useCallback((sync = false) => {
    wujieeColumnResizeStateRef.current = null
    document.body.classList.remove('wujiee-md-body-column-resizing')
    wujieeRichEditorRef.current?.classList.remove('wujiee-md-column-edge-hover')
    if (sync) wujieeSyncRichValueRef.current(true)
  }, [])

  const wujieeHandleTablePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const cell = wujieeCellAtResizableEdge(event)
    if (!cell) return
    const table = cell.closest('table') as HTMLTableElement
    const columns = wujieeEnsureTableColumns(table)
    const tableWidth = table.getBoundingClientRect().width
    if (!tableWidth || !columns[cell.cellIndex + 1]) return
    event.preventDefault()
    wujieeColumnListenersCleanupRef.current()
    setWujieeActiveTableCell(cell)
    wujieeColumnResizeStateRef.current = {
      columns,
      index: cell.cellIndex,
      startX: event.clientX,
      tableWidth,
      leftWidth: Number.parseFloat(columns[cell.cellIndex].style.width),
      rightWidth: Number.parseFloat(columns[cell.cellIndex + 1].style.width)
    }
    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const state = wujieeColumnResizeStateRef.current
      if (!state) return
      const delta = (moveEvent.clientX - state.startX) / state.tableWidth * 100
      const minimum = 6
      const adjusted = Math.max(minimum - state.leftWidth, Math.min(state.rightWidth - minimum, delta))
      state.columns[state.index].style.width = `${(state.leftWidth + adjusted).toFixed(2)}%`
      state.columns[state.index + 1].style.width = `${(state.rightWidth - adjusted).toFixed(2)}%`
    }
    const handleUp = () => {
      wujieeColumnListenersCleanupRef.current()
      wujieeStopColumnResize(true)
    }
    wujieeColumnListenersCleanupRef.current = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      wujieeColumnListenersCleanupRef.current = () => undefined
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    document.body.classList.add('wujiee-md-body-column-resizing')
  }, [wujieeCellAtResizableEdge, wujieeEnsureTableColumns, wujieeStopColumnResize])

  const wujieeAddTableRow = useCallback(() => {
    const cell = wujieeActiveTableCell
    const table = wujieeTableFromCell(cell)
    if (!cell || !table) return
    const body = table.tBodies[0] || table.createTBody()
    const currentRow = cell.parentElement as HTMLTableRowElement
    const nextIndex = currentRow.parentElement === body ? currentRow.sectionRowIndex + 1 : 0
    const row = body.insertRow(nextIndex)
    const columnCount = table.rows[0]?.cells.length || 1
    for (let index = 0; index < columnCount; index += 1) row.insertCell().innerHTML = '<br>'
    setWujieeActiveTableCell(row.cells[Math.min(cell.cellIndex, row.cells.length - 1)])
    wujieeSyncRichValue(true)
  }, [wujieeActiveTableCell, wujieeSyncRichValue, wujieeTableFromCell])

  const wujieeAddTableColumn = useCallback(() => {
    const cell = wujieeActiveTableCell
    const table = wujieeTableFromCell(cell)
    if (!cell || !table) return
    const insertAt = cell.cellIndex + 1
    Array.from(table.rows).forEach(row => {
      const next = row.cells[insertAt] || null
      const newCell = document.createElement(row.parentElement?.tagName === 'THEAD' ? 'th' : 'td')
      newCell.innerHTML = '<br>'
      row.insertBefore(newCell, next)
    })
    wujieeRebuildEqualColumns(table)
    setWujieeActiveTableCell((cell.parentElement as HTMLTableRowElement).cells[insertAt])
    wujieeSyncRichValue(true)
  }, [wujieeActiveTableCell, wujieeRebuildEqualColumns, wujieeSyncRichValue, wujieeTableFromCell])

  const wujieeDeleteTableRow = useCallback(() => {
    const cell = wujieeActiveTableCell
    const table = wujieeTableFromCell(cell)
    const row = cell?.parentElement as HTMLTableRowElement | undefined
    if (!cell || !table || !row || row.parentElement?.tagName === 'THEAD') return
    const nextRow = row.nextElementSibling as HTMLTableRowElement | null
    const previousRow = row.previousElementSibling as HTMLTableRowElement | null
    row.remove()
    const targetRow = nextRow || previousRow || table.tHead?.rows[0]
    setWujieeActiveTableCell(targetRow?.cells[Math.min(cell.cellIndex, targetRow.cells.length - 1)])
    wujieeSyncRichValue(true)
  }, [wujieeActiveTableCell, wujieeSyncRichValue, wujieeTableFromCell])

  const wujieeDeleteTableColumn = useCallback(() => {
    const cell = wujieeActiveTableCell
    const table = wujieeTableFromCell(cell)
    if (!cell || !table || table.rows[0].cells.length <= 1) return
    const removeAt = cell.cellIndex
    Array.from(table.rows).forEach(row => row.cells[removeAt]?.remove())
    wujieeRebuildEqualColumns(table)
    setWujieeActiveTableCell(table.rows[0].cells[Math.min(removeAt, table.rows[0].cells.length - 1)])
    wujieeSyncRichValue(true)
  }, [wujieeActiveTableCell, wujieeRebuildEqualColumns, wujieeSyncRichValue, wujieeTableFromCell])

  const wujieeStartResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const workspace = wujieeWorkspaceRef.current
    if (!resizable || !workspace) return
    const computedMin = Number.parseFloat(getComputedStyle(workspace).minHeight)
    wujieeResizeListenersCleanupRef.current()
    wujieeResizeStateRef.current = {
      startY: event.clientY,
      startHeight: workspace.getBoundingClientRect().height,
      min: wujieeConfiguredPixels(minHeight, Number.isFinite(computedMin) ? computedMin : 200),
      max: wujieeConfiguredPixels(maxHeight, Number.POSITIVE_INFINITY)
    }
    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      const state = wujieeResizeStateRef.current
      if (!state) return
      setWujieeDraggedHeight(Math.min(
        state.max,
        Math.max(state.min, Math.round(state.startHeight + moveEvent.clientY - state.startY))
      ))
    }
    const handleUp = () => {
      wujieeResizeListenersCleanupRef.current()
      wujieeResizeStateRef.current = null
      document.body.classList.remove('wujiee-md-body-resizing')
      const currentHeight = wujieeWorkspaceRef.current?.getBoundingClientRect().height
      if (currentHeight !== undefined) wujieeOnResizeRef.current?.(Math.round(currentHeight))
    }
    wujieeResizeListenersCleanupRef.current = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      wujieeResizeListenersCleanupRef.current = () => undefined
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    document.body.classList.add('wujiee-md-body-resizing')
  }, [maxHeight, minHeight, resizable])

  useEffect(() => () => {
    wujieeResizeListenersCleanupRef.current()
    wujieeColumnListenersCleanupRef.current()
    document.body.classList.remove('wujiee-md-body-locked', 'wujiee-md-body-resizing', 'wujiee-md-body-column-resizing')
    wujieeResizeStateRef.current = null
    wujieeStopColumnResize()
  }, [wujieeStopColumnResize])

  const wujieeHandleResizeKeydown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'Home'].includes(event.key) || !wujieeWorkspaceRef.current) return
    event.preventDefault()
    const current = wujieeWorkspaceRef.current.getBoundingClientRect().height
    const next = event.key === 'Home'
      ? wujieeConfiguredPixels(minHeight, 200)
      : current + (event.key === 'ArrowUp' ? -16 : 16)
    const computedMin = Number.parseFloat(getComputedStyle(wujieeWorkspaceRef.current).minHeight)
    const minimum = wujieeConfiguredPixels(minHeight, Number.isFinite(computedMin) ? computedMin : 200)
    const maximum = wujieeConfiguredPixels(maxHeight, Number.POSITIVE_INFINITY)
    const clamped = Math.min(maximum, Math.max(minimum, Math.round(next)))
    setWujieeDraggedHeight(clamped)
    onResize?.(clamped)
  }, [maxHeight, minHeight, onResize])

  const wujieeHandleKeydown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && wujieeLinkDialogOpen) {
      event.preventDefault()
      wujieeCloseLinkDialog()
      return
    }
    if (event.key === 'Escape' && wujieeIsFullscreen) {
      event.preventDefault()
      wujieeToggleFullscreen()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      wujieeApplyResult(wujieeInsertTab(wujieeSelection()))
      return
    }
    if (!(event.metaKey || event.ctrlKey)) return
    const key = event.key.toLowerCase()
    const shortcut = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : undefined
    if (!shortcut) return
    event.preventDefault()
    wujieeRunCommand(shortcut)
  }, [wujieeApplyResult, wujieeCloseLinkDialog, wujieeIsFullscreen, wujieeLinkDialogOpen, wujieeRunCommand, wujieeSelection, wujieeToggleFullscreen])

  const wujieeExitRichCodeBlock = useCallback(() => {
    const selected = window.getSelection()
    if (!selected?.rangeCount) return false
    const range = selected.getRangeAt(0)
    const pre = wujieeRichSelectionElement()?.closest('pre')
    if (!pre || !range.collapsed) return false

    const afterRange = document.createRange()
    afterRange.selectNodeContents(pre)
    afterRange.setStart(range.startContainer, range.startOffset)
    const afterFragment = afterRange.cloneContents()
    if (afterFragment.textContent || afterFragment.querySelector('br')) return false

    const beforeRange = document.createRange()
    beforeRange.selectNodeContents(pre)
    beforeRange.setEnd(range.startContainer, range.startOffset)
    const beforeFragment = beforeRange.cloneContents()
    const beforeContainer = document.createElement('div')
    beforeContainer.append(beforeFragment)
    const hasEmptyLastLine = beforeRange.toString().endsWith('\n') || /<br\s*\/?>\s*$/i.test(beforeContainer.innerHTML)
    if (!hasEmptyLastLine) return false

    const paragraph = document.createElement('p')
    paragraph.append(document.createElement('br'))
    pre.after(paragraph)
    const exitRange = document.createRange()
    exitRange.setStart(paragraph, 0)
    exitRange.collapse(true)
    selected.removeAllRanges()
    selected.addRange(exitRange)
    return true
  }, [wujieeRichSelectionElement])

  const wujieeHandleRichKeydown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && wujieeLinkDialogOpen) {
      event.preventDefault()
      wujieeCloseLinkDialog()
    } else if (event.key === 'Escape' && wujieeIsFullscreen) {
      event.preventDefault()
      wujieeToggleFullscreen()
    } else if (event.key === 'Enter' && !event.shiftKey && wujieeExitRichCodeBlock()) {
      event.preventDefault()
      wujieeSaveRichSelection()
      wujieeSyncRichValue()
    } else if (event.key === 'Tab') {
      event.preventDefault()
      document.execCommand('insertText', false, '  ')
      wujieeSyncRichValue()
    }
  }, [wujieeCloseLinkDialog, wujieeExitRichCodeBlock, wujieeIsFullscreen, wujieeLinkDialogOpen, wujieeSaveRichSelection, wujieeSyncRichValue, wujieeToggleFullscreen])

  const wujieeHandleImageFile = useCallback(async (event: FormEvent<HTMLInputElement>) => {
    if (!wujieeImageEnabled) return
    const file = event.currentTarget.files?.[0]
    if (!file) return
    try {
      if (!file.type.startsWith('image/')) throw new Error('Only image files are supported')
      if (file.size > maxImageSize) throw new Error(`Image must be smaller than ${Math.round(maxImageSize / 1024 / 1024)} MB`)
      setWujieeIsUploadingImage(true)
      const uploaded = imageUpload ? await imageUpload(file) : await wujieeFileAsDataUrl(file)
      const result: ImageUploadResult = typeof uploaded === 'string' ? { url: uploaded, alt: file.name } : uploaded
      if (!result.url) throw new Error('The image upload handler did not return a URL')
      if (editorType === 'wysiwyg') {
        wujieeRichEditorRef.current?.focus()
        wujieeRestoreRichSelection()
        document.execCommand('insertImage', false, result.url)
        const images = wujieeRichEditorRef.current?.querySelectorAll<HTMLImageElement>('img')
        const image = images?.[images.length - 1]
        if (image) image.alt = result.alt || file.name
        wujieeSaveRichSelection()
        wujieeSyncRichValue()
      } else {
        const insertion = wujieeWrapSelection(wujieeSelection(), '![', `](${result.url})`, result.alt || file.name)
        if (wujieeCharacterLimit !== undefined && countWujieeMarkdownCharacters(insertion.value) > wujieeCharacterLimit) {
          throw new Error('The uploaded image URL exceeds the editor maximum length')
        }
        wujieeApplyResult(insertion)
      }
      onImageUploaded?.(result, file)
    } catch (error) {
      onImageUploadError?.(error instanceof Error ? error : new Error(String(error)), file)
    } finally {
      setWujieeIsUploadingImage(false)
    }
  }, [wujieeApplyResult, wujieeCharacterLimit, editorType, imageUpload, maxImageSize, onImageUploadError, onImageUploaded, wujieeImageEnabled, wujieeRestoreRichSelection, wujieeSaveRichSelection, wujieeSelection, wujieeSyncRichValue])

  const wujieeShowTooltip = useCallback((event: SyntheticEvent<HTMLElement>, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setWujieeTooltip({
      text,
      left: Math.max(48, Math.min(window.innerWidth - 48, rect.left + rect.width / 2)),
      top: rect.bottom + 8
    })
  }, [])

  const wujieeRenderTool = useCallback((renderProps: ToolbarRenderProps, defaultNode: React.ReactNode) => {
    const renderer = toolbarSlots[renderProps.item] || renderToolbarItem
    return renderer ? renderer(renderProps) : defaultNode
  }, [renderToolbarItem, toolbarSlots])

  const wujieeRootClassName = [
    'wujiee-md',
    `wujiee-md--${editorType === 'wysiwyg' ? 'edit' : wujieeCurrentMode}`,
    `wujiee-md--${editorType}`,
    wujieeIsFullscreen && 'wujiee-md--fullscreen',
    disabled && 'wujiee-md--disabled',
    !bordered && 'wujiee-md--borderless',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={wujieeRootClassName} data-theme={theme === 'auto' ? undefined : theme} style={wujieeEditorStyle}>
      {wujieeImageEnabled && (
        <input
          ref={wujieeFileInputRef}
          className="wujiee-md-file-input"
          type="file"
          accept={imageAccept}
          tabIndex={-1}
          onChange={wujieeHandleImageFile}
        />
      )}

      {showToolbar && (
        <div className="wujiee-md-toolbar" role="toolbar" aria-label={ariaLabel}>
          <div
            className="wujiee-md-toolbar__formatting"
            onMouseDownCapture={() => editorType === 'wysiwyg' && wujieeSaveRichSelection()}
          >
            {toolbarBefore}
            {wujieeVisibleToolbar.map(item => {
              const label = item === 'image' && wujieeIsUploadingImage ? wujieeLabels.uploadingImage : wujieeLabels[wujieeToolbarLabelKeys[item]]
              const toolDisabled = disabled || readOnly || (item === 'image' && wujieeIsUploadingImage)
              const toolActive = editorType === 'wysiwyg' && Boolean(wujieeActiveToolbarItems[item])
              const renderProps: ToolbarRenderProps = {
                item,
                label,
                disabled: toolDisabled,
                active: toolActive,
                action: () => wujieeRunCommand(item)
              }
              return (
                <span className="wujiee-md-tool-slot" key={item}>
                  {wujieeRenderTool(renderProps, (
                    <button
                      className={`wujiee-md-tool${toolActive ? ' wujiee-md-is-active' : ''}`}
                      type="button"
                      aria-label={label}
                      aria-pressed={toolActive}
                      disabled={toolDisabled}
                      onMouseEnter={event => wujieeShowTooltip(event, label)}
                      onMouseLeave={() => setWujieeTooltip(undefined)}
                      onFocus={event => wujieeShowTooltip(event, label)}
                      onBlur={() => setWujieeTooltip(undefined)}
                      onClick={() => wujieeRunCommand(item)}
                    >
                      {item === 'image' && wujieeIsUploadingImage
                        ? <span className="wujiee-md-spinner" aria-hidden="true" />
                        : <WujieeIcon name={item} />}
                    </button>
                  ))}
                </span>
              )
            })}
            {toolbarAfter}
          </div>

          <div className="wujiee-md-toolbar__view">
            {showModeSwitch && editorType === 'markdown' && wujieeVisibleViewModes.map(view => {
              const renderProps: ToolbarRenderProps = {
                item: view,
                label: wujieeLabels[view],
                disabled: false,
                active: wujieeCurrentMode === view,
                action: () => wujieeSetMode(view)
              }
              return (
                <span className="wujiee-md-tool-slot" key={view}>
                  {wujieeRenderTool(renderProps, (
                    <button
                      className={`wujiee-md-tool wujiee-md-tool--view${wujieeCurrentMode === view ? ' wujiee-md-is-active' : ''}`}
                      type="button"
                      aria-label={wujieeLabels[view]}
                      aria-pressed={wujieeCurrentMode === view}
                      onMouseEnter={event => wujieeShowTooltip(event, wujieeLabels[view])}
                      onMouseLeave={() => setWujieeTooltip(undefined)}
                      onFocus={event => wujieeShowTooltip(event, wujieeLabels[view])}
                      onBlur={() => setWujieeTooltip(undefined)}
                      onClick={() => wujieeSetMode(view)}
                    >
                      <WujieeIcon name={view} />
                    </button>
                  ))}
                </span>
              )
            })}
            {allowFullscreen && toolbarConfig.fullscreen !== false && (() => {
              const label = wujieeIsFullscreen ? wujieeLabels.exitFullscreen : wujieeLabels.fullscreen
              const renderProps: ToolbarRenderProps = {
                item: 'fullscreen',
                label,
                disabled: false,
                active: wujieeIsFullscreen,
                action: wujieeToggleFullscreen
              }
              return (
                <span className="wujiee-md-tool-slot">
                  {wujieeRenderTool(renderProps, (
                    <button
                      className="wujiee-md-tool wujiee-md-tool--view"
                      type="button"
                      aria-label={label}
                      aria-pressed={wujieeIsFullscreen}
                      onMouseEnter={event => wujieeShowTooltip(event, label)}
                      onMouseLeave={() => setWujieeTooltip(undefined)}
                      onFocus={event => wujieeShowTooltip(event, label)}
                      onBlur={() => setWujieeTooltip(undefined)}
                      onClick={wujieeToggleFullscreen}
                    >
                      <WujieeIcon name={wujieeIsFullscreen ? 'exit-fullscreen' : 'fullscreen'} />
                    </button>
                  ))}
                </span>
              )
            })()}
          </div>
        </div>
      )}

      {editorType === 'wysiwyg' && wujieeActiveTableCell && (
        <div className="wujiee-md-table-tools" onMouseDown={event => event.preventDefault()}>
          <button type="button" onClick={wujieeAddTableRow}>＋ {wujieeLabels.addRow}</button>
          <button type="button" onClick={wujieeAddTableColumn}>＋ {wujieeLabels.addColumn}</button>
          <button
            type="button"
            disabled={wujieeActiveTableCell.parentElement?.parentElement?.tagName === 'THEAD'}
            onClick={wujieeDeleteTableRow}
          >− {wujieeLabels.deleteRow}</button>
          <button
            type="button"
            disabled={(wujieeTableFromCell()?.rows[0]?.cells.length || 0) <= 1}
            onClick={wujieeDeleteTableColumn}
          >− {wujieeLabels.deleteColumn}</button>
        </div>
      )}

      <div ref={wujieeWorkspaceRef} className="wujiee-md-workspace">
        {editorType === 'wysiwyg' ? (
          <>
            {(name || required) && (
              <textarea
                className="wujiee-md-rich-validation"
                name={name}
                value={wujieeModelValue}
                required={required}
                disabled={disabled}
                tabIndex={-1}
                aria-hidden="true"
                onChange={() => undefined}
                onInvalid={event => {
                  event.preventDefault()
                  wujieeFocusEditor()
                }}
              />
            )}
            <div
              ref={wujieeRichEditorRef}
              className="wujiee-md-rich-editor wujiee-md-preview"
              role="textbox"
              contentEditable={!disabled && !readOnly}
              data-placeholder={placeholder}
              aria-label={ariaLabel}
              aria-required={required}
              aria-disabled={disabled}
              aria-readonly={readOnly}
              aria-multiline="true"
              spellCheck
              suppressContentEditableWarning
              onInput={() => wujieeSyncRichValue()}
              onPaste={event => {
                event.preventDefault()
                document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
                wujieeSyncRichValue()
              }}
              onKeyDown={wujieeHandleRichKeydown}
              onClick={event => {
                const target = event.target as Element
                const checkbox = target.closest('.wujiee-md-task-list-checkbox') as HTMLInputElement | null
                if (checkbox && wujieeRichEditorRef.current?.contains(checkbox)) {
                  checkbox.toggleAttribute('checked', checkbox.checked)
                  wujieeSyncRichValue(true)
                  return
                }
                const cell = target.closest('th, td') as HTMLTableCellElement | null
                const nextCell = cell && wujieeRichEditorRef.current?.contains(cell) ? cell : undefined
                setWujieeActiveTableCell(nextCell)
                if (nextCell) wujieeEnsureTableColumns(nextCell.closest('table') as HTMLTableElement)
              }}
              onPointerMove={event => {
                if (wujieeColumnResizeStateRef.current || !wujieeRichEditorRef.current) return
                wujieeRichEditorRef.current.classList.toggle('wujiee-md-column-edge-hover', Boolean(wujieeCellAtResizableEdge(event)))
              }}
              onPointerLeave={() => wujieeRichEditorRef.current?.classList.remove('wujiee-md-column-edge-hover')}
              onPointerDown={wujieeHandleTablePointerDown}
              onMouseUp={wujieeSaveRichSelection}
              onKeyUp={wujieeSaveRichSelection}
              onFocus={event => {
                wujieeRichEditorRef.current?.querySelectorAll<HTMLInputElement>('.wujiee-md-task-list-checkbox').forEach(checkbox => {
                  checkbox.disabled = false
                  checkbox.removeAttribute('disabled')
                })
                onFocus?.(event)
              }}
              onBlur={event => {
                onBlur?.(event)
                wujieeSyncRichValue()
              }}
            />
          </>
        ) : (
          <>
            <div className="wujiee-md-editor-pane" hidden={wujieeCurrentMode === 'preview'}>
              <textarea
                ref={wujieeTextareaRef}
                className="wujiee-md-textarea"
                value={wujieeMarkdownValue}
                name={name}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                readOnly={readOnly}
                aria-label={ariaLabel}
                spellCheck
                onChange={event => {
                  const textarea = event.currentTarget
                  if (!wujieeEmitValue(textarea.value)) {
                    textarea.value = wujieeMarkdownValue
                    queueMicrotask(() => {
                      if (textarea.isConnected) textarea.setSelectionRange(wujieeMarkdownValue.length, wujieeMarkdownValue.length)
                    })
                  }
                }}
                onKeyDown={wujieeHandleKeydown}
                onFocus={event => onFocus?.(event)}
                onBlur={event => onBlur?.(event)}
              />
            </div>
            <div className="wujiee-md-preview-pane" hidden={wujieeCurrentMode === 'edit'}>
              {wujieeRenderedHtml
                ? <div className="wujiee-md-preview" dangerouslySetInnerHTML={{ __html: wujieeRenderedHtml }} />
                : <div className="wujiee-md-preview-empty">{wujieeLabels.emptyPreview}</div>}
            </div>
          </>
        )}
      </div>

      {resizable && (
        <div
          className="wujiee-md-resize-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-label="调整编辑器高度"
          tabIndex={0}
          onPointerDown={event => {
            event.preventDefault()
            wujieeStartResize(event)
          }}
          onKeyDown={wujieeHandleResizeKeydown}
        ><span /></div>
      )}

      <div className={`wujiee-md-statusbar${showStatusbar ? '' : ' wujiee-md-statusbar--brand-only'}`}>
        {showStatusbar && (
          <span>
            {wujieeCharacterCount}{wujieeCharacterLimit ? ` / ${wujieeCharacterLimit}` : ''}
          </span>
        )}
        <a className="wujiee-md-statusbar__brand" href="https://wujiee.com" target="_blank" rel="noopener noreferrer">WUJIEE</a>
      </div>

      {wujieeLinkDialogOpen && (
        <div
          className="wujiee-md-dialog-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) wujieeCloseLinkDialog()
          }}
        >
          <form
            className="wujiee-md-link-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={wujieeLabels.link}
            onSubmit={event => {
              event.preventDefault()
              wujieeConfirmLink()
            }}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault()
                wujieeCloseLinkDialog()
              }
            }}
          >
            <div className="wujiee-md-link-dialog__header">
              <strong>{wujieeLabels.link}</strong>
              <button type="button" className="wujiee-md-link-dialog__close" aria-label={wujieeLabels.cancel} onClick={wujieeCloseLinkDialog}>×</button>
            </div>
            <label className="wujiee-md-link-field">
              <span>{wujieeLabels.linkTextLabel}</span>
              <input value={wujieeLinkText} type="text" autoComplete="off" onChange={event => setWujieeLinkText(event.currentTarget.value)} />
            </label>
            <label className="wujiee-md-link-field">
              <span>{wujieeLabels.linkAddress}</span>
              <input
                ref={wujieeLinkUrlInputRef}
                value={wujieeLinkUrl}
                type="text"
                inputMode="url"
                autoComplete="off"
                onChange={event => {
                  setWujieeLinkUrl(event.currentTarget.value)
                  setWujieeLinkError('')
                }}
              />
            </label>
            {wujieeLinkError && <p className="wujiee-md-link-error" role="alert">{wujieeLinkError}</p>}
            <div className="wujiee-md-link-dialog__actions">
              <button type="button" className="wujiee-md-link-button wujiee-md-link-button--secondary" onClick={wujieeCloseLinkDialog}>{wujieeLabels.cancel}</button>
              <button type="submit" className="wujiee-md-link-button wujiee-md-link-button--primary">{wujieeLabels.confirm}</button>
            </div>
          </form>
        </div>
      )}

      {wujieeTooltip && typeof document !== 'undefined' && createPortal(
        <div className="wujiee-md-tooltip" role="tooltip" style={{ left: wujieeTooltip.left, top: wujieeTooltip.top }}>
          {wujieeTooltip.text}
        </div>,
        document.body
      )}
    </div>
  )
})

export const MarkdownEditor = WujieeMarkdownEditor
