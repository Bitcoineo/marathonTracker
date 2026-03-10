import { WebHaptics } from 'web-haptics'

const engine = new WebHaptics()

const presetMap = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
  tick: 'rigid',
  selection: 'selection',
  success: 'success',
  error: 'error',
} as const

export type HapticType = keyof typeof presetMap

export function haptic(type: HapticType = 'light'): void {
  engine.trigger(presetMap[type])
}
