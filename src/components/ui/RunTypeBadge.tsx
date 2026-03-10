import { getRunTypeStyle } from '../../utils/runTypeStyles'

interface RunTypeBadgeProps {
  type: string
  fontSize?: number
  label?: string
  italic?: boolean
}

export default function RunTypeBadge({ type, fontSize = 10, label, italic }: RunTypeBadgeProps) {
  const style = getRunTypeStyle(type)
  return (
    <span
      className="font-mono"
      style={{
        fontSize,
        fontWeight: 600,
        fontStyle: italic ? 'italic' : undefined,
        color: style.color,
        backgroundColor: style.background,
        border: style.border,
        padding: '2px 6px',
        borderRadius: 4,
      }}
    >
      {label ?? style.label}
    </span>
  )
}
