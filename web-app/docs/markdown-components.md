# Composants Markdown

Si tu as besoin de rendre du Markdown dans notre application React, tu peux facilement le faire avec les deux composants que je propose.

## ClientMarkdown

Ce composant permet d'afficher du Markdown **côté client**, c'est-à-dire qu'il n'est pas rendu côté serveur. Il utilise la libraire `markdown-to-jsx` pour parser et rendre le Markdown.

```tsx
import { ClientMarkdown } from "@/features/markdown/client-markdown";

const markdown = `
# Hello World

Ceci est un paragraphe

- Item 1
- Item 2
- Item 3
`;

export default function App() {
  return <ClientMarkdown>{markdown}</ClientMarkdown>;
}
```

### Props

- `children: string` - Le contenu Markdown à rendre
- `className?: string` - Classes CSS personnalisées (remplace la classe `typography` par défaut)
- Tous les autres props de `markdown-to-jsx` sont supportés

### Styling par défaut

Par défaut, ce composant applique la classe `typography`. Tu peux la remplacer en passant une prop `className` au composant.

## ServerMdx

Ce composant permet d'afficher du Markdown **côté serveur**, ce qui signifie que le HTML est généré côté serveur et le client reçoit juste le rendu final.

Pourquoi `Mdx` ? Car ce composant supporte la syntaxe `mdx`, qui est une extension du `markdown` permettant d'ajouter des composants React dans le Markdown.

```tsx
import { ServerMdx } from "@/features/markdown/server-mdx";

const markdown = `
# Hello World

Ceci est un paragraphe

<Alert type="info">
  Ceci est un message d'information
</Alert>
`;

export default async function Page() {
  return <ServerMdx source={markdown} />;
}
```

### Props

- `source: string` - Le contenu MDX à rendre
- `className?: string` - Classes CSS personnalisées (appliquées au wrapper div, ajoutées à la classe `typography` par défaut)

### Ajouter des composants React personnalisés

**Par défaut**, aucun composant React n'est supporté. Pour en ajouter, tu dois modifier le fichier `src/features/markdown/server-mdx.tsx` :

```tsx
import { Alert } from "@/components/nowts/alert";

const MdxComponent = {
  Alert: Alert,
  // Ajoute d'autres composants ici
} satisfies Record<string, React.ComponentType>;
```

Exemple complet avec un composant `Alert` :

```mdx
# Mon Document

Ceci est un paragraphe normal.

<Alert type="info">Ceci est un message d'information</Alert>
```

## FAQ

### Quand utiliser ServerMdx vs ClientMarkdown ?

- **Utilise ServerMdx quand:**
  - Tu dois intégrer des composants React personnalisés dans ton Markdown
  - Tu veux que le rendu soit effectué côté serveur (meilleur pour la performance)
  - Tu as besoin de MDX

- **Utilise ClientMarkdown quand:**
  - Tu as du Markdown basique sans composants React
  - Tu rendes du contenu Markdown dynamiquement côté client

### Puis-je utiliser des composants React dans ClientMarkdown ?

Non, `ClientMarkdown` ne supporte que du Markdown basique. Pour intégrer des composants React, tu dois utiliser `ServerMdx`.
