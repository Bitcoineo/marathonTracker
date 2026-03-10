export default function Footer() {
  return (
    <div
      className="font-inter text-center"
      style={{ paddingTop: 16, paddingBottom: 24, fontSize: 11, color: 'var(--color-muted)' }}
    >
      Made by{' '}
      <a
        href="https://x.com/Bitcoineo"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--color-muted)', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)' }}
      >
        Bitcoineo
      </a>
    </div>
  )
}
