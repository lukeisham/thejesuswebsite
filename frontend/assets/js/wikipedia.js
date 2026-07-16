/**
 * Wikipedia ranked list page: fetch ranked Wikipedia articles,
 * render each with rank number, external link + Feather icon,
 * last-revised date, and +/- counts. Infinite scroll.
 *
 * Also renders the "reliability stones" widget per article: a copy-results
 * button, a toggle that expands a stone wall (one stone per reliability
 * signal), and an invisible agent-readable JSON block describing the exact
 * scoring behind the stones.
 *
 * @module wikipedia
 */

import { getWikipediaArticles } from './api.js';
import { html, raw, safeJoin } from './utils/templates.js';
import { showToast } from './utils/toasts.js';
import { delegate } from './utils/dom.js';
import { SIGNAL_DICTIONARY, fulfilmentRatio, buildStatement } from './utils/wikipedia-signals.js';

const SENTINEL_ID = 'scroll-sentinel';
const LIST_ID = 'wikipedia-list';
const LOADING_ID = 'loading-state';
const EMPTY_ID = 'empty-state';
const ERROR_ID = 'error-state';
const END_ID = 'end-of-list';
const RETRY_ID = 'retry-load';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300;

// Stone animation tokens — mirror --duration-fast/--ease-out (variables.css, §6).
const STONE_STAGGER_MS = 30;
const STONE_COLLAPSE_STAGGER_MS = 40;
const STONE_DURATION_MS = 150;
const TIER_OPACITY = [0.32, 0.55, 0.78, 1];
const COPY_SUCCESS_MS = 1500;

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let observer = null;
let retryTeardown = null;
let toggleTeardown = null;
let copyTeardown = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list     = document.getElementById(LIST_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading  = document.getElementById(LOADING_ID);
const $empty    = document.getElementById(EMPTY_ID);
const $error    = document.getElementById(ERROR_ID);
const $end      = document.getElementById(END_ID);
const $retry    = document.getElementById(RETRY_ID);

// ─── State management ────────────────────────────────────────────────────────

function showState(name) {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
  const target = { loading: $loading, empty: $empty, error: $error, end: $end }[name];
  if (target) target.hidden = false;
  if ($sentinel) $sentinel.hidden = name !== 'none';
}

function hideAllStates() {
  [$loading, $empty, $error, $end].forEach((el) => el && (el.hidden = true));
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadPage() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  showState('loading');

  const { data, error } = await getWikipediaArticles();

  isLoading = false;

  if (error) {
    showState('error');
    showToast('Failed to load Wikipedia articles', 'error');
    return;
  }

  if (!data || data.length === 0) {
    if (allItems.length === 0) {
      showState('empty');
    } else {
      hasMore = false;
      $sentinel && ($sentinel.hidden = true);
      showState('end');
      const total = allItems.length;
      if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
    }
    return;
  }

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = data.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
    return;
  }

  allItems = [...allItems, ...pageItems];
  renderArticles(pageItems);

  if (pageItems.length < PAGE_SIZE || start + pageItems.length >= data.length) {
    hasMore = false;
    $sentinel && ($sentinel.hidden = true);
    showState('end');
    const total = allItems.length;
    if ($end) $end.textContent = `All ${total} article${total !== 1 ? 's' : ''} loaded`;
  } else {
    currentPage++;
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    if (observer && $sentinel) observer.observe($sentinel);
  }
}

// ─── Reliability stones: deterministic per-signal look ─────────────────────

/** Deterministic 0..1 pseudo-random value derived from a string (stable per signal key). */
function hashToUnit(str) {
  if (typeof str !== 'string') return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff;
  return h / 0xffff;
}

/** Parses a '#rrggbb'-style hex color into an [r, g, b] triple; falls back to
 *  mid-grey for malformed input so a bad literal degrades a stone's color
 *  instead of breaking the whole widget. */
function hexToRgb(hex) {
  const parts = typeof hex === 'string' ? hex.match(/\w\w/g) : null;
  if (!parts) return [128, 128, 128];
  return parts.map((part) => parseInt(part, 16));
}

/** Linear-interpolate between two hex colors at t (0..1). */
function mixColors(colorA, colorB, t) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const mixed = a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
  return '#' + mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('');
}

/** 0 = untriggered, 1 = minimal, 2 = partial, 3 = maximum credit/penalty. */
function fulfilmentTier(ratio) {
  if (ratio <= 0) return 0;
  if (ratio < 0.4) return 1;
  if (ratio < 0.95) return 2;
  return 3;
}

