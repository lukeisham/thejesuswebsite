/**
 * Admin bridge for the shared frontend toast component.
 *
 * The toast implementation (frontend/assets/js/utils/toasts.js) is an ES
 * module, but admin scripts are classic scripts that call window.showToast
 * behind a typeof guard. Without this bridge the global is never assigned
 * and every admin toast silently no-ops — so expose it here.
 *
 * The "/assets/" path resolves against frontend/ on both nginx (root is
 * frontend/, /admin/ is an alias) and dev-proxy.js.
 */
import { showToast } from "/assets/js/utils/toasts.js";

window.showToast = showToast;
