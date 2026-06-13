# Auth Components

`NowStack` vient avec tous les composants qui te permettent de gérer facilement l'authentification. Ils se trouvent dans `src/features/auth/`.

## SignInButton

Composant client qui affiche un bouton pour se connecter. Il redirige automatiquement sur `/auth/signin` avec le bon `callbackUrl` (la page actuelle).

**Props:** `VariantProps<typeof buttonVariants>` (accepte les variantes du bouton comme `size`, `variant`, etc.)

```tsx
import { SignInButton } from "@/features/auth/sign-in-button";

export default function Home() {
  return (
    <div>
      <SignInButton size="lg" variant="default" />
    </div>
  );
}
```

## LoggedInButton

Composant client qui affiche l'avatar de l'utilisateur avec un dropdown menu. Quand l'utilisateur clique dessus, il voit un menu avec des actions (Dashboard, Account Settings, Admin, Theme, Logout).

**Props:**

```tsx
{
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}
```

```tsx
import { LoggedInButton } from "@/features/auth/sign-in-button";

export default function Home() {
  const user = await getUser();
  if (!user) return null;

  return (
    <div>
      <LoggedInButton user={user} />
    </div>
  );
}
```

## AuthButton (Server Side)

Composant serveur qui affiche automatiquement `LoggedInButton` ou `SignInButton` en fonction de l'authentification de l'utilisateur.

**Props:** Aucune

**Features:**

- Utilise `Suspense` avec fallback `Skeleton`
- Récupère l'utilisateur côté serveur
- Idéal pour les layouts et pages serveur

```tsx
import { AuthButton } from "@/features/auth/auth-button";

export default function Header() {
  return (
    <div>
      <AuthButton />
    </div>
  );
}
```

## AuthButtonClient (Client Side)

Composant client qui a le même comportement que `AuthButton`. Il affiche automatiquement `LoggedInButton` ou `SignInButton` en fonction de la session utilisateur.

**Props:** Aucune

**Features:**

- Utilise le hook `useSession` côté client
- À utiliser quand tu as besoin d'un composant client

```tsx
"use client";

import { AuthButtonClient } from "@/features/auth/auth-button-client";

export default function ClientHeader() {
  return (
    <div>
      <AuthButtonClient />
    </div>
  );
}
```

## Déconnexion

La déconnexion se fait via le menu dropdown dans `LoggedInButton`. Le composant `UserDropdownLogout` gère l'action de déconnexion et redirige automatiquement vers `/auth/signin` après la déconnexion.