/**
 * Variant A (minimal flat) stone face: a limestone-toned rect with per-stone
 * tonal jitter, thin crack lines + an --error-blended tint for damaged
 * (negative, triggered) stones, and a near-invisible outline when untriggered.
 */
function ashlarSvgMarkup(signalKey, tier, isNegative, rotationDeg) {
  const r = hashToUnit(signalKey);
  const r2 = hashToUnit(signalKey + 'x');
  const r3 = hashToUnit('y' + signalKey);
  const rotationStyle = `transform:rotate(${rotationDeg}deg)`;

  if (tier === 0) {
    return `<svg viewBox="0 0 48 48" style="opacity:${TIER_OPACITY[0]};${rotationStyle}"><rect x="2" y="2" width="44" height="44" fill="none" stroke="#b8a48a" stroke-width="0.8" stroke-opacity="0.4"/></svg>`;
  }

  // Limestone face tone: pale cream -> weathered gold, occasional olive.
  let face = mixColors('#F5E6D3', '#D4AF6A', 0.15 + r * 0.6);
  if (r2 > 0.7) face = mixColors(face, '#A89968', 0.15 + r3 * 0.35);
  if (r3 > 0.75) face = mixColors(face, '#F5E6D3', 0.3);

  let edgeColor = mixColors(face, '#C4B5A0', 0.4 + r2 * 0.2);

  if (isNegative) {
    const decay = 0.18 + tier * 0.14;
    face = mixColors(face, '#8b3d3d', decay);
    edgeColor = mixColors(edgeColor, '#8b3d3d', decay * 0.6);
  }

  let svg = `<svg viewBox="0 0 48 48" style="opacity:${TIER_OPACITY[tier]};${rotationStyle}"><rect x="1.5" y="1.5" width="45" height="45" fill="${face}" stroke="${edgeColor}" stroke-width="0.6"/>`;

  if (isNegative) {
    const crackColor = mixColors(face, '#5c2626', 0.7);
    const crackCount = r > 0.6 ? 2 : 1;
    svg += `<path d="M ${12 + r * 12} 6 L ${18 + r * 14} ${38 + r * 6}" stroke="${crackColor}" stroke-width="0.7" stroke-opacity="0.6"/>`;
    if (crackCount >= 2) {
      svg += `<path d="M ${32 + r * 8} 10 L ${28 + r * 10} 42" stroke="${crackColor}" stroke-width="0.6" stroke-opacity="0.4"/>`;
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * Build one stone's markup (SafeString): flat rect + faint outline, per-stone
 * size/rotation jitter, and a name-only hover/focus tooltip.
 */
function buildStoneMarkup(dictEntry, contribution, cap) {
  const isNegative = dictEntry.polarity === 'negative';
  const ratio = fulfilmentRatio(contribution, cap);
  const tier = fulfilmentTier(ratio);

  const sizeJitter = hashToUnit(dictEntry.key + 'sz');
  const rotationJitter = hashToUnit(dictEntry.key + 'rot');
  const size = 48 + Math.round((sizeJitter - 0.5) * 5);
  const rotation = ((rotationJitter - 0.5) * 2).toFixed(2);

  const svgMarkup = ashlarSvgMarkup(dictEntry.key, tier, isNegative, rotation);

  return html`
    <div
      class="wikipedia-stone"
      data-signal-key="${dictEntry.key}"
      style="width:${size}px;height:${size}px;--stone-target-opacity:${TIER_OPACITY[tier]};animation-delay:0ms;"
      tabindex="0"
    >
      ${raw(svgMarkup)}
      <div class="wikipedia-stone-label"><span>${dictEntry.name}</span></div>
    </div>
  `.toString();
}

/** Build the agent-readable JSON payload for one article's signals. */
function buildAgentData(title, signalRows) {
  const rowsByKey = new Map(signalRows.map((row) => [row.signal_key, row]));
  const netScore = signalRows.reduce((sum, row) => sum + row.contribution, 0);

  const signals = SIGNAL_DICTIONARY.filter((entry) => rowsByKey.has(entry.key)).map((entry) => {
    const row = rowsByKey.get(entry.key);
    const weight = entry.polarity === 'positive' ? `capped +${entry.capMagnitude}` : `capped -${entry.capMagnitude}`;
    return {
      key: entry.key,
      name: entry.name,
      weight,
      cap: row.cap,
      contribution: row.contribution,
      fulfilment: fulfilmentRatio(row.contribution, row.cap),
      polarity: entry.polarity,
      statement: buildStatement(entry, row.contribution, row.cap),
    };
  });

  return { article: title, net_score: netScore, signals };
}

/** Escape "</script" so the JSON payload can't prematurely close its <script> tag. */
function escapeForScriptTag(jsonString) {
  return jsonString.replace(/</g, '\\u003c');
}

/** Build the glyph buttons + collapsible stone wall for one article, or '' if unscored. */
function buildStoneWidget(item, articleId) {
  if (!Array.isArray(item.signals) || item.signals.length === 0) return '';

  const wrapId = `wikipedia-stone-wrap-${articleId}`;
  const agentData = buildAgentData(item.wikipedia_article_title || 'Untitled', item.signals);
  const agentJson = escapeForScriptTag(JSON.stringify(agentData));

  const rowsByKey = new Map(item.signals.map((row) => [row.signal_key, row]));
  const positiveEntries = SIGNAL_DICTIONARY.filter((entry) => entry.polarity === 'positive' && rowsByKey.has(entry.key));
  const negativeEntries = SIGNAL_DICTIONARY.filter((entry) => entry.polarity === 'negative' && rowsByKey.has(entry.key));

  const positiveStones = safeJoin(
    positiveEntries.map((entry) => raw(buildStoneMarkup(entry, rowsByKey.get(entry.key).contribution, rowsByKey.get(entry.key).cap)))
  );
  const negativeStones = safeJoin(
    negativeEntries.map((entry) => raw(buildStoneMarkup(entry, rowsByKey.get(entry.key).contribution, rowsByKey.get(entry.key).cap)))
  );
  const gap = negativeEntries.length > 0 ? raw('<div class="wikipedia-stone-gap"></div>') : raw('');

  return html`
    <button
      type="button"
      class="btn btn--ghost wikipedia-signal-btn wikipedia-signal-copy"
      title="Copy text results"
      aria-label="Copy text results"
      data-copy-target="${wrapId}"
    >
      <svg width="18" height="18" aria-hidden="true">
        <use href="/assets/images/feather-sprite.svg#icon-copy" />
      </svg>
    </button>
    <button
      type="button"
      class="btn btn--ghost wikipedia-signal-btn wikipedia-signal-toggle"
      title="Reliability calculation"
      aria-label="Reliability calculation"
      aria-expanded="false"
      aria-controls="${wrapId}"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="5" y="4" width="12" height="5" rx="0.5"></rect>
        <rect x="3" y="9.5" width="12" height="5" rx="0.5"></rect>
        <rect x="7" y="15" width="12" height="5" rx="0.5"></rect>
      </svg>
    </button>
    <div class="wikipedia-stone-wrap" id="${wrapId}" aria-hidden="true">
      <div class="wikipedia-stone-inner">
        <div class="wikipedia-stone-row">${positiveStones}${gap}${negativeStones}</div>
        <p class="wikipedia-stone-caption">
          An invisible <code>&lt;script class="agent-data"&gt;</code> block below carries the
          full scoring data behind these stones (name, cap, contribution, statement) for AI
          agents. The copy button above copies a plain-text rendering of the same data.
        </p>
      </div>
    </div>
    <script type="application/json" class="agent-data" data-agent-readable="true">${raw(agentJson)}</script>
  `.toString();
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderArticles(items) {
  if (!$list) return;

  const existingCount = $list.querySelectorAll('.wikipedia-rank-card').length;

  items.forEach((item, index) => {
    const rank = existingCount + index + 1;

    const title = item.wikipedia_article_title || 'Untitled';
    const url = item.wikipedia_article_url || '#';
    const dateStr = item.wikipedia_article_latest_revision_date
      ? new Date(item.wikipedia_article_latest_revision_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const articleId = item.id ?? `${rank}`;

    const li = document.createElement('li');
    li.className = 'wikipedia-rank-card';
    li.setAttribute('role', 'listitem');

    li.innerHTML = html`
      <span class="wikipedia-rank-number">${rank}</span>
      <div class="wikipedia-rank-content">
        <div class="wikipedia-rank-title">
          <a class="wikipedia-rank-title-link" href="${url}" target="_blank" rel="noopener noreferrer">
            ${title}
            <svg width="14" height="14" aria-hidden="true" style="display:inline;vertical-align:middle;">
              <use href="/assets/images/feather-sprite.svg#icon-external-link"/>
            </svg>
          </a>
          ${raw(buildStoneWidget(item, articleId))}
        </div>
        <span class="wikipedia-rank-date">${dateStr ? `Last revised: ${dateStr}` : ''}</span>
      </div>
    `;

    $list.appendChild(li);
  });
}

// ─── Stone wall expand/collapse ─────────────────────────────────────────────

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function openStoneWrap(wrap) {
  const stones = Array.from(wrap.querySelectorAll('.wikipedia-stone'));
  wrap.classList.add('is-open');
  wrap.setAttribute('aria-hidden', 'false');

  stones.forEach((stone, index) => {
    stone.style.animationDelay = prefersReducedMotion() ? '0ms' : `${index * STONE_STAGGER_MS}ms`;
    stone.classList.add('is-visible');
  });
}

function closeStoneWrap(wrap) {
  const stones = Array.from(wrap.querySelectorAll('.wikipedia-stone'));
  const total = stones.length;

  if (prefersReducedMotion()) {
    stones.forEach((stone) => stone.classList.remove('is-visible'));
    wrap.classList.remove('is-open');
    wrap.setAttribute('aria-hidden', 'true');
    return;
  }

  stones.forEach((stone, index) => {
    const reverseDelay = (total - 1 - index) * STONE_COLLAPSE_STAGGER_MS;
    setTimeout(() => stone.classList.remove('is-visible'), reverseDelay);
  });

  const totalDelay = total * STONE_COLLAPSE_STAGGER_MS + STONE_DURATION_MS;
  setTimeout(() => {
    wrap.classList.remove('is-open');
    wrap.setAttribute('aria-hidden', 'true');
  }, totalDelay);
}

function bindStoneToggle() {
  if (toggleTeardown) toggleTeardown();
  toggleTeardown = delegate(document.body, '.wikipedia-signal-toggle', 'click', (_e, target) => {
    const wrapId = target.getAttribute('aria-controls');
    const wrap = wrapId && document.getElementById(wrapId);
    if (!wrap) return;

    const isOpen = wrap.classList.contains('is-open');
    if (isOpen) {
      closeStoneWrap(wrap);
    } else {
      openStoneWrap(wrap);
    }
    target.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  });
}

// ─── Copy-to-clipboard ───────────────────────────────────────────────────────

function buildClipboardText(agentData) {
  const lines = [agentData.article, `Net score: ${agentData.net_score}`, ''];
  agentData.signals.forEach((signal) => lines.push(`${signal.name}: ${signal.statement}`));
  return lines.join('\n');
}

function showCopySuccess(button) {
  const originalHTML = button.innerHTML;
  const originalTitle = button.getAttribute('title');
  button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="/assets/images/feather-sprite.svg#icon-check"/></svg>`;
  button.classList.add('is-copied');
  button.setAttribute('title', 'Copied');
  button.setAttribute('aria-label', 'Copied');

  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.classList.remove('is-copied');
    button.setAttribute('title', originalTitle || 'Copy text results');
    button.setAttribute('aria-label', 'Copy text results');
  }, COPY_SUCCESS_MS);
}

function bindCopyButton() {
  if (copyTeardown) copyTeardown();
  copyTeardown = delegate(document.body, '.wikipedia-signal-copy', 'click', async (_e, target) => {
    const wrapId = target.getAttribute('data-copy-target');
    const wrap = wrapId && document.getElementById(wrapId);
    const script = wrap && wrap.parentElement.querySelector('script.agent-data');
    if (!script) {
      showToast('No reliability data available to copy', 'error');
      return;
    }

    try {
      const agentData = JSON.parse(script.textContent);
      const text = buildClipboardText(agentData);
      await navigator.clipboard.writeText(text);
      showCopySuccess(target);
    } catch (err) {
      console.error('Copy reliability data failed:', err);
      showToast('Failed to copy reliability data', 'error');
    }
  });
}

// ─── Infinite scroll ─────────────────────────────────────────────────────────

function initInfiniteScroll() {
  if (!$sentinel) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadPage();
        }
      });
    },
    { rootMargin: `${SCROLL_THRESHOLD}px` }
  );

  observer.observe($sentinel);
}

// ─── Event wiring ────────────────────────────────────────────────────────────

function bindRetry() {
  if (!$retry) return;
  if (retryTeardown) retryTeardown();
  retryTeardown = delegate(document.body, `#${RETRY_ID}`, 'click', () => {
    currentPage = 1;
    hasMore = true;
    allItems = [];
    if ($list) $list.innerHTML = '';
    hideAllStates();
    $sentinel && ($sentinel.hidden = false);
    loadPage();
  });
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  bindRetry();
  bindStoneToggle();
  bindCopyButton();
  initInfiniteScroll();
  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
