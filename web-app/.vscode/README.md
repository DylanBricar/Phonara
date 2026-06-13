# VSCode Snippets

This folder contains custom VSCode snippets for Next.js development.

## Page & Layout Snippets

**Route Path Auto-Detection** - `npag`, `npagl`, `nlay` automatically generate the correct route path based on file location.

### How it works

The regex pattern `^app\/(?:\([^)]+\)\/)*(.*)\/. +$` transforms file paths:

```
app/(layout)/posts/page.tsx           → /posts
app/(logged-in)/account/email/page.tsx → /account/email
app/orgs/[orgSlug]/settings/page.tsx  → /orgs/[orgSlug]/settings
```

**Pattern breakdown:**

- `^app\/` - Matches `app/` at the start
- `(?:\([^)]+\)\/)*` - Skips route groups like `(layout)/`, `(logged-in)/`
- `(.*)` - Captures the actual route path
- `\/.+$` - Matches the filename (like `/page.tsx`)

**Replacement:** `\\/$1` adds a leading `/` to the captured route path.

This leverages Next.js's auto-generated `PageProps` and `LayoutProps` types from `.next/types/routes.d.ts`.

## Component Snippets

**PascalCase Auto-Detection** - All component snippets automatically convert filename to PascalCase:

- `com` - Basic component
- `comp` - Component with props
- `comc` - Component with children props
- `comb` - Component with base props (children, className)
- `coms` - Server component (async)

### Examples

```
toggle-email-checkbox.tsx → ToggleEmailCheckbox
user-profile.tsx          → UserProfile
my-component.tsx          → MyComponent
```

Uses VSCode's built-in `/pascalcase` formatter: `TM_FILENAME_BASE/(.*)/${1:/pascalcase}/`

## API Route Snippets

- `napig` - GET API route with TanStack Start (`createAPIFileRoute`)
- `napip` - POST API route with TanStack Start + body validation (`createAPIFileRoute`)

Both snippets use the `createAPIFileRoute` from `@tanstack/react-start/api` and `handleApiError` from `@/lib/api-middleware.ts` which provide:

- Automatic error handling
- Zod schema validation
- Type-safe request/response
- Built-in middleware support
