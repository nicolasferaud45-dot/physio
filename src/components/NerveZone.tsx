// « Où vous le sentez » : zone ressentie d'un nerf, sur une silhouette de face et de dos.
import type { NerveArea } from '../anatomy/types'

type Shape = { view: 'f' | 'b'; d: string }
// Coordonnées pour le côté droit du patient ; la vue de face montre sa droite à gauche de l'écran.
const AREAS: Record<NerveArea, Shape[]> = {
  L4: [{ view: 'f', d: 'M-14 150 L-4 150 L-5 188 L-10 196 L-12 188 Z' }],
  L5: [{ view: 'f', d: 'M-15 160 L-11 160 L-11 196 L-6 202 L-2 208 L-12 210 L-15 200 Z' }],
  S1: [{ view: 'b', d: 'M2 150 L12 150 L12 192 L15 206 L6 210 L4 196 Z' }],
  sciatique: [{ view: 'b', d: 'M2 98 L14 98 L13 150 L12 192 L4 192 L3 150 Z' }],
  fibulaire: [{ view: 'f', d: 'M-15 156 L-10 156 L-10 196 L-3 204 L-2 210 L-13 210 L-15 196 Z' }],
  tibial: [{ view: 'b', d: 'M3 160 L13 160 L12 196 L4 196 Z' }, { view: 'b', d: 'M3 202 L14 202 L14 212 L3 212 Z' }],
  plantaire: [{ view: 'b', d: 'M3 201 L14 201 L14 213 L3 213 Z' }],
  C5: [{ view: 'f', d: 'M-26 34 L-20 34 L-22 66 L-28 66 Z' }],
  C6: [{ view: 'f', d: 'M-29 68 L-24 68 L-27 104 L-33 116 L-36 112 L-32 102 Z' }],
  C7: [{ view: 'b', d: 'M24 70 L29 70 L31 104 L29 120 L26 120 L27 104 Z' }],
  median: [{ view: 'f', d: 'M-34 104 L-26 104 L-25 116 L-29 124 L-35 118 Z' }],
  ulnaire: [{ view: 'f', d: 'M-26 102 L-22 104 L-22 120 L-25 122 Z' }],
  radial: [{ view: 'b', d: 'M25 74 L30 74 L32 104 L30 112 L26 112 L26 100 Z' }],
  axillaire: [{ view: 'f', d: 'M-27 30 L-20 30 L-20 44 L-27 44 Z' }],
  suprascapulaire: [{ view: 'b', d: 'M8 30 L24 30 L24 46 L8 46 Z' }],
  cauda: [{ view: 'b', d: 'M-14 96 L14 96 L12 110 L-12 110 Z' }, { view: 'b', d: 'M2 110 L14 110 L12 192 L4 192 Z' }, { view: 'b', d: 'M-2 110 L-14 110 L-12 192 L-4 192 Z' }],
}

const TEXT: Record<NerveArea, string> = {
  L4: 'Devant de la cuisse et intérieur de la jambe.',
  L5: 'Extérieur de la jambe jusqu\'au dessus du pied et au gros orteil.',
  S1: 'Arrière du mollet, talon et bord extérieur du pied.',
  sciatique: 'Arrière de la cuisse et de la jambe.',
  fibulaire: 'Extérieur de la jambe et dessus du pied.',
  tibial: 'Mollet et plante du pied.',
  plantaire: 'Plante du pied et talon.',
  C5: 'Extérieur de l\'épaule et du bras.',
  C6: 'Extérieur de l\'avant-bras jusqu\'au pouce.',
  C7: 'Arrière de l\'avant-bras et majeur.',
  median: 'Pouce, index, majeur (côté paume), souvent la nuit.',
  ulnaire: 'Petit doigt et annulaire.',
  radial: 'Dos de l\'avant-bras et de la main.',
  axillaire: 'Petite zone sur le côté de l\'épaule.',
  suprascapulaire: 'Arrière de l\'épaule, douleur profonde.',
  cauda: 'Les deux jambes, lourdes en marchant ; se pencher soulage.',
}

function Body({ ox, label }: { ox: number; label: string }) {
  return (
    <g transform={`translate(${ox} 0)`}>
      <g fill="#E3EBF1" stroke="#C5D3DD" strokeWidth="1.2">
        <circle cx="0" cy="14" r="10" />
        <path d="M-18 28 Q0 22 18 28 L16 92 Q0 98 -16 92 Z" />
        <path d="M-18 30 L-24 30 L-34 112 L-34 122 L-26 124 L-22 106 L-18 60 Z" />
        <path d="M18 30 L24 30 L34 112 L34 122 L26 124 L22 106 L18 60 Z" />
        <path d="M-16 92 L-1 96 L-3 200 L-1 212 L-15 212 L-14 200 Z" />
        <path d="M16 92 L1 96 L3 200 L1 212 L15 212 L14 200 Z" />
      </g>
      <text x="0" y="232" textAnchor="middle" fontSize="11" fill="#4F6272" fontFamily="Inter, sans-serif">{label}</text>
    </g>
  )
}

export function NerveZone({ areas, side }: { areas: NerveArea[]; side: 'D' | 'G' }) {
  if (!areas.length) return null
  // côté gauche : miroir horizontal de chaque zone autour de l'axe de la silhouette
  const flip = side === 'G' ? -1 : 1
  return (
    <div className="nerve-zone">
      <span className="eyebrow">Où vous le sentez</span>
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <svg viewBox="-45 0 170 240" width="150" height="212" role="img" aria-label="Zone ressentie sur le corps">
          <defs>
            <pattern id="nz-h" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.6" height="5" fill="#E2B10E" /></pattern>
          </defs>
          <Body ox={0} label="De face" />
          <Body ox={80} label="De dos" />
          {areas.flatMap((a) => AREAS[a]).map((s, i) => (
            <path key={i} d={s.d} transform={`translate(${s.view === 'f' ? 0 : 80} 0) scale(${flip} 1)`} fill="url(#nz-h)" stroke="#C99A06" strokeWidth="1" />
          ))}
        </svg>
        <div className="stack" style={{ gap: 6 }}>
          {areas.map((a) => <span key={a} className="small">{TEXT[a]}</span>)}
          <span className="small muted">Ce n'est pas cette zone qui est abîmée : c'est le nerf, irrité plus haut, qui y « envoie » la douleur.</span>
        </div>
      </div>
    </div>
  )
}
