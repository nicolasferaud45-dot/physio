import { validate, buildPrompt } from '../src/engine/claude'
import { interpretLocal } from '../src/engine/interpret'
const t = 'femme 52 ans, épaule droite raide depuis 3 mois, nuit difficile, élastique'
const local = interpretLocal(t)
console.log('prompt chars', buildPrompt(t, local).length)
const r = validate({ pathologyId: 'capsulite', region: 'epaule', side: 'D', phase: 'subaigue', eva: 6, equipment: ['elastique', 'laser'], goals: ['Dormir sans douleur', 'Golf inventé'],
  synthesis: 'Tableau compatible…', patientMessage: 'Votre épaule…', exercises: [{ id: 're-baton', why: 'gagner la RE' }, { id: 'inexistant', why: 'x' }, { id: 'nordic', why: 'autre région' }],
  vigilance: ['Diabète'], questions: ['Antécédent ?'], sources: ['kelley2013', 'fausse2020'] }, local)
console.log(JSON.stringify(r, null, 1).slice(0, 900))
