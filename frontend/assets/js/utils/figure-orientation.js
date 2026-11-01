/**
 * Orientation resolution for `.figure-standard` figures.
 *
 * The CSS width/max-height pair on `.figure-standard img` already sizes
 * portrait and landscape images correctly with no JS (see figures.css).
 * This util stamps an explicit `figure--portrait` / `figure--landscape` /
 * `figure--square` class on the parent `<figure>` so the mobile `70vh`
 * portrait rule and portrait centring can target it directly.
 *
 * Called by evidence-detail.js and the [figure] renderers. The width and height
 * that classify() leaves or writes on the tag are the box that figures.css
 * reserves before load: change one, check the other
 * (setup/ARCHITECTURE/image-display.md, Invariants row 1).
 *
 * @module utils/figure-orientation
 */

/**
 * Resolve orientation from intrinsic dimensions. A square image counts as
 * "portrait" for sizing purposes — at the standard box width it would
 * violate the height cap, so it is height-bound exactly like a portrait.
 *
 * @param {number} width
 * @param {number} height
 * @returns {"portrait"|"landscape"|"square"}
 */
export function resolveOrientation(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "portrait";
  }
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

export function classify(img) {
  const fig = img.closest("figure.figure-standard");
  if (!fig) return;

  fig.classList.remove("figure--portrait", "figure--landscape", "figure--square");
  const orientation = resolveOrientation(img.naturalWidth, img.naturalHeight);
  fig.classList.add(`figure--${orientation}`);

  // A guessed size (inline [figure] pictures start at 720x480) is replaced by
  // the loaded size so fit-content sizing resolves to the real picture. A
  // stored size (data-stored-size, set by evidence-detail.js) is the true
  // shape and stays: a srcset image reports a smaller density-adjusted
  // natural size, and overwriting would change the box the page reserved.
  if (!img.hasAttribute("data-stored-size") && img.naturalWidth > 0 && img.naturalHeight > 0) {
    img.setAttribute("width", img.naturalWidth);
    img.setAttribute("height", img.naturalHeight);
  }
}

/**
 * Classify every `figure.figure-standard img` inside `container` by
 * orientation. Images already loaded (`img.complete`) are classified
 * immediately; images still loading get a one-shot `load` listener that
 * removes itself once it fires.
 *
 * @param {Element} container
 */
export function applyFigureOrientation(container) {
  if (!(container instanceof Element)) return;

  const images = container.querySelectorAll("figure.figure-standard img");

  images.forEach((img) => {
    if (img.complete) {
      classify(img);
      return;
    }

    const onLoad = () => {
      img.removeEventListener("load", onLoad);
      classify(img);
    };
    img.addEventListener("load", onLoad);
  });
}
