export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatShortDate(date: Date): string {
  return `${date.toLocaleString('en', { month: 'short' }).toLowerCase()} ${date.getDate()}`
}

export function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  )
}
