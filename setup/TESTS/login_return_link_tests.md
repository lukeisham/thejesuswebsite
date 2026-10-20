# Validation Checklist: Admin Login Return Link

**Feature:** Add "return to frontend website" link on `/admin/auth/login.html`
**Date:** 2026-07-13

## Visual & Styling Tests

- [ ] **Link is visible** — "Return to the website" link appears below the sign-in button/status div inside the `.auth-card`
- [ ] **Link color (rest state)** — text is `--admin-text-secondary` (subtle gray, not primary black)
- [ ] **Link hover effect** — hovering over the link darkens text to `--admin-text-primary` and underlines the link
- [ ] **Link padding & spacing** — spacing between button and link is consistent with design tokens (`--space-*`)
- [ ] **Mobile responsive** — on small screens (375px width), link remains visible and clickable within the card; no layout break
- [ ] **Link styling respects theme** — if dark/light theme toggle exists, link adapts correctly

## Functional Tests

- [ ] **Link href is correct** — inspect the `<a>` tag; `href="/"` (root-relative path)
- [ ] **Link navigates to frontend** — clicking the link navigates to `/` (public site homepage)
- [ ] **No redirect loops** — clicking the link does not cause a redirect loop or unexpected behavior
- [ ] **Keyboard accessible** — link can be reached via Tab key and activated via Enter
- [ ] **No JavaScript errors** — browser console shows no errors when loading the login page

## HTML & CSS Validation

- [ ] **HTML is semantic** — link uses `<a>` tag with meaningful text and href (no empty class divs used as links)
- [ ] **CSS uses custom properties** — all colors, spacing, and other values use `--admin-*` or `--space-*` variables
- [ ] **CSS specificity is low** — `.auth-card__return-link` selector uses only one class, no ID, no `!important`
- [ ] **No hardcoded values** — no inline styles, no rgb/hex colors in CSS
- [ ] **CSS is in login.css** — all styles are contained in `admin/auth/login.css` (max 150 lines total for the file)
- [ ] **No external file dependencies** — the change requires no new imports or new CSS files

## Regression Tests

- [ ] **Sign-in button still works** — clicking the "Sign in with Passkey" button still initiates authentication flow
- [ ] **Status messages still display** — success, error, and loading messages still appear correctly below the button
- [ ] **Signed-out message displays** — visiting with `?signedout=1` still shows "You've been signed out." message
- [ ] **No page layout broken** — the addition of the link does not break the centered card layout or cause overflow
- [ ] **Form structure intact** — the h1, description, button, and status div are all still present and unchanged

## Code Review

- [ ] **No other pages touched** — only `admin/auth/login.html` and `admin/auth/login.css` are modified
- [ ] **No JavaScript added** — the return link requires no inline JS; navigation is handled by the `<a>` tag
- [ ] **No security issues** — the link uses a hardcoded root-relative path; no user input or dynamic href manipulation
- [ ] **Comment is optional** — HTML/CSS changes are self-explanatory; no comment needed

## File Integrity

- [ ] **login.html is valid** — HTML syntax is correct; no unclosed tags or malformed elements
- [ ] **login.css is valid** — CSS syntax is correct; no orphaned selectors or missing closing braces
- [ ] **Whitespace/formatting consistent** — new HTML/CSS follows the existing style of the files (indentation, spacing, etc.)
