/**
 * widget_event_bus.js
 * Shared event dispatch helper for all widgets.
 * Import this in every WRAPPER widget that needs to notify the agent.
 *
 * Ref: agent_guide.yml §3 — wrapper widgets absorb their detail scripts.
 */

/**
 * Dispatch a widget summary event on the window.
 * @param {string} widgetId   — the wrapper card ID, e.g. 'wgt-security'
 * @param {string} eventName  — e.g. 'SecurityAlertEvent'
 * @param {object} summary    — plain JS object with the key data
 */
export function dispatchWidgetEvent(widgetId, eventName, summary) {
    window.dispatchEvent(new CustomEvent(eventName, {
        detail: {
            widget: widgetId,
            timestamp: new Date().toISOString(),
            ...summary
        }
    }));
}
