// Noms en mots simples (vus par le patient), le nom médical reste affiché en dessous.
export const LAY: Record<string, string> = {
  conflit: 'Ça pince en levant le bras', 'tendinopathie-coiffe': 'Tendon de l\'épaule fatigué', 'tendinopathie-calcifiante': 'Dépôt de calcium dans le tendon',
  'rupture-coiffe': 'Tendon de l\'épaule déchiré', capsulite: 'Épaule bloquée', bursite: 'Coussin de l\'épaule enflammé', 'instabilite-epaule': 'Épaule qui se déboîte',
  epicondylalgie: 'Douleur à l\'extérieur du coude',
  'canal-carpien': 'Fourmillements dans la main', 'fracture-radius': 'Après une fracture du poignet',
  cervicalgie: 'Cou raide et douloureux', 'nevralgie-cervicobrachiale': 'Douleur qui descend dans le bras', 'entorse-cervicale': 'Coup du lapin',
  lombalgie: 'Mal au bas du dos', lombosciatique: 'Douleur qui descend dans la jambe', 'stenose-lombaire': 'Jambes lourdes en marchant',
  coxarthrose: 'Arthrose de la hanche', 'tendinopathie-fessiers': 'Douleur sur le côté de la hanche', 'conflit-femoro-acetabulaire': 'Ça pince dans l\'aine', pth: 'Prothèse de hanche', 'lesion-ischios': 'Déchirure derrière la cuisse',
  gonarthrose: 'Arthrose du genou', sfp: 'Douleur autour de la rotule', 'tendinopathie-rotulienne': 'Tendon sous la rotule', lca: 'Ligament croisé rompu', menisque: 'Ménisque abîmé', 'entorse-lli': 'Entorse à l\'intérieur du genou', ptg: 'Prothèse de genou',
  'entorse-lle': 'Entorse de la cheville', 'tendinopathie-achilleenne': 'Tendon d\'Achille douloureux', 'fasciopathie-plantaire': 'Douleur sous le talon',
}
export const lay = (id: string | null | undefined, fallback = '') => (id && LAY[id]) || fallback
