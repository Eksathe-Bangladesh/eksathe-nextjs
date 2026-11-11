# shadcn/ui Migration Guide

This guide tracks custom UI that can use the project's existing shadcn Base UI
components. The project uses `base-nova`, Tailwind CSS v4, Lucide icons, and the
`@/components/ui` alias. Prefer existing components before adding registry items.

## Migration status

- [x] Install shadcn `Empty` and `Alert` components.
- [x] Replace duplicate empty-state markup in account, admin, agriculture,
      construction, marketplace, project, and provider workspaces with the shared
      shadcn-based `EmptyState`.
- [x] Use shadcn `Alert` for workflow feedback and workspace errors.
- [x] Replace 15 custom textareas in component forms with the installed
      shadcn `Textarea`.
- [x] Replace provider application capability checkboxes with shadcn
      `Checkbox` and field composition.
- [x] Migrate the commerce order-detail invoice table to shadcn `Table`.
- [ ] Migrate the remaining auth and agriculture field helpers, which have
      generated IDs or custom help/error handling.
- [x] Replace 10 repeated simple field wrappers with a shared shadcn `Field`
      composition in `src/components/forms/form-field.tsx`.
- [ ] Replace raw `<textarea>` controls with the existing `Textarea` component.
- [ ] Standardize one-off commerce route controls on existing `Input`,
      `Textarea`, `NativeSelect`, `Checkbox`, and `Button` components.
- [ ] Migrate the account menu, district combobox, pagination, and language
      selector to shadcn interactive primitives.
- [ ] Evaluate optional chat-message and expandable-panel migrations.

## Prioritized candidates

### 1. Shared empty states and feedback

Completed in this first pass:

- Empty states in `src/components/account/account-workspace.tsx`,
  `src/components/admin/admin-workspace.tsx`,
  `src/components/agriculture/agriculture-public-information-page.tsx`,
  `src/components/projects/project-detail.tsx`, and
  `src/components/provider/provider-workspace.tsx` now use
  `src/components/workflows/empty-state.tsx`, built from shadcn `Empty`.
- `src/components/workflows/action-feedback.tsx` and
  `src/components/workflows/workspace-error.tsx` now compose shadcn `Alert`.

The remaining `border-dashed` match is the shadcn Empty component's own styling.

Keep empty results distinct from data-loading errors. Preserve `role="alert"`
for errors and `role="status"` for successful action feedback.

### 2. Form fields and raw controls

The codebase has local `Field` helpers in:

- `src/components/account/account-workspace.tsx`
- `src/components/admin/admin-workspace.tsx`
- `src/components/admin/agriculture-requests-queue.tsx`
- `src/components/agriculture/service-request-form.tsx`
- `src/components/auth/auth-panel.tsx`
- `src/components/projects/project-forms.tsx`
- `src/components/provider/listing-edit-form.tsx`
- `src/components/provider/listing-form.tsx`
- `src/components/provider/provider-application-form.tsx`
- `src/components/provider/provider-verification-form.tsx`
- `src/components/provider/storefront-form.tsx`
- `src/components/workflows/order-card.tsx`

Replace wrapper markup with the installed shadcn field family. Retain stable
control IDs, labels, validation, descriptions, form names, and server-action
semantics. Mark invalid fields with `data-invalid` on `Field` and
`aria-invalid` on the input. Use `FieldSet` and `FieldLegend` to group related
checkboxes or radios.

Hand-styled textareas in the projects, admin verification, provider, listing
request, and order components now use the existing `Textarea`. Preserve `rows`,
`maxLength`, `required`, and submitted names when migrating other textarea
instances. Keep hidden inputs native.

### 3. Commerce pages

The commerce routes contain a high concentration of one-off forms and controls.
Migrate a route at a time, starting with:

- `src/app/[locale]/dashboard/ecommerce/page.tsx`
- `src/app/[locale]/dashboard/ecommerce/cart/page.tsx`
- `src/app/[locale]/dashboard/ecommerce/seller/page.tsx`
- `src/app/[locale]/dashboard/ecommerce/wholesale/page.tsx`
- `src/app/[locale]/dashboard/ecommerce/products/[productId]/page.tsx`
- `src/app/[locale]/dashboard/ecommerce/orders/[orderId]/page.tsx`
- `src/app/[locale]/admin/ecommerce/page.tsx`

Use existing `Input`, `Textarea`, `NativeSelect`, `Button`, and `Card`.
The order-detail item table now uses shadcn `Table`; prefer it over a
client-side data table when no sorting/filtering is needed.
Preserve server components, server actions, authorization, hidden form fields,
and print behavior.

### 4. Interactive primitives

| Existing UI                                                     | Candidate                | Notes                                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/site-header.tsx` account menu                   | `DropdownMenu`           | Preserve permission-gated items, localized links, sign-out form and loading state. Remove manual outside-click handling only after keyboard/focus behavior is verified. |
| `src/components/forms/district-combobox.tsx`                    | shadcn Base `Combobox`   | Keep the domain wrapper, Bangla/English filtering, canonical submitted values, defaults and optional empty choice.                                                      |
| `src/components/marketplace/marketplace-view.tsx` pagination    | `Pagination` family      | Keep query construction and use `@/i18n/navigation` links. Preserve localized labels and disabled behavior.                                                             |
| `src/components/marketplace/marketplace-filters.tsx` icon input | `InputGroup`             | Use `InputGroupInput` and `InputGroupAddon`; do not place raw `Input` inside `InputGroup`.                                                                              |
| `src/components/language-toggle.tsx`                            | `ToggleGroup`            | Preserve locale routing, cookie update, query string and pending state. Keep one selected locale.                                                                       |
| `src/components/site-header.tsx` mobile navigation              | `Collapsible` or `Sheet` | A `Sheet` changes interaction semantics; use only if modal navigation is intended. Include a sheet title.                                                               |
| Native `<details>` panels                                       | `Collapsible`            | Optional; native disclosure is already accessible. Check that hidden form values are not reset.                                                                         |

The dashboard “tabs” are route links, not tab panels. Keep navigation/link
semantics rather than converting `src/components/dashboard/dashboard-tabs.tsx`
to `Tabs`.

### 5. Chat UI (optional)

`src/app/[locale]/dashboard/ecommerce/messages/[conversationId]/page.tsx`
has hand-built message bubbles and a textarea composer. Consider shadcn
`Message`/`Bubble` with `Textarea` and `Button`. Adopt `MessageScroller` only if
its client-side scroll behavior is needed and verified against this page's
server-rendered conversation history.

## Components to keep

- `src/components/workflows/status-badge.tsx` already wraps shadcn `Badge` and
  centralizes translated business statuses.
- `src/components/ui/date-picker.tsx` already composes shadcn `Button`,
  `Calendar`, and `Popover`.
- `src/components/skeletons/page-skeletons.tsx` already builds route-specific
  layouts from shadcn `Skeleton`.
- Domain forms, calculators, workspace navigation, and business logic should
  remain domain components. Replace their generic controls, not their behavior.

## Implementation and verification

- Use `bunx --bun shadcn@latest` for shadcn CLI commands.
- Check installed components before adding; do not switch the Base UI preset.
- Read the component docs and generated files before use. Base UI compositions
  use `render`, not Radix `asChild` examples.
- Keep interactive state in small client components; leave data fetching and
  authorization on the server.
- Keep English and Bangla message keys aligned when adding or changing copy.
- Run `bun run typecheck`, `bun run lint:check`, and `bun run fmt:check`, plus
  relevant tests. Refresh `graphify-out/graph.json` after implementation.
