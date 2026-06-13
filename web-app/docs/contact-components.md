# Contact Components

Notre application vient avec deux composants qui permettent de te contacter.

## ContactSupportDialog

Ce composant affiche une modal avec un formulaire pour contacter le support.

### Champs du formulaire

- **email** - Affiché uniquement si l'utilisateur n'est pas connecté
- **subject** - Le sujet du message
- **message** - Le contenu du message

### Utilisation basique

```jsx
<ContactSupportDialog />
```

Par défaut, un bouton avec le texte "Contact support" s'affiche.

### Utilisation personnalisée

Tu peux personnaliser le bouton ou la zone déclencheur en passant du contenu enfant :

```tsx
<ContactSupportDialog>
  <button>Besoin d'aide ?</button>
</ContactSupportDialog>
```

### Comportement

- Quand le formulaire est soumis, un email est envoyé à l'adresse définie dans la variable d'environnement `NEXT_PUBLIC_EMAIL_CONTACT`
- Un toast "Your message has been sent." s'affiche en cas de succès
- En cas d'erreur, un toast d'erreur s'affiche
- La modal se ferme automatiquement après un envoi réussi

## ContactFeedbackPopover

Ce composant affiche un bouton qui ouvre une popover permettant aux utilisateurs de donner rapidement un avis sur l'application.

### Champs du formulaire

- **email** - Affiché uniquement si l'utilisateur n'est pas connecté
- **message** - Le contenu du feedback
- **review** - Un système de notation avec 4 émojis :
  - 😠 (1) - Extrêmement insatisfait
  - 😞 (2) - Plutôt insatisfait
  - 😐 (3) - Neutre
  - 😊 (4) - Satisfait

### Utilisation basique

```jsx
<ContactFeedbackPopover />
```

Par défaut, un bouton avec le texte "Feedback" s'affiche.

### Utilisation personnalisée

Tu peux personnaliser le bouton ou la zone déclencheur en passant du contenu enfant :

```tsx
<ContactFeedbackPopover>
  <button>Donne nous ton avis</button>
</ContactFeedbackPopover>
```

### Comportement

- La popover se ferme automatiquement après un envoi réussi
- Un toast "Your feedback has been sent! Thanks you." s'affiche en cas de succès
- En cas d'erreur, un toast d'erreur s'affiche

## FAQ

### Dans quel cas utiliser ContactSupportDialog ?

ContactSupportDialog est utile quand tu veux permettre aux utilisateurs de te signaler des problèmes ou de poser des questions. Il est déjà utilisé plusieurs fois dans les pages d'erreur pour permettre aux utilisateurs de remonter rapidement un problème.

### Dans quel cas utiliser ContactFeedbackPopover ?

ContactFeedbackPopover est idéal pour collecter rapidement des retours généraux sur l'expérience utilisateur. C'est moins intrusif qu'une modal complète et permet une notation rapide avec les émojis.
