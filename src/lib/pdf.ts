import type { jsPDF } from 'jspdf'

/** Caractères non couverts par la police PDF standard. */
export const clean = (t: string) => t.replace(/[’‘]/g, "'").replace(/[«»“”]/g, '"').replace(/[≈→↑↓•·–—]/g, (m) => ({ '≈': '~', '→': '->', '↑': '^', '↓': 'v', '•': '-', '·': '-', '–': '-', '—': '-' } as Record<string, string>)[m])

/** Dans l'artifact Claude, le téléchargement passe par la capacité « downloads » ; ailleurs, enregistrement direct. */
export async function savePdf(doc: jsPDF, name: string): Promise<string> {
  const c = (window as unknown as { claude?: { use: (n: string) => Promise<unknown> } }).claude
  const dl = c?.use ? (await Promise.race([c.use('downloads'), new Promise((r) => setTimeout(() => r(null), 1500))])) as { save: (o: { filename: string; data: Blob }) => Promise<unknown> } | null : null
  if (dl) { await dl.save({ filename: name, data: doc.output('blob') }); return 'PDF enregistré.' }
  doc.save(name); return 'PDF téléchargé.'
}
