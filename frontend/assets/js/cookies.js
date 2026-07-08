/**
 * Cookie consent banner and preference management.
 * Persists consent choice in localStorage via the storage util.
 *
 * @module cookies
 */

import { get, set } from './utils/storage.js';

const CONSENT_KEY = 'cookie_consent';
const SESSION_SEEN_KEY = 'cookie_consent_seen';

/**
 * Whether the banner has already been shown once this tab session
 * (set on the visitor's landing page, so it doesn't reappear on every
 * subsequent page navigation).
 */
function hasSeenThisSession() {
  try {
    return sessionStorage.getItem(SESSION_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeenThisSession() {
  try {
    sessionStorage.setItem(SESSION_SEEN_KEY, '1');
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — banner will
    // simply show again on the next page, which is an acceptable fallback.
  }
}

/**
 * Show the cookie consent banner if the user hasn't made a choice yet
 * and hasn't already dismissed it (by navigating onward) this session.
 */
export function showConsentBanner() {
  if (getConsent() !== null) return;
  if (hasSeenThisSession()) return;

  markSeenThisSession();

  const banner = document.createElement('div');
  banner.className = 'cookie-consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie consent');

  banner.innerHTML = `
    <p class="cookie-consent__text">
      Notice for European users as per
      <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058" target="_blank" rel="noopener noreferrer">2002/58/EC</a>,
      <a href="https://www.legislation.gov.uk/uksi/2003/2426/contents/made" target="_blank" rel="noopener noreferrer">UK PECR</a>
      and
      <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679" target="_blank" rel="noopener noreferrer">GDPR</a>;
      this site uses local analytical cookies only, no external tracking or
      advertising. By continuing, you accept our use of cookies.
    </p>
    <div class="cookie-consent__actions">
      <button class="cookie-consent__accept btn btn--primary btn--sm">Accept</button>
      <button class="cookie-consent__decline btn btn--secondary btn--sm">Decline</button>
    </div>
  `;

  banner.querySelector('.cookie-consent__accept').addEventListener('click', () => {
    setConsent(true);
    banner.remove();
  });

  banner.querySelector('.cookie-consent__decline').addEventListener('click', () => {
    setConsent(false);
    banner.remove();
  });

  document.body.appendChild(banner);
}

/**
 * Get the current consent value from localStorage.
 *
 * @returns {boolean|null} `true` if accepted, `false` if declined, `null` if no choice.
 */
export function getConsent() {
  const value = get(CONSENT_KEY);
  if (value === null) return null;
  return Boolean(value);
}

/**
 * Persist the user's consent choice.
 *
 * @param {boolean} accepted
 */
export function setConsent(accepted) {
  set(CONSENT_KEY, Boolean(accepted));
}

/**
 * Delete a cookie by name (sets max-age to 0).
 *
 * @param {string} name
 */
export function deleteCookie(name) {
  if (typeof name !== 'string' || name.length === 0) return;
  document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/; SameSite=Lax`;
}
