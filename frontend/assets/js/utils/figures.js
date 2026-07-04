/**
 * Figure numbering utility.
 *
 * Queries all `<figure>` elements inside a container and injects sequential
 * `Fig. N` labels into each `<figcaption>`. Must be called on initial page load
 * and after each infinite-scroll batch insert.
 *
 * @module utils/figures
 */

/**
 * Number all `<figure>` elements inside `container` sequentially.
 * Prefixes each `<figcaption>` with "Fig. N" and resets numbering per call.
 *
 * @param {Element} container - The DOM element containing figures to number.
 *
 * @example
 * numberFigures(document.getElementById('card-grid'));
 */
export function numberFigures(container) {
  if (!(container instanceof Element)) return;

  const figures = container.querySelectorAll('figure');
  let count = 0;

  figures.forEach((fig) => {
    count++;
    const caption = fig.querySelector('figcaption');
    if (!caption) return;

    // Remove any existing "Fig. N" prefix to avoid duplication on re-runs
    const existingPrefix = caption.querySelector('.fig-number');
    if (existingPrefix) existingPrefix.remove();

    const prefix = document.createElement('span');
    prefix.className = 'fig-number';
    prefix.textContent = `Fig. ${count}. `;

    caption.prepend(prefix);
  });
}
