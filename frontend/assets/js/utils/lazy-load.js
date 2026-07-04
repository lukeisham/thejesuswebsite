/**
 * Lazy-loading utility using IntersectionObserver.
 *
 * Swaps `data-src` → `src`, `data-srcset` → `srcset` on images, and fires
 * callbacks for heavy sections.
 *
 * @module utils/lazy-load
 */

const DEFAULT_ROOT_MARGIN = '200px';
const DEFAULT_THRESHOLD = 0;

/**
 * Initialise lazy-loading for images and optional heavy sections.
 *
 * @param {Object} [options]
 * @param {string} [options.imageSelector='img[data-src]'] - Selector for lazy images.
 * @param {string} [options.sectionSelector] - Optional selector for heavy section elements.
 * @param {Function} [options.onSectionVisible] - Called with the element when a section becomes visible.
 * @param {string} [options.rootMargin='200px'] - IntersectionObserver rootMargin.
 * @returns {Function} Teardown function that disconnects the observer.
 */
export function initLazyLoad({
  imageSelector = 'img[data-src]',
  sectionSelector,
  onSectionVisible,
  rootMargin = DEFAULT_ROOT_MARGIN,
} = {}) {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: load everything immediately
    document.querySelectorAll(imageSelector).forEach((img) => loadImage(img));
    if (sectionSelector) {
      document.querySelectorAll(sectionSelector).forEach((el) => {
        if (onSectionVisible) onSectionVisible(el);
      });
    }
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;

        if (el.matches(imageSelector)) {
          loadImage(el);
          observer.unobserve(el);
        }

        if (sectionSelector && el.matches(sectionSelector)) {
          if (onSectionVisible) onSectionVisible(el);
          observer.unobserve(el);
        }
      });
    },
    { rootMargin, threshold: DEFAULT_THRESHOLD }
  );

  // Observe existing elements
  document.querySelectorAll(imageSelector).forEach((img) => observer.observe(img));
  if (sectionSelector) {
    document.querySelectorAll(sectionSelector).forEach((el) => observer.observe(el));
  }

  // Observe dynamically added elements
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(imageSelector)) {
          observer.observe(node);
        }
        if (sectionSelector && node.matches(sectionSelector)) {
          observer.observe(node);
        }
        // Check children
        node.querySelectorAll?.(imageSelector)?.forEach((img) => observer.observe(img));
        if (sectionSelector) {
          node.querySelectorAll?.(sectionSelector)?.forEach((el) => observer.observe(el));
        }
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    mutationObserver.disconnect();
  };
}

/**
 * Swap data attributes to src/srcset on a single image element.
 *
 * @param {HTMLImageElement} img
 */
function loadImage(img) {
  if (img.dataset.src) {
    img.src = img.dataset.src;
    delete img.dataset.src;
  }
  if (img.dataset.srcset) {
    img.srcset = img.dataset.srcset;
    delete img.dataset.srcset;
  }
}
