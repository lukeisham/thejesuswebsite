import { html } from "./templates.js";

/**
 * Build the <li> markup for an article's footnote list.
 *
 * Each item is <li id="fn-N"> where N is the footnote's 1-based list position,
 * the target of the [fn:N] marker links that content-markers.js builds. The
 * return link points at id="fnref-N", which content-markers.js puts on the
 * first marker for each N. A footnote that no marker cites gets no return
 * link, so a reader never meets a dead link. Called by essay-detail.js,
 * response-detail.js and historiography-detail.js after the body renders; the
 * lookup runs against the rendered body, so call it after `$body.innerHTML` is
 * set.
 *
 * @param {Array<{content: string}>} footnotes - Footnotes in list order.
 * @param {{querySelector: function(string): ?object}} root - The rendered body element.
 * @returns {string} Safe HTML for the inside of an <ol>.
 */
export function footnoteListHTML(footnotes, root) {
  return footnotes
    .map((footnote, i) => {
      const n = i + 1;
      const cited = root && root.querySelector(`#fnref-${n}`);
      const backLink = cited
        ? html` <a class="footnote-backref" href="#fnref-${n}" aria-label="Back to text">↩</a>`
        : "";
      return html`<li id="fn-${n}">${footnote.content}${backLink}</li>`;
    })
    .join("");
}
