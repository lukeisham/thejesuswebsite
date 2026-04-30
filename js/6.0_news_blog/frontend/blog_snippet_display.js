// =============================================================================
//
//   THE JESUS WEBSITE — BLOG SNIPPET DISPLAY
//   File:    js/6.0_news_blog/frontend/blog_snippet_display.js
//   Version: 1.1.0
//   Purpose: Renders a small list of latest blog post snippets.
//   Source:  guide_appearance.md §1.3
//
// =============================================================================

// Trigger: DOMContentLoaded -> injectBlogSnippets('latest-blog-content')
// Function: Injects latest blog post headlines and summaries into the
//           specified container element.
// Output: Renders blog snippet list or empty state inside container.

function injectBlogSnippets(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear any loading placeholder
  container.innerHTML = "";

  // Placeholder: Replace with API fetch when public blog endpoint is available.
  // Expected data shape per item:
  //   { slug, title, publish_date, summary }
  //
  // Once the API is wired, replace this empty state with:
  //
  //   fetch('/api/public/blogposts')
  //     .then(r => r.json())
  //     .then(posts => { ... render items ... });
  //
  // For now, show a clean empty state.
  container.innerHTML =
    '<p class="text-sm text-muted">Blog posts coming soon.</p>';
}

document.addEventListener("DOMContentLoaded", () => {
  injectBlogSnippets("latest-blog-content");
});
