import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

/** Bouton à maintenir 2 s : évite qu'un patient revienne par erreur sur la vue praticien. */
export function HoldButton({ onDone, label = 'Maintenir pour revenir', ms = 2000, className = 'btn round' }: { onDone: () => void; label?: string; ms?: number; className?: string }) {
  const [p, setP] = useState(0)
  const start = useRef<number | null>(null)
  const raf = useRef(0)
  const tick = () => {
    if (start.current === null) return
    const k = Math.min(1, (performance.now() - start.current) / ms)
    setP(k)
    if (k >= 1) { start.current = null; setP(0); onDone(); return }
    raf.current = requestAnimationFrame(tick)
  }
  const down = (e: React.PointerEvent) => { e.preventDefault(); start.current = performance.now(); raf.current = requestAnimationFrame(tick) }
  const up = () => { start.current = null; cancelAnimationFrame(raf.current); setP(0) }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const C = 2 * Math.PI * 9
  return (
    <button className={className + ' hold-btn'} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDone() }} aria-label={`${label} (maintenir 2 secondes)`}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2.5" />
        <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 11 11)" strokeLinecap="round" />
      </svg>
      <Icon name="lock" size={16} />{p > 0 ? 'Continuez…' : label}
    </button>
  )
}
