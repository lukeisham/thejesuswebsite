# Dashboard Responsive Layout Fix

## Context
The dashboard (`frontend/private/dashboard.html`) content bleeds off the right side of the screen because its inline `<style>` overrides `.l-page-root` with a fixed 3-column grid (`250px 1fr 1fr`) and no responsive breakpoints. The global `style.css` has responsive breakpoints (1-col mobile, 2-col tablet) but the dashboard inline styles override them entirely. Nested grids inside forms (2-col and 4-col inline grids) also lack responsive fallbacks.

## 1. Introduction & Key Rules

**Vibe Coding Rules (from frontend/readme.md):**
- **HTML/CSS** = Atomic Design, Global consistency, Responsive Flow / CSS Grid for Layout, Flexbox for Components. / Does the page still function?
- **JS** = Strict Interface, Error Translation, Lean Passthrough, Idempotency / One script per task / No loss of functionality during rewrites! / Dashboard widgets follow a two-layer pattern.

**Key Instructions:**
- Only modify `frontend/private/dashboard.html` (the inline `<style>` block, lines 14–142)
- Use CSS Grid for layout, Flexbox for components (per vibe rules)
- Keep the 3-column layout on wide screens (≥1024px), collapse gracefully on tablet/mobile
- Add `overflow: hidden` / `min-width: 0` guards on grid children to prevent bleed
- Do NOT change any JS files or break widget functionality
- Do NOT touch `style.css` — all changes stay in dashboard.html's inline style block

---

## 2. Gemini Flash Tasks (Antigravity) — USER INPUT REQUIRED

Switch to Gemini Flash in Antigravity and complete these bite-sized tasks **one at a time**:

### Task 2.1: Make `.l-page-root` responsive
Replace the fixed 3-column grid with responsive breakpoints in the dashboard's inline `<style>`:
```css
.l-page-root {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    min-height: 100vh;
    gap: 20px;
    padding: 20px;
}
@media (min-width: 768px) {
    .l-page-root {
        grid-template-columns: 250px 1fr;
    }
}
@media (min-width: 1024px) {
    .l-page-root {
        grid-template-columns: 250px 1fr 1fr;
    }
}
```

### Task 2.2: Make header, sidebar, main, and footer grid placements responsive
Update the inline `style` attributes on the structural elements:
- **Header** (line 150–151): Change `grid-column: 1 / -1` — this is fine, keep it
- **Sidebar** (line 165): Remove fixed `grid-column: 1; grid-row: 2;` — let it flow naturally on mobile
- **Main** (line 197): Change `grid-column: 2 / span 2` to flow naturally on mobile, use media query to place it in col 2+ on wider screens
- **Footer**: Ensure it spans full width at all breakpoints

### Task 2.3: Make the Record Detail Form's nested grids responsive
These inline grid divs need `@media` fallbacks or should use CSS classes instead:
- **Line 240**: `grid-template-columns: 1fr 1fr` → stack to `1fr` on mobile
- **Line 281**: `grid-template-columns: 1fr 1fr` → stack to `1fr` on mobile
- **Line 308**: `grid-template-columns: 1fr 1fr` → stack to `1fr` on mobile
- **Line 472**: `grid-template-columns: 1fr 1fr` → stack to `1fr` on mobile
- **Line 506**: `grid-template-columns: 1fr 1fr 1fr 1fr` → stack to `1fr 1fr` on tablet, `1fr` on mobile

**Approach**: Add CSS classes in the `<style>` block (e.g. `.dash-form-grid-2` and `.dash-form-grid-4`) with responsive breakpoints, then replace the inline `style="display: grid; grid-template-columns: ..."` with these classes.

### Task 2.4: Make Row 2 and Row 3 inner grids responsive
- **Line 693** (Cheatsheet + Architecture row): Uses `class="a-grid a-cols-2 a-gap-md"` — this needs a mobile fallback. Add a responsive override in inline styles: at mobile, these should stack to 1 column.
- **Line 723** (Chat + System Feed row): Same treatment — `a-cols-2` should become 1-col on mobile.

