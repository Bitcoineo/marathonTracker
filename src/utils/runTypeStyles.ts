interface RunTypeStyle {
  label: string
  background: string
  color: string
  border: string
}

const STYLES: Record<string, RunTypeStyle> = {
  easy:     { label: 'EF',    background: 'rgba(34, 197, 94, 0.1)',  color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' },
  interval: { label: 'INT',   background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.3)' },
  long:     { label: 'LONG',  background: 'rgba(249, 115, 22, 0.1)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.3)' },
  tempo:    { label: 'TEMPO', background: 'rgba(236, 72, 153, 0.1)', color: '#db2777', border: '1px solid rgba(236, 72, 153, 0.3)' },
}

export function getRunTypeStyle(type: string): RunTypeStyle {
  return STYLES[type] ?? STYLES.easy
}
