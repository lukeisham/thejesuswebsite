# =============================================================================
#   THE JESUS WEBSITE — BROWSER UI/UX TEST SCENARIOS
#   File:    tests/browser_test_skill.md
#   Version: 1.0.0
#   Purpose: Defines the End-to-End QA pathways matching guide_appearance.md.
# =============================================================================

## Scenario 1: Foundation Layout Integrity
**Objective**: Verify the global visual grid and structural CSS components.
1. Navigate to `/index.html`.
2. VERIFY: The global header is sticky and visually spans 100% of the viewport width.
3. VERIFY: The global footer is rendered at the absolute bottom of the DOM.
4. VERIFY: Dark Mode / Light Mode CSS variable injection swaps correctly without screen tearing.

## Scenario 2: Individual Record Layout
**Objective**: Confirm the dense archival single-record view.
1. Navigate to `/record.html?id=tacitus-annals-15-44`.
2. VERIFY: The "Title" block utilizes the `.serif-title` typography token.
3. VERIFY: The `pictures_display.js` module successfully injects a framed image with alt-text.
4. VERIFY: The `sources_biblio_display.js` mounts the MLA citation correctly at the bottom of the page.

## Scenario 3: Ranked Lists Display
**Objective**: Test algorithmic listing components.
1. Navigate to `/frontend/pages/wikipedia.html`.
2. VERIFY: The `list_view_wikipedia.js` dynamically renders list items in descending algorithmic order.
3. VERIFY: Clicking a list item expands the `display_snippet.js` abstract without breaking flexbox constraints.

## Scenario 4: Content/Essay Formatting
**Objective**: Validate human-authored long-form content styling.
1. Navigate to `/context_essay.html`.
2. VERIFY: The layout is single-column, max-width constrained (e.g. `max-width: 800px`) for comfortable reading.
3. VERIFY: Markdown headers (`<h2>`, `<h3>`) trigger correct spacing tokens.

## Scenario 5: Dashboard Authentication Layout
**Objective**: Test administrative entry point.
1. Navigate to `/admin/frontend/admin.html`.
2. VERIFY: Main page canvas is hidden strictly behind the `admin_login` challenge form.
3. VERIFY: Unauthorized navigation immediately loops back to login components.