### Task 2.5: Add overflow guards
Add to the `<style>` block:
```css
main { min-width: 0; overflow: hidden; }
.dashboard-panel { min-width: 0; overflow: hidden; }
```
This prevents any child content from pushing the grid wider than the viewport.

### Task 2.6: Make the tabs row wrap on small screens
The `.tabs` container (line 108) uses `display: flex` but doesn't wrap. Add `flex-wrap: wrap;` to the `.tabs` rule in the inline style block.

---

## 3. Switch to Sonnet 4.6 — USER INPUT REQUIRED

Change your model to Sonnet 4.6 in Claude Code.

---

## 4. Audit by Sonnet 4.6

Sonnet should:
- Read `frontend/private/dashboard.html`
- Verify all 6 tasks from Step 2 are correctly implemented
- Check that no JS functionality was broken (no removed IDs, no changed element structure)
- Test the CSS logic: confirm breakpoints at 768px and 1024px make sense
- Check for any remaining inline `grid-template-columns` that lack responsive fallbacks
- Fix any issues found

---

## 5. Merge main TO worktree

```bash
git merge main
```
Resolve any conflicts if they arise.

---

## 6. Switch to Opus 4.6 — USER INPUT REQUIRED

Change your model to Opus 4.6 in Claude Code.

---

## 7. Opus 4.6 Tasks (if needed)

Opus reviews for subtle issues that simpler models may miss:
- Verify the bibliography row (`.bib-entry` at line 554) with its `flex` layout doesn't overflow on mobile — the select has a fixed `width: 100px` that may need adjustment
- Check if the chat container's fixed `height: 410px` causes viewport overflow on very small screens
- Verify `box-sizing: border-box` is applied consistently and no element's padding+border exceeds its container
- Any edge cases with the widget grid (`repeat(auto-fill, minmax(140px, 1fr))` at line 767) — this should already be responsive but verify

---

## 8. Switch to Sonnet 4.6 — USER INPUT REQUIRED

Change your model to Sonnet 4.6 in Claude Code.

---

## 9. Final Audit by Sonnet 4.6

- Re-read `frontend/private/dashboard.html`
- Confirm all changes are clean and complete
- Verify the page still loads and functions (all IDs intact, no broken structure)
- Run a final check: no horizontal overflow at any breakpoint (375px, 768px, 1024px, 1440px)

---

## 10. Merge worktree TO main

```bash
git checkout main
git merge claude/festive-nightingale
```

---

## 11. Confirm in sync

```bash
git log --oneline -5  # verify merge commit is present
git diff claude/festive-nightingale  # should show no differences
```

---

## 12. Push main to GitHub

```bash
git push origin main
```
(Do NOT push the worktree branch.)

---

## 13. Pull from server

SSH into the server and pull the latest main:
```bash
ssh <server> "cd /path/to/thejesuswebsite && git pull origin main"
```

---

## 14. Rebuild and User Check — USER INPUT REQUIRED

- Rebuild the project on the server (cargo build / restart service as needed)
- Open the dashboard in a live browser
- Test at multiple viewport widths: phone (~375px), tablet (~768px), desktop (~1024px+)
- Confirm no horizontal scrollbar, all content visible, all tabs/widgets functional

---

## Files to Modify
- `frontend/private/dashboard.html` (inline `<style>` block + some inline `style` attributes on structural elements)

## Verification
- Open dashboard.html locally or via dev server
- Resize browser from 375px to 1440px+ — no horizontal scrollbar at any width
- All tabs (Records, Feed, Essays, Responses, Blogs, Wiki Weights) still switch correctly
- Record detail form fields are all visible and usable at all sizes
- Widget grid reflows naturally
- Chat and System Feed panels stack on mobile
