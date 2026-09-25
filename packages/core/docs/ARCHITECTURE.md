# Architecture de `@pdfcraft/core`

Ce document décrit comment le package est organisé et comment un `DocumentDefinition` devient un PDF.
Il indique où placer un comportement et quelles dépendances sont autorisées. Les règles de dépendance
sont vérifiées par `src/__tests__/architecture.test.ts`.

## Vue d'ensemble

`@pdfcraft/core` reçoit un `DocumentDefinition` complet et produit un PDF avec PDFKit.

```text
PdfCraft.createPdf(docDefinition)                    core/pdfcraft.ts
  └─ clone du DocumentDefinition                     utils/clone-document-definition.ts
     └─ Printer.createPdfKitDocument                 core/printer.ts
        ├─ résolution des URL et ressources          core/printer.resources.ts, resources/
        ├─ LayoutBuilder.layoutDocument              layout/layout-builder.ts
        │    └─ pipeline de layout multi-passes      engine/document-layout-pipeline.ts
        │         └─ une passe                        composition/built-in-document-pipeline.ts
        │              1. preprocessing               composition/built-in-preprocessing.ts
        │              2. measurement                 composition/built-in-measurement.ts
        │              3. layout + pagination         composition/built-in-layout.ts
        │              4. features de document        composition/built-in-document-features.ts
        │              → pages de PageItem
        └─ Renderer.renderPages                      rendering/renderer.ts
             └─ primitives partagées + rendu par feature   composition/built-in-rendering.ts
                → document PDFKit → OutputDocument     output/
```

