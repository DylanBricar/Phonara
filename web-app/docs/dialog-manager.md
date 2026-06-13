# Dialog Manager

Le Dialog Manager permet d'afficher facilement des dialogues de confirmation, de saisie ou personnalisés dans ton application.

## Installation

Le Dialog Manager est déjà intégré dans NowStack. Assure-toi que le composant `DialogManagerRenderer` est présent dans ton layout principal.

## Import

```tsx
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
```

## Confirm Dialog

Pour afficher une boîte de confirmation avec des boutons Action/Annuler :

```tsx
<Button
  variant="destructive"
  onClick={() => {
    dialogManager.confirm({
      title: "Supprimer le profil",
      description: "Es-tu sûr de vouloir supprimer ton profil ?",
      action: {
        label: "Supprimer",
        variant: "destructive",
        onClick: async () => {
          await deleteAccountAction(null);
          toast.success("Ton profil a été supprimé.");
        },
      },
    });
  }}
>
  Supprimer
</Button>
```

### Options Confirm Dialog

| Option        | Type                                      | Description                                       |
| ------------- | ----------------------------------------- | ------------------------------------------------- |
| `title`       | `string`                                  | Titre du dialogue                                 |
| `description` | `ReactNode`                               | Description ou contenu personnalisé               |
| `icon`        | `LucideIcon`                              | Icône affichée dans un cercle                     |
| `variant`     | `"default" \| "destructive" \| "warning"` | Style visuel du dialogue                          |
| `size`        | `"sm" \| "md" \| "lg"`                    | Taille du dialogue                                |
| `style`       | `"default" \| "centered"`                 | Alignement du contenu                             |
| `confirmText` | `string`                                  | Texte que l'utilisateur doit taper pour confirmer |
| `action`      | `DialogAction`                            | Configuration du bouton d'action                  |
| `cancel`      | `DialogCancel`                            | Configuration du bouton d'annulation              |

### Confirmation avec saisie de texte

Pour les actions critiques, tu peux demander à l'utilisateur de taper un texte pour confirmer :

```tsx
dialogManager.confirm({
  title: "Supprimer l'organisation",
  description: "Cette action est irréversible.",
  confirmText: "DELETE",
  action: {
    label: "Supprimer",
    variant: "destructive",
    onClick: async () => {
      await deleteOrganization();
    },
  },
});
```

L'utilisateur devra taper exactement "DELETE" pour activer le bouton de confirmation.

## Input Dialog

Pour demander une saisie à l'utilisateur :

```tsx
dialogManager.input({
  title: "Renommer l'élément",
  description: "Entre un nouveau nom pour cet élément.",
  input: {
    label: "Nom",
    defaultValue: currentName,
    placeholder: "Entre un nom...",
  },
  action: {
    label: "Sauvegarder",
    onClick: async (inputValue) => {
      await renameItem(id, inputValue);
      toast.success("Élément renommé.");
    },
  },
});
```

### Options Input Dialog

| Option  | Type          | Description                      |
| ------- | ------------- | -------------------------------- |
| `input` | `InputConfig` | Configuration du champ de saisie |

**InputConfig :**

| Option         | Type     | Description          |
| -------------- | -------- | -------------------- |
| `label`        | `string` | Label du champ       |
| `defaultValue` | `string` | Valeur par défaut    |
| `placeholder`  | `string` | Placeholder du champ |

## Custom Dialog

Pour des dialogues avec un contenu entièrement personnalisé :

```tsx
import { AlertDialogCancel } from "@/components/ui/alert-dialog";

dialogManager.custom({
  title: "Dialogue personnalisé",
  size: "lg",
  children: (
    <div className="flex flex-col gap-4">
      <p>Contenu personnalisé ici</p>
      <AlertDialogCancel>Fermer</AlertDialogCancel>
    </div>
  ),
});
```

**Important :** Ajoute le composant `AlertDialogCancel` ou utilise `dialogManager.closeAll()` pour permettre à l'utilisateur de fermer le dialogue.

## Fermer les dialogues

```tsx
// Fermer un dialogue spécifique par son ID
const dialogId = dialogManager.confirm({ ... });
dialogManager.close(dialogId);

// Fermer tous les dialogues
dialogManager.closeAll();
```

## Gestion automatique du loading

Les boutons d'action affichent automatiquement un état de chargement pendant l'exécution de la promesse `onClick`. Aucune gestion manuelle du loading n'est nécessaire.

```tsx
dialogManager.confirm({
  title: "Enregistrer",
  action: {
    label: "Sauvegarder",
    onClick: async () => {
      // Le bouton affiche un spinner pendant cette opération
      await saveData();
      // Le dialogue se ferme automatiquement après succès
    },
  },
});
```

Si une erreur est levée dans `onClick`, le dialogue reste ouvert et un toast d'erreur s'affiche.

## Exemple complet avec icône et style centré

```tsx
import { Trash2 } from "lucide-react";

dialogManager.confirm({
  title: "Supprimer le fichier",
  description: "Cette action supprimera définitivement le fichier.",
  icon: Trash2,
  variant: "destructive",
  style: "centered",
  action: {
    label: "Supprimer",
    variant: "destructive",
    onClick: async () => {
      await deleteFile(fileId);
      toast.success("Fichier supprimé.");
    },
  },
  cancel: {
    label: "Annuler",
  },
});
```
