import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Bouton qui ouvre un petit panneau au-dessus de lui (ou en feuille basse sur téléphone). */
export function Popover({ label, icon, children, active, width = 280 }: {
  label: string; icon?: ReactNode; children: ReactNode; active?: boolean; width?: number
}) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    const left = Math.min(Math.max(8, r.left + r.width / 2 - width / 2), window.innerWidth - width - 8)
    setPos({ left, bottom: window.innerHeight - r.top + 8 })
  }, [open, width])

  return (
    <>
      <button ref={btn} className="toggle" aria-label={label} aria-expanded={open} aria-pressed={!!active || open} onClick={() => setOpen((v) => !v)}>
        {icon}<span className="lbl">{label}</span><span aria-hidden="true" className="caret" style={{ marginLeft: 4, fontSize: 11 }}>{open ? '▾' : '▴'}</span>
      </button>
      {open && pos && (
        <>
          <div className="popover-backdrop" onClick={() => setOpen(false)} />
          <div className="popover" role="dialog" aria-label={label} style={{ left: pos.left, bottom: pos.bottom, width }}>
            {children}
          </div>
        </>
      )}
    </>
  )
}

export function CheckRow({ checked, onChange, label, hint, swatch }: { checked: boolean; onChange: () => void; label: string; hint?: string; swatch?: string }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={onChange} />
      {swatch && <i style={{ background: swatch }} aria-hidden="true" />}
      <span className="stack" style={{ gap: 0 }}><span style={{ fontWeight: 600 }}>{label}</span>{hint && <span className="small muted">{hint}</span>}</span>
    </label>
  )
}
