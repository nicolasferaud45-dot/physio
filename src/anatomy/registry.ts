import type { JointDef } from './types'
import { KNEE } from './joints/knee'

/** Articulations disponibles, par région du catalogue. */
export const JOINTS: Record<string, JointDef> = { genou: KNEE }
export const jointForRegion = (region: string | null | undefined) => (region ? JOINTS[region] ?? null : null)
export const hasAnatomy3D = (region: string | null | undefined, pathologyId?: string | null) => {
  const j = jointForRegion(region)
  return !!j && (!pathologyId || !!j.pathologies[pathologyId])
}
