import type { ToolbarItemName } from './types'

export const wujieeIconPaths: Record<ToolbarItemName | 'edit' | 'split' | 'preview' | 'fullscreen' | 'exit-fullscreen', string[]> = {
  heading: ['M6 5v14M18 5v14M6 12h12'],
  bold: ['M8 5h5a4 4 0 0 1 0 8H8z', 'M8 13h6a3.5 3.5 0 0 1 0 7H8z'],
  italic: ['M10 5h6M8 19h6M14 5l-4 14'],
  strike: ['M5 12h14', 'M8 7.5A4 4 0 0 1 12 5c2.2 0 4 1 4 3', 'M16 16c0 1.7-1.8 3-4 3a5.2 5.2 0 0 1-4.5-2.2'],
  quote: ['M7 9h4v4H7v-1a5 5 0 0 1 4-5', 'M14 9h4v4h-4v-1a5 5 0 0 1 4-5'],
  'unordered-list': ['M9 6h10M9 12h10M9 18h10', 'M5 6h.01M5 12h.01M5 18h.01'],
  'ordered-list': ['M10 6h9M10 12h9M10 18h9', 'M4 5h2v3M4 11h2l-2 3h2M4 17h2v3H4'],
  'task-list': ['M4 6l1.5 1.5L8 5M11 6h9M4 12l1.5 1.5L8 11M11 12h9M4 18l1.5 1.5L8 17M11 18h9'],
  'inline-code': ['M9 8l-4 4 4 4M15 8l4 4-4 4', 'M14 5l-4 14'],
  'code-block': ['M4 5h16v14H4z', 'M4 9h16', 'M8 13l-2 2 2 2', 'M12 17h4', 'M7 7h.01M10 7h.01'],
  link: ['M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1', 'M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1'],
  image: ['M4 5h16v14H4z', 'M4 16l4-4 3 3 3-4 6 6', 'M9 9h.01'],
  table: ['M4 5h16v14H4z', 'M4 10h16M4 15h16M10 5v14M15 5v14'],
  'horizontal-rule': ['M5 12h14'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13.5 6.5l4 4'],
  split: ['M4 5h16v14H4z', 'M12 5v14'],
  preview: ['M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  fullscreen: ['M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5'],
  'exit-fullscreen': ['M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6']
}

export const iconPaths = wujieeIconPaths
