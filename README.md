# Physio · Assistant de consultation (prototype v0.4)

Application tablette (iPad en priorité) qui aide le physiothérapeute pendant la séance :
expliquer la pathologie en 3D, structurer le contexte, prescrire les exercices et
remettre au patient son programme, qu'il suit ensuite sur son téléphone.

## Démarrer

```bash
npm install
npm run dev          # serveur de développement (http://localhost:5173)
npm run build        # build mono-fichier dans dist/index.html (fonctionne hors-ligne une fois chargé)
npx tsx scripts/test-interpret.ts   # interpréteur local sur des phrases types
npx tsx scripts/check-catalog.ts    # cohérence catalogue : animations, pathologies, sources
npx tsx scripts/test-claude.ts      # validation des réponses de Claude (identifiants inconnus retirés)
npx tsx scripts/illus.ts            # planche de toutes les illustrations d'exercices (/tmp/illus.html)
```

## Parcours (v0.4)

**Praticien** : *Mes patients* → 4 étapes, un seul bouton principal « Continuer » en bas d'écran.

| Étape | Qui regarde | Écran | Contenu |
|---|---|---|---|
| Mes patients | Praticien | `screens/PatientsHome.tsx` | Patients suivis sur la tablette (pseudonymes), étape en cours, programme remis, retours du patient (séances faites, douleur). |
| 1 · Situation | Praticien | `screens/Home.tsx` + `screens/Context.tsx` | Prompt tapé ou dicté → analyse locale immédiate, puis **affinée par Claude** ; pathologie ou région ; contexte (phase, EVA, objectifs, matériel, temps), drapeaux rouges, plan en 3 phases, points clés et **sources**. |
| 2 · Expliquer | **Patient** | `screens/Presentation.tsx` | Écran intermédiaire « Tournez l'écran vers le patient ». Comparaison 3D Normal / Pathologie. Retour praticien : **maintenir 2 s** le bouton cadenas. |
| 3 · Programme | Praticien | `screens/Exercises.tsx` | Bibliothèque filtrée, **illustrations générées** depuis le mannequin 3D, dosage, « Pourquoi (Claude) », modèles, vue 3D. |
| 4 · Remise | **Patient** | `screens/Share.tsx` | Ce qu'il emporte (explication, exercices illustrés, limite de douleur), QR code, lien, impression. « Terminer la séance » (maintenir 2 s). |

**Patient** (lien / QR, téléphone) : `screens/PatientHome.tsx`, trois onglets.
- **Aujourd'hui** : séance guidée exercice par exercice (séries, minuterie de maintien et de repos, vue 3D, consignes), puis douleur ressentie 0–10.
- **Comprendre** : « Normalement / Chez moi », amplitude, comparaison 3D.
- **Mon suivi** : séances de la semaine, jours d'affilée, courbe de douleur (vert sous la limite fixée, rouge au-dessus).

## Catalogue

- **31 pathologies** fréquentes sur 8 régions (épaule, coude, poignet/main, cervical, lombaire, hanche/cuisse, genou, cheville/pied) : explications simples et techniques, normal vs pathologie, drapeaux rouges, 3 phases, points clés, sources (`data/pathologies.ts`).
- **58 exercices**, tous animés en 3D (`data/exercises.ts`, `data/motions.ts`).
- **28 sources** vérifiées (recommandations de pratique, consensus) avec DOI (`data/sources.ts`).

## Illustrations d'exercices

`three/illustration.ts` projette le mannequin 3D (sans WebGL) : vue de côté ou de face selon la caméra de l'exercice,
**position de départ en gris, position d'arrivée en bleu, muscles qui travaillent en vert, qui s'étirent en bleu clair**,
trajectoire en pointillés orange, sol et matériel. Membres éloignés plus clairs. SVG mis en cache, utilisé dans les cartes,
la remise, l'app patient et la séance guidée.

## Claude dans l'application

`engine/claude.ts`. Dans l'artifact, la capacité `sample` permet d'interroger Claude **avec le compte de la personne qui ouvre la page**
(consentement demandé au premier appel). Hors artifact ou sans consentement : analyse locale uniquement.

1. Le prompt du praticien est envoyé avec un **contexte construit par l'application** : résumé du catalogue (identifiants, synonymes, points clés, drapeaux rouges, exercices par région / phase / matériel, sources) et pré-analyse locale.
2. Claude répond en **JSON strict** : critères (pathologie, région, côté, phase, EVA, matériel, objectifs, temps), synthèse clinique, message patient, exercices argumentés, points de vigilance, questions, sources.
3. L'application **valide** : tout identifiant hors catalogue est retiré (pathologie, exercice, source), les exercices doivent correspondre à la région et au matériel déclaré. En cas d'échec, l'analyse locale reste.
4. Le résultat alimente toutes les étapes : critères pré-remplis, programme, « Pourquoi » par exercice, vigilance dans le contexte, message simple à la remise, **sources affichées côté praticien uniquement**.

## Principes d'ergonomie

- **Qui regarde l'écran est toujours clair** : écran intermédiaire avant chaque vue patient, retour praticien protégé (maintien 2 s), réglages praticien masqués côté patient.
- **Un seul bouton principal par étape**, en bas, toujours au même endroit.
- **Code couleur unique** : vert = normal / ce qui travaille, rouge = pathologie / douleur, bleu = étirement, jaune = stabilisation.
- **Normal et pathologie toujours distingués** : 3D comparée, blocs « Normalement / Chez vous » partout.
- **Responsive** : téléphone portrait et paysage, tablette, ordinateur. Cibles tactiles ≥ 44 px.

## Architecture

```
src/
  App.tsx                 Routage praticien / patient, étapes, écran « tournez l'écran »
  state/session.ts        Patients (multi), sauvegarde auto, modèles, passeport, journal de suivi
  engine/interpret.ts     Interpréteur local (hors-ligne)
  engine/claude.ts        Contexte, appel Claude, validation stricte
  engine/plan.ts          Filtrage des exercices et suggestion de programme
  data/                   Pathologies, exercices, animations, sources
  three/rig.ts            Mannequin articulé (squelette, muscles, silhouette)
  three/ExerciseScene.tsx Animation 3D des exercices
  three/illustration.ts   Illustrations SVG générées
  three/Shoulder3D.tsx    Épaule 3D normal / pathologie
  components/             Icônes, menus, bouton à maintenir, sources
  screens/                Écrans
```

## Limites connues

- **Contenu clinique de démonstration** : à faire relire et valider avant tout usage réel.
- **Suivi patient local** : le journal est stocké sur le téléphone du patient ; le praticien ne voit les retours que sur le même appareil (démo). En production : serveur sécurisé (liens signés, expirants, hébergement conforme nLPD / RGPD).
- Mannequin et épaule 3D procéduraux : à remplacer par des modèles glTF médicaux ; poses à valider.
- Seule l'épaule a une comparaison 3D ; les autres régions ont l'explication texte.
- Claude n'est disponible que dans l'artifact (compte de l'utilisateur) ; en production, appel côté serveur avec la même validation.

## Prochaines étapes proposées

1. Relecture du catalogue (31 pathologies, 58 exercices) par 2–3 physiothérapeutes.
2. Backend suisse : comptes, synchronisation des retours patients, liens sécurisés.
3. Jeu de tests de prompts réels pour mesurer la qualité de l'analyse Claude.
4. Modèles 3D (genou, cheville, rachis) ; PWA installable.
5. Tests en cabinet : objectif < 2 minutes d'usage par séance.
