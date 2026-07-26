/**
 * Orientation resolution for `.figure-standard` figures.
 *
 * The CSS width/max-height pair on `.figure-standard img` already sizes
 * portrait and landscape images correctly with no JS (see figures.css).
 * This util stamps an explicit `figure--portrait` / `figure--landscape` /
 * `figure--square` class on the parent `<figure>` so the mobile `70vh`
 * portrait rule and portrait centring can target it directly.
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

function classify(img) {
  const fig = img.closest("figure.figure-standard");
  if (!fig) return;

  fig.classList.remove("figure--portrait", "figure--landscape", "figure--square");
  const orientation = resolveOrientation(img.naturalWidth, img.naturalHeight);
  fig.classList.add(`figure--${orientation}`);
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
