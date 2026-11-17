import { sourceById } from '../data/sources'

/** Références (vue praticien uniquement). Liens ouverts dans un nouvel onglet quand le navigateur l'autorise. */
export function Sources({ ids, title = 'Sources' }: { ids: string[]; title?: string }) {
  const list = Array.from(new Set(ids)).map(sourceById).filter(Boolean)
  if (!list.length) return null
  return (
    <details className="sources">
      <summary><span className="eyebrow">{title} · {list.length}</span></summary>
      <ol>
        {list.map((s) => (
          <li key={s!.id}>
            <a href={s!.url} target="_blank" rel="noreferrer">{s!.short}</a>
            <span className="small muted"> — {s!.title}. <em>{s!.publisher}</em>. <span className="src-kind">{s!.kind}</span></span>
          </li>
        ))}
      </ol>
    </details>
  )
}
