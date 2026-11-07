# React Bits components used by the home page

Source: <https://github.com/DavidHDev/react-bits>
Upstream commit: `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4` (2026-10-31)
License: **MIT + Commons Clause License Condition v1.0**, Copyright (c) 2026 David Haz

The Commons Clause restricts selling, sublicensing or redistributing the
components themselves (including bundled or ported versions). They are used here
as part of this site's UI. Keep the upstream copyright and this notice when
redistributing this page's code. Site icons and favicons belong to their
respective sites.

| File | Upstream | Used for |
| --- | --- | --- |
| `SpotlightCard.tsx` / `.css` | `src/content/Components/SpotlightCard` | Website cards |
| `PillNav.tsx` / `.css` | `src/content/Components/PillNav` | Mobile category navigation |
| `LineSidebar.tsx` / `.css` | `src/content/Components/LineSidebar` | Desktop category sidebar |
| `AnimatedContent.tsx` | `src/content/Animations/AnimatedContent` | Hero and group entrance |

## Adaptations made in this repository

- **Typed props.** All four components were ported from JSX to TypeScript. No
  visual or motion logic was rewritten.
- **SpotlightCard** keeps the upstream pointer / focus / IntersectionObserver
  implementation. The page passes `proximity={0}`; with 147 real sites the
  upstream 24px proximity would wake every card's rAF loop on each pointer move.
  Cards still glow while hovered or keyboard-focused.
- **PillNav** renders semantic `<a>` links and keeps the upstream engine. The
  pluggable `linkComponent` prop was dropped because the app only needs anchors.
  Layout effects use an isomorphic wrapper to avoid React's SSR
  `useLayoutEffect` warning. Category rows use native horizontal scrolling
  (32 real categories do not fit evenly, unlike the five examples in the design).
- **LineSidebar** keeps the upstream rAF proximity effect. Item centres are
  measured with `getBoundingClientRect` relative to the list instead of
  `offsetTop`, so proximity still matches the pointer when the desktop sidebar
  scrolls inside its own container. The controlled `active` prop and semantic
  links were already present in the hand-off source.
- **AnimatedContent** registers `ScrollTrigger` only in the browser and uses the
  upstream GSAP logic. The page uses `animateOpacity={false}` plus a subtle
  scale so off-screen content is never permanently transparent, and applies
  `once` so ScrollTriggers dispose after the entrance.
- **Reduced motion.** AnimatedContent, PillNav and SpotlightCard check
  `prefers-reduced-motion` upstream. LineSidebar has no built-in check, so the
  page passes `proximityRadius={0}`, `maxShift={0}` and `smoothing={1}`.

## Deliberate exceptions

- Plain HTML is used for the top bar, brand link, theme toggle, admin entry,
  search input, status / empty states and footer, with static layout CSS.
- The desktop back-to-top control, mobile category jump and mobile
  back-to-top use instant scrolling, not a custom animation.
- The admin dashboard is out of scope for this motion migration and still uses
  `framer-motion`, so the dependency stays installed.
