import type { JointDef } from './types'
import { KNEE } from './joints/knee'
import { SHOULDER } from './joints/shoulder'
import { HIP, ANKLE } from './joints/lower'
import { ELBOW, WRIST } from './joints/upper'
import { LUMBAR, CERVICAL } from './joints/spine'
import './joints/nerves'

/** Articulations disponibles, par région du catalogue. */
export const JOINTS: Record<string, JointDef> = { genou: KNEE, epaule: SHOULDER, hanche: HIP, cheville: ANKLE, coude: ELBOW, poignet: WRIST, lombaire: LUMBAR, cervical: CERVICAL }
export const jointForRegion = (region: string | null | undefined) => (region ? JOINTS[region] ?? null : null)
export const hasAnatomy3D = (region: string | null | undefined, pathologyId?: string | null) => {
  const j = jointForRegion(region)
  return !!j && (!pathologyId || !!j.pathologies[pathologyId])
}
