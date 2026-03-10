type Pattern = number | number[]

const patterns = {
  light: 8,
  medium: 15,
  heavy: 25,
  tick: 4,
  selection: 6,
  success: [10, 50, 20, 50, 10],
  error: [20, 40, 20],
} as const satisfies Record<string, Pattern>

export type HapticType = keyof typeof patterns

const supported =
  typeof navigator !== 'undefined' &&
  'vibrate' in navigator &&
  // iOS Safari exposes vibrate but it's a no-op — skip it
  !/iPhone|iPad/.test(navigator.userAgent)

export function haptic(type: HapticType = 'light'): void {
  if (!supported) return
  try {
    navigator.vibrate(patterns[type])
  } catch {
    // silently fail on unsupported browsers
  }
}