Le document est cloné une seule fois. Le pipeline peut ensuite relancer plusieurs passes complètes
(jusqu'à 10) tant que le nombre de pages, les marges dynamiques ou `pageBreakBefore` ne sont pas
stables. Chaque passe re-prétraite le même arbre.

## Organisation des dossiers

| Dossier | Rôle |
|---|---|
| `core/` | Entrées runtime : `PdfCraftBase`, `Printer`, métadonnées, fichiers embarqués, résolution des ressources |
| `composition/` | Assemble les features concrètes : registre, contextes par étape, ports injectés, pipeline d'une passe, rendu |
| `features/<kind>/` | Une feature de nœud : descripteur, hooks, types de nœud et tests |
| `features/repeatables/` | Features de document : arrière-plan, en-tête et pied de page, watermark, `pageBreakBefore` |
| `engine/` | Contrats neutres (`contracts/node-feature.ts`), pipeline multi-passes, cycle de vie et pagination génériques des nœuds |
| `layout/` | Element writer, lignes, colonnes, géométrie des `PageItem` et `LayoutBuilder` (point d'entrée de l'orchestration du layout) |
| `document/` | `DocumentContext` : pages, curseur, espace disponible, colonnes serpentines |
| `rendering/` | Adaptateur PDFKit, renderer de pages, primitives partagées (vecteurs, clipping, alignement vertical) |
| `services/` | Services neutres : styles, typographie, mesure de boîte, références de ressources |
| `resources/`, `configuration/`, `output/` | Résolution des URL et système de fichiers virtuel, formats de page et layouts de table, flux de sortie |
| `types/` | Types publics (`types/index.ts`) et types internes neutres (`types/internal.ts`) |
| `utils/` | Fonctions utilitaires sans connaissance de feature |

## Catégories de comportement

### Feature de nœud

Elle possède un type de contenu sur tout son cycle de vie. Les features de nœud actuelles sont :
`section`, `columns`, `stack`, `list`, `table`, `text`, `toc`, `image`, `canvas`, `attachment`,
`acroform` et `extension` (qui porte les extensions enregistrées par l'utilisateur). Son code, ses
types de nœud, son état privé et ses tests restent dans `src/features/<kind>/`.

### Feature de document

Elle agit sur une page entière ou sur le résultat d'une passe, hors du dispatch des nœuds :
arrière-plan, en-tête et pied de page, watermark et `pageBreakBefore`. Elle vit dans
`features/repeatables/` et reçoit le contenu uniquement par des ports (prétraiter, mesurer, mettre en
page un bloc, savoir si un nœud porte un marqueur de liste…).

### Service et moteur partagés

Ils fournissent des mécanismes neutres : styles, typographie, mesure de boîte, écriture des éléments
de page, contexte de document, pagination, rendu des primitives et adaptation PDFKit. Ils ne
reconnaissent aucun nœud concret et ne contiennent aucune politique de feature. Un algorithme utilisé
par une seule feature reste dans cette feature.

## Descripteur de feature

Chaque feature de nœud exporte un descripteur `<kind>Feature` qui implémente
`NodeFeature<Stages>` (`engine/contracts/node-feature.ts`). `Stages` décrit le type du nœud et du
contexte à chaque étape. Seul `matches` est obligatoire ; les autres hooks sont fournis uniquement
lorsqu'ils sont utiles.

| Hook | Étape | Rôle |
|---|---|---|
| `matches` | avant preprocessing | Reconnaît la forme publique sans la modifier |
| `preprocess` | preprocessing | Valide, normalise, affecte `_kind` et prétraite les enfants par un port |
| `resolveResources` | avant la mesure | Résout les ressources du document propres à la feature (fichiers joints, extensions) |
| `measure` | measurement | Calcule tailles et métriques intrinsèques, sans position |
| `layout` | layout | Décide l'utilisation de l'espace, les coupures et les changements de page |
| `place` | layout | Pour un élément atomique : teste la place, aligne et émet un `PageItem` |
| `render` | rendu | Traduit le `PageItem` de la feature en appels PDFKit |
| `decorate`, `reset` | layout | Préparent ou réinitialisent l'état de layout avant une nouvelle tentative |
| `inline` | measurement | Mesure la charge utile quand le contenu apparaît dans une ligne de texte |

Chaque hook reçoit le type de nœud de son propre `kind` et le sous-ensemble de contexte qu'il déclare.
Le registre garantit la forme du nœud en aiguillant par `_kind`.

## Registre des features

`composition/built-in-feature-registry.ts` contient la liste ordonnée `builtInFeatures` et les
fonctions qui aiguillent chaque étape vers le bon hook.

- Chaque `kind` est enregistré une seule fois pour toutes les étapes ; un doublon lève une erreur.
- Avant le preprocessing, un nœud public est reconnu par les matchers. Un nœud reconnu par plusieurs
  features (par exemple `{ image, canvas }`) est rejeté avec `Ambiguous document node`.
- Après le preprocessing, le dispatch utilise directement `_kind`.
- La feature `extension` reçoit son matcher dans la composition, car il dépend des extensions de
  l'instance.
- Un nœud inconnu produit `Unrecognized document structure`.
- Le registre coordonne les hooks mais ne contient aucun algorithme de feature. Il n'existe pas de
  liste ou de `switch` par étape.

## Types de nœud

Les nœuds traversent trois étapes typées : `PreprocessedPdfNode`, `MeasuredPdfNode` et
`LayoutPdfNode` (plus `MeasurePdfNode`, la forme reçue par `measure`).

Ces unions sont construites à partir de l'interface ouverte `NodeKindRegistry`, déclarée dans
`types/document.types.ts`. Chaque feature la complète depuis son propre `<kind>.types.ts` :

```ts
declare module "../../types/document.types" {
	interface NodeKindRegistry {
		image: {
			preprocessed: PreprocessedImageNode;
			measure: MeasuredImageNode;
			measured: MeasuredImageNode;
			layout: LayoutImageNode;
		};
	}
}
```

`types/` n'importe donc aucune feature. L'état partagé (`PreprocessedNodeState`,
`MeasuredNodeState`, `LayoutNodeState`) ne contient que des concepts neutres : références entre
nœuds, tailles, marges, positions et boîte d'alignement vertical. L'état propre à une feature vit dans
ses types, par exemple `TableNodeState` et `EndingCell` pour table, `ListItemState` et `ListMarker`
pour list, `TextReferenceState` pour text.

### Mutation sur place

Les étapes enrichissent le même objet au lieu de le copier. Les références de page et de texte, les
éléments de table des matières et les passes répétées dépendent de l'identité des objets : une passe
suivante retrouve les nœuds déjà prétraités et les aiguille par `_kind`.

- `markNodeKind(node, kind)` (`utils/node.ts`) est le seul point qui affecte `_kind` et renvoie le
  type prétraité de la feature.
- `PendingMeasureNode` type un enfant envoyé à la mesure par son parent : il est encore prétraité même
  si la forme mesurée du parent le type déjà comme mesuré.

## Composition et ports

La composition est le seul endroit qui importe les features concrètes. Pour chaque étape, elle
construit un contexte qui est l'intersection des besoins déclarés par les features :

```ts
type BuiltInMeasureContext = NodeMeasureContext & ListMeasureCapabilities & TextMeasureCapabilities;
```

Une collaboration entre features passe par un port déclaré par la feature consommatrice et injecté par
la composition :

| Consommateur | Port | Fourni par |
|---|---|---|
| `list` (mesure) | `ListMeasureCapabilities.inlines` : mesure et construction des inlines du marqueur | pipeline texte |
| `text` (mesure) | `TextMeasureCapabilities.inlines` | `TextInlines` composé avec `image.inline` et `acroform.measureInline` |
| `text` (rendu) | `renderAcroForm(inline, x, y)` | renderer AcroForm partagé |
| `table`, `columns` (layout) | `processRow` | `TableRowLayout` composé dans `built-in-layout.ts` |
| `pageBreakBefore` | `hasLeadingMarker(node)`, `copyExtensionProperties` | `listFeature.hasMarker`, `extensionFeature` |
| arrière-plan, en-tête et pied de page | `preprocessNode`, `measureNode`, `layoutNode` | pipeline d'une passe |
| page element writer | `ElementPlacementAdapter` | `createBuiltInElementPlacement` |

`createBuiltInPreprocessing(extensions)` crée un état de références et de table des matières neuf à
chaque appel de `preprocessDocument` ou `preprocessBlock`. `createBuiltInMeasurement(options)` crée
la pile de styles et le moteur de texte inline ; `textInlines` peut être remplacé par une option.

## Pagination et contenu indivisible

Le moteur possède les mécanismes génériques : espace disponible, marges, contexte courant, changement
de page ou de colonne, `pageBreak`, `unbreakable`, transactions, annulation d'une tentative et reprise
sur la page suivante.

Chaque feature possède les décisions propres à sa structure :

- `table` décide où séparer table, groupe ou ligne : `dontBreakRows`, `keepTogether`, en-têtes
  répétés, hauteurs fixes, `rowSpan`, `colSpan`, bordures et fragments ;
- `text` décide des coupures de ligne et de paragraphe ;
- `list` conserve le marqueur avec le premier contenu de l'élément ;
- `columns` synchronise ses colonnes et leurs changements de page ;
- `image` et les autres éléments atomiques passent à la page suivante lorsqu'ils ne tiennent pas.

Le moteur ne connaît pas les lignes ou cellules d'une table, et `table` ne réimplémente pas le
changement de page générique. Les cellules fantômes créées par une fusion n'ont pas de `_kind` et sont
ignorées par le dispatch.

## Contenu inline

`text` possède la syntaxe inline, l'héritage des styles, l'aplatissement des fragments, les coupures
Unicode, la mesure, la construction des lignes et le `PageItem` de ligne.

Une feature utilisable inline (`image`, `acroform`) possède la validation, la mesure et le rendu de sa
charge utile, et les expose par des ports injectés dans le pipeline texte. `text` ne l'importe pas.

## Éléments de page

`PageItem` est la frontière entre layout et rendu.

- Les primitives partagées sont `vector`, `line`, `beginClip`, `endClip`, `beginVerticalAlignment` et
  `endVerticalAlignment`. Le renderer et la géométrie de page les traitent explicitement.
- Un élément émis par une feature est un `FeaturePageItem` dont le `type` est le `kind` de la feature
  (`image`, `extension`, `attachment`, `acroform`). La géométrie, le clonage des fragments et le rendu
  le traitent de façon générique ; le rendu passe par `renderFeatureItem(kind, …)`.
- L'element writer possède insertion, ordre, coordonnées, clonage et contrôles communs. Une feature ne
  pousse jamais directement dans une page et ne rend jamais l'élément d'une autre.

## Dépendances autorisées

```text
types publics / utilitaires
            ↑
services, engine, document, layout (writers)
            ↑
features de nœud       features de document
            ↖           ↗
             composition
                  ↑
  orchestration : core/, layout/layout-builder.ts, rendering/
```

- Une feature importe les types, utilitaires, services et contrats moteur.
- Une feature n'importe jamais une autre feature, même uniquement pour ses types.
- `types`, `utils`, `services`, `engine`, `document` et `layout` n'importent ni les features ni la
  composition. Seul `layout/layout-builder.ts`, point d'entrée de l'orchestration, importe la
  composition.
- La composition importe les features concrètes ; l'orchestration importe des façades composées.
- Un champ d'état partagé des nœuds n'est jamais utilisé par une seule feature.

Le test d'architecture échoue si l'une de ces règles est violée.

## Tests

- **Par feature :** `features/<kind>/__tests__/` couvre les étapes implémentées et les formes
  invalides.
- **Architecture :** `src/__tests__/architecture.test.ts` vérifie les imports et la propriété de
  l'état partagé.
- **Pagination des tables :** `features/table/__tests__/table.pagination.snapshot.test.ts` met en page
  un corpus de tables et compare chaque élément de page à un snapshot. Toute modification de la
  pagination des tables apparaît comme une différence de snapshot.
- **Fixtures :** `src/__tests__/fixtures/` fournit `createTestMeasurement` et les assertions typées
  `expectPreprocessedKind` et `expectMeasuredKind`. `tests/helpers/layout-builder.ts` fournit un
  `LayoutBuilder` de test.
- **Typage :** `pnpm run typecheck` (lancé par `pnpm test`) vérifie aussi le typage des tests.

Les tests se lancent depuis la racine du dépôt, car les chemins des polices sont relatifs à la racine.

## Ajouter une feature

1. Définir sa forme publique dans `types/content.types.ts`, son `kind` et ses types de nœud.
2. Créer `src/features/<kind>/` avec son descripteur et seulement les hooks utiles.
3. Déclarer ses types de nœud dans `NodeKindRegistry` depuis `<kind>.types.ts`.
4. Affecter `_kind` au preprocessing avec `markNodeKind`.
5. Exprimer ses besoins externes par des ports déclarés dans la feature, sans importer une autre
   feature, et les fournir dans la composition.
6. Ajouter une seule entrée à `builtInFeatures`.
7. Si elle émet un élément de page propre, ajouter son `kind` à `FeaturePageItem` et fournir `place`
   et `render`.
8. Tester les étapes implémentées, les formes invalides et les règles de pagination concernées, puis
   mettre à jour le changelog si le comportement public change.

Une feature est isolée si la retirer du registre supprime son comportement sans laisser de
connaissance spécifique dans le moteur.

## Exemples

- **Nouveau champ `text` :** modifier son type public, `features/text/` et ses tests, sans ajouter de
  branche aux services génériques.
- **Coupure de table :** corriger `features/table/` et vérifier les snapshots de pagination.
- **Feature atomique :** fournir matching, preprocessing, mesure, placement et rendu, puis l'ajouter
  une fois au registre.

## Hors périmètre

- Changer le format public sans besoin explicite ou modifier le rendu des PDF existants.
- Remplacer PDFKit.
- Copier les nœuds à chaque étape au lieu de les enrichir sur place.
- Transformer chaque fonction en service ou interface, ou séparer artificiellement chaque étape dans
  un fichier différent.
