import { wujieeIconPaths } from './icons'
import type { ToolbarControlName } from './types'

export interface IconProps {
  name: ToolbarControlName | 'exit-fullscreen'
}

export function WujieeIcon({ name }: IconProps) {
  return (
    <svg className="wujiee-md-icon" viewBox="0 0 24 24" aria-hidden="true">
      {wujieeIconPaths[name].map(path => <path key={path} d={path} />)}
    </svg>
  )
}

export const Icon = WujieeIcon
