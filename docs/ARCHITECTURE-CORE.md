# Architecture cible de `@pdfcraft/core`

Ce document définit où placer un comportement, les dépendances autorisées et la manière dont une
feature participe à la génération d'un PDF.

## Objectif

`@pdfcraft/core` reçoit un `DocumentDefinition` complet et produit un PDF avec PDFKit. L'entrée contient :

- la configuration du document : format, orientation, marges, métadonnées et permissions ;
- les ressources : polices, images, fichiers et références externes ;
- les comportements de page : arrière-plan, en-tête, pied de page, watermark et pagination ;
- un arbre de contenu : texte, image, table, liste, colonnes, canvas, formulaire, etc.

```text
DocumentDefinition
├── Configuration globale
│   ├── format A4, orientation
│   ├── marges
│   ├── styles et polices
│   ├── en-têtes, pieds de page, fond
│   └── métadonnées et permissions
│
└── Arbre de contenu
    ├── text
    ├── image
    ├── table
    ├── columns
    ├── list
    └── etc.
          ↓
1. Validation et normalisation
          ↓
2. Résolution des ressources
          ↓
3. Mesure
          ↓
4. Mise en page et pagination
          ↓
5. Création des éléments de page
          ↓
6. Rendu via PDFKit
          ↓
7. PDF final
```

Le moteur orchestre ce pipeline. Chaque feature possède la connaissance de son contenu.

## Priorités du refactor

1. Rendre le chemin entre l'objet d'entrée et PDFKit lisible.
2. Centraliser le comportement de chaque contenu dans sa feature.
3. Réduire le dispatch, les adaptateurs redondants et les abstractions inutiles.
4. Éviter qu'une correction locale exige de modifier de nombreux fichiers centraux.
5. Préserver le rendu PDF et toutes les règles de pagination existantes.

Une correction ou un nouveau champ pour `text`, `image` ou `table` doit normalement toucher seulement
son dossier, ses tests et, si le contrat utilisateur change, son type public. Une nouvelle feature
demande une seule inscription dans le registre. Des listes ou `switch` séparés par étape indiquent
que l'architecture doit être simplifiée.

Le nombre de fichiers n'est pas un objectif. Des hooks courts partageant les mêmes invariants peuvent
rester ensemble. Un module est séparé uniquement si sa responsabilité devient plus claire ou testable.

## Catégories de comportement

### Feature de nœud

Elle possède un type de contenu sur tout son cycle de vie : reconnaissance, validation, mesure, layout
et éventuellement rendu. `text`, `image`, `table`, `list`, `columns`, `canvas` et `acroform` en sont
des exemples. Son code, ses types privés et ses tests restent dans
`packages/core/src/features/<feature>/`.

### Feature de document

Elle agit sur le document, une page entière ou le résultat global, hors du dispatch normal des nœuds :
arrière-plan, en-tête/pied de page, watermark, `pageBreakBefore` ou convergence du nombre de pages.
Elle traite du contenu uniquement via des capacités moteur injectées.

### Service partagé du moteur

Il fournit un mécanisme neutre utilisé par plusieurs features ou par le pipeline : styles, typographie,
ressources, références, mesure de boîte, pagination, écriture des éléments de page ou adaptation PDFKit.
Il ne reconnaît aucun nœud concret et ne contient aucune politique de feature. Un algorithme utilisé
par une seule feature reste dans cette feature.

## Cycle de vie d'une feature de nœud

Une feature expose un descripteur unique avec un `kind`, un matcher et seulement les hooks utiles.

1. **Matching — obligatoire.** Reconnaît la forme brute sans la modifier. Il est déterministe ; une
   forme ambiguë produit une erreur de validation plutôt qu'un choix fondé sur l'ordre des propriétés.
2. **Preprocessing — optionnel.** Valide, normalise l'API publique et traite éventuellement les enfants
   via un callback moteur. Sans hook, le moteur applique une transition identité et affecte le `kind`.
3. **Resource resolution — optionnel.** Résout avant la mesure les URL, images, polices, fichiers ou
   ressources d'extension introduits par la feature.
4. **Measurement — optionnel.** Calcule les dimensions intrinsèques et enrichit le nœud sans fixer sa
   page ni ses coordonnées. Sans calcul nécessaire, la transition est une identité.
5. **Layout — optionnel.** Décide comment le contenu utilise l'espace, se découpe et change de page.
   Une feature composite traite ses enfants par un port moteur injecté.
6. **Placement — optionnel.** Pour un élément atomique, teste la place, aligne, déplace le curseur et
   émet un élément de page positionné. Les contenus fluides ou composites utilisent plutôt le layout.
7. **Rendering — optionnel.** Traduit l'élément positionné de la feature en appels PDFKit. Il est
   inutile si la feature émet des primitives partagées ou n'a aucune sortie visuelle.

Les hooks absents ont un comportement identité ou no-op défini par le moteur. Une feature ne fournit
pas de méthode vide uniquement pour satisfaire une interface.

## Registre des features

Le registre est une collection ordonnée de descripteurs assemblée par la composition racine.

- Chaque `kind` est unique et enregistré une seule fois pour toutes les étapes.
- Avant le preprocessing, le premier matcher correspondant gagne.
- Après le preprocessing, le dispatch utilise directement `_kind`.
- L'ordre de matching est explicite et testé ; un nœud inconnu produit une erreur claire.
- Le registre coordonne les hooks mais ne contient aucun algorithme de feature.

