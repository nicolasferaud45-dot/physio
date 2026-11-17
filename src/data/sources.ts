/**
 * Sources de référence (recommandations de pratique clinique, consensus, essais clés).
 * Chaque fiche pathologie y renvoie par identifiant. L'IA ne peut citer QUE ces identifiants :
 * toute autre référence est rejetée par l'application.
 * Vérifiées en novembre 2026 (titre, revue, année, DOI).
 */
export interface Source {
  id: string
  short: string
  title: string
  publisher: string
  year: number
  url: string
  kind: 'Recommandation' | 'Consensus' | 'Essai clinique' | 'Étude'
}

export const SOURCES: Source[] = [
  { id: 'kelley2013', short: 'Kelley et al., JOSPT 2013', title: 'Shoulder Pain and Mobility Deficits: Adhesive Capsulitis — Clinical Practice Guidelines', publisher: 'J Orthop Sports Phys Ther 43(5):A1–A31', year: 2013, url: 'https://doi.org/10.2519/jospt.2013.0302', kind: 'Recommandation' },
  { id: 'diercks2014', short: 'Diercks et al., Acta Orthop 2014', title: 'Guideline for diagnosis and treatment of subacromial pain syndrome (Dutch Orthopaedic Association)', publisher: 'Acta Orthopaedica 85(3):314–322', year: 2014, url: 'https://doi.org/10.3109/17453674.2014.920991', kind: 'Recommandation' },
  { id: 'saps2026', short: 'Dutch Orthopedic Association, Acta Orthop 2026', title: 'Update of guideline for diagnosis and treatment of subacromial pain syndrome — Part 1: prevention, diagnostics and non-surgical treatment', publisher: 'Acta Orthopaedica', year: 2026, url: 'https://doi.org/10.2340/17453674.2026.45365', kind: 'Recommandation' },
  { id: 'desmeules2025', short: 'Desmeules et al., JOSPT 2025', title: 'Rotator Cuff Tendinopathy Diagnosis, Nonsurgical Medical Care, and Rehabilitation: A Clinical Practice Guideline', publisher: 'J Orthop Sports Phys Ther 55(4):235–274', year: 2025, url: 'https://doi.org/10.2519/jospt.2025.13182', kind: 'Recommandation' },
  { id: 'aaosRC2025', short: 'AAOS 2025', title: 'Management of Rotator Cuff Injuries — Evidence-Based Clinical Practice Guideline', publisher: 'American Academy of Orthopaedic Surgeons', year: 2025, url: 'https://www.aaos.org/quality/quality-programs/rotator-cuff/', kind: 'Recommandation' },
  { id: 'bess2026', short: 'Wong et al. (BESS), Shoulder Elbow 2026', title: 'BESS practice guidelines: Rehabilitation following traumatic anterior shoulder dislocation (post-operative and non-operative care)', publisher: 'Shoulder & Elbow', year: 2026, url: 'https://doi.org/10.1177/17585732261439731', kind: 'Recommandation' },
  { id: 'lucado2022', short: 'Lucado et al., JOSPT 2022', title: 'Lateral Elbow Pain and Muscle Function Impairments — Clinical Practice Guidelines', publisher: 'J Orthop Sports Phys Ther 52(12):CPG1–CPG111', year: 2022, url: 'https://doi.org/10.2519/jospt.2022.0302', kind: 'Recommandation' },
  { id: 'erickson2026', short: 'Erickson et al., JOSPT 2026', title: 'Hand Pain and Sensory Deficits: Carpal Tunnel Syndrome — Revision 2026', publisher: 'J Orthop Sports Phys Ther 56(4)', year: 2026, url: 'https://doi.org/10.2519/jospt.2026.0301', kind: 'Recommandation' },
  { id: 'mehta2024', short: 'Mehta et al., JOSPT 2024', title: 'Distal Radius Fracture Rehabilitation — Clinical Practice Guidelines', publisher: 'J Orthop Sports Phys Ther 54(9):CPG1–CPG78', year: 2024, url: 'https://doi.org/10.2519/jospt.2024.0301', kind: 'Recommandation' },
  { id: 'blanpied2017', short: 'Blanpied et al., JOSPT 2017', title: 'Neck Pain: Revision 2017 — Clinical Practice Guidelines', publisher: 'J Orthop Sports Phys Ther 47(7):A1–A83', year: 2017, url: 'https://doi.org/10.2519/jospt.2017.0302', kind: 'Recommandation' },
  { id: 'has2019', short: 'HAS 2019', title: 'Prise en charge du patient présentant une lombalgie commune', publisher: 'Haute Autorité de Santé', year: 2019, url: 'https://www.has-sante.fr/jcms/c_2962377/fr/prevenir-le-passage-a-la-chronicite-de-la-lombalgie', kind: 'Recommandation' },
  { id: 'niceNG59', short: 'NICE NG59 (2016, maj. 2020)', title: 'Low back pain and sciatica in over 16s: assessment and management', publisher: 'National Institute for Health and Care Excellence', year: 2020, url: 'https://www.nice.org.uk/guidance/ng59', kind: 'Recommandation' },
  { id: 'nass2013', short: 'NASS, Spine J 2013', title: 'An evidence-based clinical guideline for the diagnosis and treatment of degenerative lumbar spinal stenosis (update)', publisher: 'North American Spine Society — The Spine Journal', year: 2013, url: 'https://pubmed.ncbi.nlm.nih.gov/23830297/', kind: 'Recommandation' },
  { id: 'oarsi2019', short: 'Bannuru et al. (OARSI), 2019', title: 'OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis', publisher: 'Osteoarthritis and Cartilage 27(11):1578–1589', year: 2019, url: 'https://doi.org/10.1016/j.joca.2019.06.011', kind: 'Recommandation' },
  { id: 'cibulka2017', short: 'Cibulka et al., JOSPT 2017', title: 'Hip Pain and Mobility Deficits — Hip Osteoarthritis: Revision 2017', publisher: 'J Orthop Sports Phys Ther 47(6):A1–A37', year: 2017, url: 'https://doi.org/10.2519/jospt.2017.0301', kind: 'Recommandation' },
  { id: 'mellor2018', short: 'Mellor et al., BMJ 2018 (LEAP)', title: 'Education plus exercise versus corticosteroid injection versus wait and see for gluteal tendinopathy: randomised clinical trial', publisher: 'BMJ 361:k1662', year: 2018, url: 'https://doi.org/10.1136/bmj.k1662', kind: 'Essai clinique' },
  { id: 'griffin2016', short: 'Griffin et al., BJSM 2016', title: 'The Warwick Agreement on femoroacetabular impingement syndrome: an international consensus statement', publisher: 'Br J Sports Med 50(19):1169–1176', year: 2016, url: 'https://doi.org/10.1136/bjsports-2016-096743', kind: 'Consensus' },
  { id: 'aaosHip2023', short: 'AAOS 2023', title: 'Management of Osteoarthritis of the Hip — Evidence-Based Clinical Practice Guideline', publisher: 'American Academy of Orthopaedic Surgeons', year: 2023, url: 'https://www.aaos.org/quality/quality-programs/osteoarthritis-of-the-hip/', kind: 'Recommandation' },
  { id: 'willy2019', short: 'Willy et al., JOSPT 2019', title: 'Patellofemoral Pain — Clinical Practice Guidelines', publisher: 'J Orthop Sports Phys Ther 49(9):CPG1–CPG95', year: 2019, url: 'https://doi.org/10.2519/jospt.2019.0302', kind: 'Recommandation' },
  { id: 'logerstedt2017', short: 'Logerstedt et al., JOSPT 2017', title: 'Knee Stability and Movement Coordination Impairments: Knee Ligament Sprain — Revision 2017', publisher: 'J Orthop Sports Phys Ther 47(11):A1–A47', year: 2017, url: 'https://doi.org/10.2519/jospt.2017.0303', kind: 'Recommandation' },
  { id: 'logerstedt2018', short: 'Logerstedt et al., JOSPT 2018', title: 'Knee Pain and Mobility Impairments: Meniscal and Articular Cartilage Lesions — Revision 2018', publisher: 'J Orthop Sports Phys Ther 48(2):A1–A50', year: 2018, url: 'https://doi.org/10.2519/jospt.2018.0301', kind: 'Recommandation' },
  { id: 'malliaras2015', short: 'Malliaras et al., JOSPT 2015', title: 'Patellar Tendinopathy: Clinical Diagnosis, Load Management, and Advice for Challenging Case Presentations', publisher: 'J Orthop Sports Phys Ther 45(11):887–898', year: 2015, url: 'https://doi.org/10.2519/jospt.2015.5987', kind: 'Consensus' },
  { id: 'bove2026', short: 'Bove et al. (APTA), Phys Ther 2026', title: 'Clinical practice guideline for physical therapist management of total knee arthroplasty: revision 2026', publisher: 'Physical Therapy 106(7):pzag058', year: 2026, url: 'https://doi.org/10.1093/ptj/pzag058', kind: 'Recommandation' },
  { id: 'martin2021', short: 'Martin et al., JOSPT 2021', title: 'Ankle Stability and Movement Coordination Impairments: Lateral Ankle Ligament Sprains — Revision 2021', publisher: 'J Orthop Sports Phys Ther 51(4):CPG1–CPG80', year: 2021, url: 'https://doi.org/10.2519/jospt.2021.0302', kind: 'Recommandation' },
  { id: 'chimenti2024', short: 'Chimenti et al., JOSPT 2024', title: 'Achilles Pain, Stiffness, and Muscle Power Deficits: Midportion Achilles Tendinopathy — Revision 2024', publisher: 'J Orthop Sports Phys Ther', year: 2024, url: 'https://doi.org/10.2519/jospt.2024.0302', kind: 'Recommandation' },
  { id: 'koc2023', short: 'Koc et al., JOSPT 2023', title: 'Heel Pain — Plantar Fasciitis: Revision 2023', publisher: 'J Orthop Sports Phys Ther 53(12):CPG1–CPG39', year: 2023, url: 'https://doi.org/10.2519/jospt.2023.0303', kind: 'Recommandation' },
  { id: 'martin2022', short: 'Martin et al., JOSPT 2022', title: 'Hamstring Strain Injury in Athletes — Clinical Practice Guidelines', publisher: 'J Orthop Sports Phys Ther 52(3):CPG1–CPG44', year: 2022, url: 'https://doi.org/10.2519/jospt.2022.0301', kind: 'Recommandation' },
  { id: 'ostlind2025', short: 'Östlind et al., BMC Prim Care 2025', title: 'Prevalence of musculoskeletal disorders and physiotherapy utilization in primary care — a registry-based study in Sweden', publisher: 'BMC Primary Care', year: 2025, url: 'https://doi.org/10.1186/s12875-025-03130-3', kind: 'Étude' },
]

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id) ?? null
