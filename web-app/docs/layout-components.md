# Composants Layout

Les composants `Layout` permettent de créer facilement des pages avec un rendu cohérent dans Nowts.

## Composants

Il y a 6 composants :

- **`Layout`** : conteneur principal qui définit la mise en page
  - Props : `size?: "sm" | "default" | "lg" | "xl"`
  - `default` (max-width: 1024px) → largeur de 1024px
  - `sm` (max-width: 768px) → largeur compacte
  - `lg` (max-width: 1792px) → largeur large
  - `xl` (max-width: 1400px) → largeur extra-large

- **`LayoutHeader`** : en-tête de la page contenant le titre et la description
  - Responsive : pleine largeur sur mobile, flex-1 sur desktop

- **`LayoutTitle`** : titre de la page (utilise la variante h2 de Typography)
  - S'utilise à l'intérieur de `LayoutHeader`

- **`LayoutDescription`** : description de la page (utilise Typography par défaut)
  - S'utilise à l'intérieur de `LayoutHeader`

- **`LayoutActions`** : conteneur pour les boutons d'action
  - Positionne les éléments en flex avec alignement vertical centralisé

- **`LayoutContent`** : zone de contenu principal de la page
  - Prend toute la largeur disponible

## Utilisation

```tsx
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutDescription,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";

export default function RoutePage(props: PageProps<"/route/path">) {
  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Titre de la page</LayoutTitle>
        <LayoutDescription>Description de la page</LayoutDescription>
      </LayoutHeader>
      <LayoutActions className="gap-2">
        <Button variant="outline">Supprimer</Button>
        <Button>Créer</Button>
      </LayoutActions>
      <LayoutContent className="flex flex-col gap-4">
        <Typography variant="large">
          Voici le contenu de la page avec des cartes, textes, etc.
        </Typography>
        <Card>
          <CardHeader>
            <CardTitle>Contenu de la page</CardTitle>
            <CardDescription>
              Description supplémentaire du contenu.
            </CardDescription>
          </CardHeader>
        </Card>
      </LayoutContent>
    </Layout>
  );
}
```

## Propriétés

Tous les composants acceptent les propriétés standard des éléments HTML (`className`, `style`, etc.) via `ComponentPropsWithoutRef`.

### Layout

```tsx
type LayoutProps = ComponentPropsWithoutRef<"div"> & {
  size?: "sm" | "default" | "lg" | "xl";
};
```

### LayoutHeader, LayoutActions, LayoutContent

```tsx
type Props = ComponentPropsWithoutRef<"div">;
```

### LayoutTitle

```tsx
type LayoutTitleProps = ComponentPropsWithoutRef<"h1">;
```

### LayoutDescription

```tsx
type LayoutDescriptionProps = ComponentPropsWithoutRef<"p">;
```

## Notes

- C'est une approche simple pour créer des layouts cohérents sans compliquer la structure
- Tu peux complètement utiliser ces composants à l'intérieur des layouts Next.js
- L'avantage par rapport aux layouts Next.js est que tu peux personnaliser le titre, la description et les actions pour chaque page individuellement
