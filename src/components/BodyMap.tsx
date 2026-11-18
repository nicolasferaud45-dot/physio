// Silhouette à toucher (de face / de dos). Le côté touché donne Droite ou Gauche.
import type { RegionId } from '../data/catalog'
import front from '../assets/body-front.png'
import back from '../assets/body-back.png'

export type BodyView = 'f' | 'b'
interface Spot { region: RegionId; x: number; y: number }
// x, y : fractions de l'image, pour le côté DROIT du patient
const FRONT: Spot[] = [
  { region: 'cervical', x: 0.5, y: 0.135 }, { region: 'epaule', x: 0.25, y: 0.19 }, { region: 'coude', x: 0.146, y: 0.36 },
  { region: 'poignet', x: 0.083, y: 0.52 }, { region: 'hanche', x: 0.35, y: 0.485 }, { region: 'genou', x: 0.35, y: 0.735 }, { region: 'cheville', x: 0.375, y: 0.95 },
]
const BACK: Spot[] = [
  { region: 'cervical', x: 0.5, y: 0.13 }, { region: 'epaule', x: 0.25, y: 0.19 }, { region: 'lombaire', x: 0.5, y: 0.42 },
  { region: 'hanche', x: 0.33, y: 0.47 }, { region: 'genou', x: 0.35, y: 0.735 }, { region: 'cheville', x: 0.37, y: 0.95 },
]
export const ASPECT: Record<BodyView, number> = { f: 480 / 1115, b: 450 / 1115 }

/** position d'un repère à l'écran (fraction) selon la vue et le côté */
export function spotPos(view: BodyView, s: Spot, side: 'D' | 'G' | null) {
  const centered = Math.abs(s.x - 0.5) < 0.01
  if (centered || !side) return { x: s.x, y: s.y }
  // de face, la droite du patient est à gauche de l'écran ; de dos, à droite
  const right = view === 'f' ? s.x : 1 - s.x
  return { x: side === 'D' ? right : 1 - right, y: s.y }
}

export function BodyMap({ view, height, selected, onPick, labels, only }: {
  view: BodyView; height: number
  selected?: { region: RegionId | null; side: 'D' | 'G' | null }
  onPick?: (region: RegionId, side: 'D' | 'G' | null) => void
  labels?: Partial<Record<RegionId, string>>
  /** n'afficher que la zone choisie (aperçu) */
  only?: boolean
}) {
  const spots = view === 'f' ? FRONT : BACK
  const w = height * ASPECT[view]
  const r = Math.max(11, height * 0.034)
  return (
    <div className="bodymap2" style={{ width: w, height }}>
      <img src={view === 'f' ? front : back} alt={view === 'f' ? 'Corps humain vu de face' : 'Corps humain vu de dos'} draggable={false} />
      {spots.flatMap((s) => {
        const centered = Math.abs(s.x - 0.5) < 0.01
        return (centered ? [null] : (['D', 'G'] as const)).map((side) => {
          const p = spotPos(view, s, side)
          const on = selected?.region === s.region && (centered || selected?.side === side || !selected?.side)
          if (only && !on) return null
          const name = `${labels?.[s.region] ?? s.region}${side ? (side === 'D' ? ' droit' : ' gauche') : ''}`
          return (
            <button key={s.region + (side ?? '')} className={'spot' + (on ? ' on' : '')} aria-label={name} aria-pressed={on}
              style={{ left: p.x * w - (on ? r * 1.3 : r), top: p.y * height - (on ? r * 1.3 : r), width: (on ? r * 1.3 : r) * 2, height: (on ? r * 1.3 : r) * 2 }}
              onClick={() => onPick?.(s.region, side)} />
          )
        })
      })}
    </div>
  )
}