Il n'existe pas un registre par étape : ces listes parallèles créent duplication et oublis.

## Pagination et contenu indivisible

L'indépendance des features ne supprime aucune règle complexe de pagination.

Le moteur possède les mécanismes génériques : espace disponible, marges et contexte courant,
changement de page ou colonne, `pageBreak`, `unbreakable`, transaction temporaire, annulation d'une
tentative et reprise complète sur la page suivante.

Chaque feature possède les décisions propres à sa structure :

- `table` décide où séparer table, groupe ou ligne ; `dontBreakRows`, `keepTogether`, en-têtes répétés,
  `rowSpan`, bordures et fragments restent sous sa responsabilité ;
- `text` décide des coupures de ligne et de paragraphe ;
- `list` conserve le marqueur avec le premier contenu de l'item ;
- `columns` synchronise ses colonnes et leurs changements de page ;
- `image` reste atomique et passe à la page suivante lorsqu'elle ne tient pas.

```text
feature : décide ce qui peut être séparé
        ↓
moteur : fournit transactions, espace et changements de page
        ↓
feature : accepte la coupure ou recommence sur la page suivante
```

Le moteur ne connaît pas les lignes ou cellules d'une table. `table` ne réimplémente pas le changement
de page générique.

## Propriété du contenu inline

`text` possède la syntaxe inline, l'héritage des styles, l'aplatissement des fragments, les coupures
Unicode, la mesure, la construction des lignes et le `PageItem` de ligne.

Une feature utilisable inline, comme une image ou un formulaire, possède la validation, la résolution,
la mesure et le rendu de sa charge utile. Elle expose des ports étroits injectés dans le pipeline texte.
`text` ne l'importe pas et elle ne modifie pas l'état privé des lignes.

## Propriété des éléments de page

`PageItem` est la frontière entre layout et rendu.

- La feature possède la signification et les données de son élément spécifique.
- L'element writer possède insertion, ordre, coordonnées, clonage et contrôles communs.
- Les renderers partagés possèdent les primitives neutres comme lignes et vecteurs.
- Le renderer d'une feature traduit uniquement son élément en appels PDFKit.
- Une feature ne pousse jamais directement dans une page et ne rend jamais l'élément d'une autre.

Un nouveau type de `PageItem` met à jour ensemble l'union, la géométrie si nécessaire, le placement,
la composition de rendu et les tests.

## Dépendances autorisées

```text
types publics / utilitaires
            ↑
services partagés / contrats moteur
            ↑
features de nœud       features de document
            ↖           ↗
             composition
                  ↑
      orchestration / entrées runtime
```

- Une feature importe les types, utilitaires, services partagés et contrats moteur.
- La composition importe les features concrètes et les services partagés.
- L'orchestration importe des façades composées, jamais les features concrètes.
- Les services et contrats moteur restent neutres.
- Une feature n'importe jamais une autre feature, même uniquement pour ses types.
- Une feature de document n'importe pas une feature de nœud.
- Une collaboration utilise un port étroit déclaré par le consommateur et injecté par composition.
- Un type devient partagé uniquement lorsque son concept est réellement neutre.

## Ajouter une feature

1. Définir sa forme publique, son `kind` et les types internes nécessaires.
2. Créer `packages/core/src/features/<kind>/` avec son descripteur et ses hooks utiles.
3. Garder ensemble les hooks courts partageant les mêmes invariants.
4. Exprimer les besoins externes avec des ports injectés, sans importer une autre feature.
5. Ajouter une seule entrée au registre avec sa priorité de matching.
6. Tester les étapes implémentées, formes invalides et règles de pagination concernées.
7. Ajouter un test d'intégration ou public si le comportement observable change.
8. Mettre à jour documentation et changelog si le support public change.

Une feature est isolée si sa suppression du registre retire son comportement sans laisser de
connaissance spécifique dans le moteur.

## Exemples

- **Nouveau champ `text` :** modifier son type public, `features/text/`, ses tests et éventuellement un
  test public ou d'intégration, sans ajouter de branche aux services génériques.
- **Coupure de table :** corriger `features/table/`, qui utilise les transactions moteur mais possède
  `dontBreakRows`, `keepTogether`, `rowSpan`, groupes et en-têtes répétés.
- **Feature atomique :** fournir uniquement matching, validation, mesure, placement et rendu nécessaires,
  puis l'ajouter une fois au registre.

## Critères de réussite

- Un contributeur sait où placer tout nouveau comportement.
- Features de nœud, features de document et services partagés sont distincts.
- Aucune feature n'importe une autre feature.
- Le moteur ne contient aucune branche propre à un contenu.
- Chaque feature est enregistrée une seule fois et les changements locaux restent dans son dossier.
- Les règles complexes de pagination restent couvertes et inchangées.
- Le chemin `DocumentDefinition` → pages → PDFKit reste direct et compréhensible.
- Le refactor réduit le code et les points de modification au lieu d'ajouter des couches.

## Hors objectif

- Changer le format public sans besoin explicite ou modifier le rendu des PDF existants.
- Remplacer PDFKit.
- Transformer chaque fonction en service ou interface.
- Créer un système générique de plugins au-delà des besoins actuels.
- Séparer artificiellement chaque étape dans un fichier différent.
