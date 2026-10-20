/**
 * Pure input tests for `timeline-interactions.js`, split out so a test can
 * import them: that module wires the page as soon as it loads.
 *
 * @module timeline/timeline-input-guards
 */

/**
 * True for the keys that activate a focused dot, as a native button does.
 *
 * @param {string} key - `KeyboardEvent.key`
 * @returns {boolean}
 */
export function isActivationKey(key) {
  return key === "Enter" || key === " ";
}

/**
 * True when a pointer event comes from a real mouse. A tap makes the browser
 * fire compatibility mouse events after the touch; the pointer events keep
 * their `touch` type, so only they can tell the two apart. The tooltip uses
 * this guard so a tap opens the detail panel and never leaves a tooltip behind.
 *
 * @param {{pointerType?: string}} e - a `pointerover`, `pointerout` or `pointermove` event
 * @returns {boolean}
 */
export function isMousePointer(e) {
  return e.pointerType === "mouse";
}
