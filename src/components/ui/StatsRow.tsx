interface StatItem {
  value: number | string
  label: string
}

interface StatsRowProps {
  stats: StatItem[]
  valueFontSize?: number
}

export default function StatsRow({ stats, valueFontSize = 28 }: StatsRowProps) {
  return (
    <div className="flex max-w-[420px] w-full mx-auto">
      {stats.map(({ value, label }, i) => (
        <div
          key={label}
          className="flex-1 flex flex-col items-center"
          style={{
            minWidth: 0,
            overflow: 'hidden',
            ...(i < stats.length - 1 ? { borderRight: '1px solid var(--color-divider-light)' } : {}),
          }}
        >
          <span
            className="font-inter font-bold text-text leading-none"
            style={{ fontSize: valueFontSize, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {value}
          </span>
          <span
            className="font-mono text-muted uppercase tracking-[0.1em] mt-1"
            style={{ fontSize: 10 }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
