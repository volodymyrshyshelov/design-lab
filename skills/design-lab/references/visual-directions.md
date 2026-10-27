# Internal design methods

Choose references by the actual design task. They are preserved resources within one skill, not a checklist to load in full.

- For a new direction, read [Frontend Design](vendor/frontend-design/GUIDE.md) and the relevant [Taste app-screen guidance](vendor/taste-skill/references/app-screens.md) or Taste public-page guidance. Define a product-specific composition and a clear typography/palette/spacing system before expanding screens.
- For hierarchy, forms, responsive behavior, motion or observed visual defects, read the relevant part of [Impeccable](vendor/impeccable/GUIDE.md) and its linked references. Use the actual screenshots as evidence. The upstream engine and hooks are optional helpers; this package does not enable hooks or request an additional model account.
- For targeted UX or stack questions, search [UI UX Pro Max](vendor/ui-ux-pro-max/GUIDE.md) using the bundled-path command in [runtime.md](runtime.md#bundled-method-commands). Its upstream host environment examples do not apply to this package. Check the returned product classification against the brief; apply relevant findings rather than importing unrelated sections.
- For React work, consult [React Best Practices](vendor/react-best-practices/GUIDE.md) and [Composition Patterns](vendor/composition-patterns/GUIDE.md) when component/state structure needs them.
- For interface review, use [Web Design Guidelines](vendor/web-design-guidelines/GUIDE.md). A live external reference needs an available network tool; describe the reviewed local scope if it cannot be fetched.

For multiple directions, establish differences beyond hue: a top navigation versus a rail, compact queues versus grouped cards, geometric versus editorial typography, different information ordering or spatial rhythm. Keep the user's task readable in every direction. Respect reduced motion, keyboard focus and device constraints.

The neutral starter demonstrates three compositions; it is not the required aesthetic for every product. Its components include an adapted shadcn Button, Radix mobile dialog and Magic UI BlurFade/NumberTicker with local fonts and licenses. Add components from the pinned local MCP registries when useful. Use restrained animations that communicate a transition, not decoration that delays work.

Use host Image Gen for raster assets when available and beneficial. Keep provenance and local assets. Otherwise use code-native layout, SVG or supplied assets; do not assume a paid external generator or another person's credentials.
