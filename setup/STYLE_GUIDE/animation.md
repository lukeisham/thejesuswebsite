_Part of the [Style Guide](INDEX.md) — §6: animation & transitions._

---

## 6. Animation & Transitions

Philosophy: transitions aid perception, never slow the user down. Scholarly content feels stable and deliberate, never playful.

### Tokens

Defined in `frontend/assets/css/base/variables.css`.

| Token | Value | Use for |
|---|---|---|
| `--duration-fast` | 150ms | Hover states, button feedback, zoom buttons, tooltips |
| `--duration-base` | 250ms | Sidebar, toasts in, collapsible panels |
| `--duration-slow` | 400ms | Skeleton → content fade |
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Elements entering |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Toggles, drawers (smooth both ways) |

Never use bouncy or spring easings. Never use `linear` for a one-shot transition. The infinite loading spinner (`spin`, 1s) is the one `linear` animation.

### Rules

- Card hover: `translateY(-2px)` and `--shadow-card-hover`, `--duration-fast` / `--ease-out`. Button hover: `translateY(-1px)`.
- Any modal opens with the `fade-in-scale` keyframe (opacity `0 → 1`, scale `0.97 → 1`) over `--duration-base`.
- Skeleton → content: `fade-in` over `--duration-slow`. The skeleton itself shimmers for `1.5s`.
- Toast: slides up `12px` while fading in (`--duration-base`). It fades out over `--duration-fast`.
- Wikipedia grid tooltip: `translateY(4px) → 0` with opacity `0 → 1`, `--duration-fast` / `--ease-out`. It shows on pointer devices only (§9.1).
- Timeline, Map and Arbor tooltips appear without motion after a hover delay: 200ms (Timeline, Map) and 300ms (Arbor).
- Timeline and Arbor zoom buttons, and Timeline era-chip jumps, move the canvas with `--duration-fast` / `--ease-out`. Drag-pan has no transition.
- Do not animate text. Animate `transform` and `opacity`. The sidebar's `margin-left` shift on `main` and the footer is the one layout transition.
- Reduced motion: `animations.css` holds one global `@media (prefers-reduced-motion: reduce)` rule. It sets `animation-duration` and `transition-duration` to `0.01ms !important`. Components add no reduced-motion rule of their own. Every page that sets a duration must load `animations.css`. D-021 allows the `!important` (CSS-5). All animation specs in this guide fall under this rule.
