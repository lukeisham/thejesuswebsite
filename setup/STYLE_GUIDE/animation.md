_Part of the [Style Guide](INDEX.md) — §6: animation & transitions._

---

## 6. Animation & Transitions

Philosophy: transitions aid perception, never slow the user down. Scholarly content should feel stable and deliberate, not playful.

### Tokens

| Token | Value | Use for |
|---|---|---|
| `--duration-fast` | 150ms | Hover states, button feedback, icon swaps |
| `--duration-base` | 250ms | Modals, drawers, card hover lift |
| `--duration-slow` | 400ms | Page-level fades, skeleton → content |
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Elements entering |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Toggles, drawers (smooth both ways) |

Never use `linear` or bouncy/spring easings for UI transitions.

### Rules

- Card hover lift: `translateY(-2px)`, `--duration-fast` / `--ease-out`.
- Modal open: fade-in + scale `0.97 → 1`, `--duration-base`.
- Skeleton → content: opacity fade, `--duration-slow`.
- Tooltip: `translateY(4px) → 0` with opacity `0 → 1`, `--duration-fast` / `--ease-out`. It shows on pointer devices only (§9.1).
- Never animate text or layout reflows (jank).
- Reduced motion — one global rule, with no per-component copies. All animation specs in this guide are subject to it. The `!important` is covered by CSS-5:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
