/**
 * Wikipedia ranked list page: fetch ranked Wikipedia articles, render each
 * with rank number and external link + Feather icon. A single page-level
 * "Last updated" line (when the list was most recently uploaded to this
 * website) sits in the page header rather than per article. Infinite scroll.
 *
 * Also renders the Wikipedia quality grid per article: an always-visible 5x5
 * grid of the 25 §9 signals (colour-intensity encoded), a colour-banded
 * document score panel, a copy-results button, and an invisible
 * agent-readable JSON block describing the exact scoring behind the grid.
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

const COPY_SUCCESS_MS = 1500;

// Fulfilment-ratio boundaries for the four blue intensity tiers (positive
// signals only — negative signals render as a single --error tone
// regardless of magnitude). Mirrors --grid-blue-1..4 (variables.css).
const TIER_4_MIN = 0.95;
const TIER_3_MIN = 0.6;
const TIER_2_MIN = 0.3;

// Document score panel colour-band boundaries.
const SCORE_GREEN_MIN = 50;
const SCORE_YELLOW_MIN = 25;

const SOURCE_LINE = 'Source: thejesuswebsite.org/debate/wikipedia';

let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allItems = [];
let observer = null;
let retryTeardown = null;
let copyTeardown = null;
let tooltipTeardowns = null;
let gridKeyboardTeardown = null;
let $tooltip = null;

// ─── DOM refs (cached — JS-6) ───────────────────────────────────────────────

const $list     = document.getElementById(LIST_ID);
const $sentinel = document.getElementById(SENTINEL_ID);
const $loading  = document.getElementById(LOADING_ID);
const $empty    = document.getElementById(EMPTY_ID);
const $error    = document.getElementById(ERROR_ID);
const $end      = document.getElementById(END_ID);
const $retry    = document.getElementById(RETRY_ID);
const $revisedLine = document.getElementById('wikipedia-revised-line');

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

/**
 * Shows when scores were most recently (re-)imported, as one page-level line.
 * This is the newest `scored_at` (last scoring-import time) across the
 * dataset — it has nothing to do with the Wikipedia articles' own revision
 * dates. Stays hidden if no article has a valid date (JS-2).
 */
function updateRevisedLine(items) {
  if (!$revisedLine || !Array.isArray(items)) return;

  const validDates = items
    .map((item) => item.scored_at && Date.parse(item.scored_at))
    .filter((parsed) => !Number.isNaN(parsed) && parsed);

  if (validDates.length === 0) {
    $revisedLine.hidden = true;
    return;
  }

  const latestMs = Math.max(...validDates);

  const dateStr = new Date(latestMs).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  $revisedLine.textContent = `Scores last updated: ${dateStr}`;
  $revisedLine.hidden = false;
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

  updateRevisedLine(data);

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

// ─── Quality grid: signal -> cell classification ───────────────────────────

/** Which of the four blue intensity tiers a fulfilment ratio falls in (1..4). */
function blueIntensityTier(ratio) {
  if (ratio >= TIER_4_MIN) return 4;
  if (ratio >= TIER_3_MIN) return 3;
  if (ratio >= TIER_2_MIN) return 2;
  return 1;
}

/** Which of the three score-panel colour bands a net score falls in. */
function scoreBand(netScore) {
  if (netScore >= SCORE_GREEN_MIN) return 'green';
  if (netScore >= SCORE_YELLOW_MIN) return 'yellow';
  return 'red';
}

/** Build the agent-readable JSON payload for one article's signals: all 25
 *  §9 signals, including ones with no database row (unfired, contribution 0). */
function buildAgentData(title, signalRows) {
  const rowsByKey = new Map((signalRows || []).map((row) => [row.signal_key, row]));

  const signals = SIGNAL_DICTIONARY.map((entry) => {
    const row = rowsByKey.get(entry.key);
    const contribution = row ? row.contribution : 0;
    const cap = row ? row.cap : 0;
    const fired = contribution !== 0;

    const signal = {
      key: entry.key,
      name: entry.name,
      polarity: entry.polarity,
      cap,
      contribution,
      fulfilment: fired ? fulfilmentRatio(contribution, cap) : 0,
      fired,
      statement: buildStatement(entry, contribution, cap),
    };

    // §12.3 explainability fields — only present when the DB row carries them.
    if (row && row.matched_exemplar_id != null) signal.matched_exemplar_id = row.matched_exemplar_id;
    if (row && row.similarity != null) signal.similarity = row.similarity;

    return signal;
  });

  const netScore = signals.reduce((sum, signal) => sum + signal.contribution, 0);
  // Theoretical max = every positive signal at its (category-derived) cap, every
  // negative signal at 0 — reproduces the §10 per-category ceiling without
  // needing a separate category field, since `cap` is already category-aware.
  const maxPossible = signals.reduce((sum, signal) => sum + Math.max(signal.cap, 0), 0);

  return { article: title, net_score: netScore, max_possible: maxPossible, signals };
}

/** Escape "</script" so the JSON payload can't prematurely close its <script> tag. */
function escapeForScriptTag(jsonString) {
  return jsonString.replace(/</g, '\\u003c');
}

/** Build one grid cell (SafeString) for a signal, in its fixed §9 row-order position. */
function buildCellMarkup(entry, row, index) {
  const contribution = row ? row.contribution : 0;
  const cap = row ? row.cap : 0;
  const isEmpty = contribution === 0;
  const isNegative = contribution < 0;

  let cellClass = 'wikipedia-cell';
  if (isEmpty) {
    cellClass += ' wikipedia-cell--empty';
  } else if (isNegative) {
    cellClass += ' wikipedia-cell--negative';
  } else {
    cellClass += ` wikipedia-cell--blue-${blueIntensityTier(fulfilmentRatio(contribution, cap))}`;
  }

  const displayText = isEmpty ? '' : String(contribution);
  const accessibleName = isEmpty ? `${entry.name}: not scored` : `${entry.name}: ${contribution}`;
  const tabindex = index === 0 ? '0' : '-1';

  return html`<div class="${cellClass}" role="gridcell" tabindex="${tabindex}" data-signal-key="${entry.key}" data-tooltip="${accessibleName}" aria-label="${accessibleName}">${displayText}</div>`;
}

/** Build the signal grid + score panel + copy button for one article, or '' if unscored. */
function buildGridWidget(item, articleId) {
  if (!Array.isArray(item.signals) || item.signals.length === 0) return '';

  const title = item.wikipedia_article_title || 'Untitled';
  const agentData = buildAgentData(title, item.signals);
  const agentJson = escapeForScriptTag(JSON.stringify(agentData));
  const rowsByKey = new Map(item.signals.map((row) => [row.signal_key, row]));
  const agentDataId = `wikipedia-agent-data-${articleId}`;

  const cells = safeJoin(
    SIGNAL_DICTIONARY.map((entry, index) => buildCellMarkup(entry, rowsByKey.get(entry.key), index))
  );

  const band = scoreBand(agentData.net_score);
  const scoreTooltip = `Document score: ${agentData.net_score}`;

  return html`
    <div class="wikipedia-rank-meta">
      <div class="wikipedia-grid" role="table" aria-label="Reliability signal grid">${cells}</div>
      <div
        class="wikipedia-score-panel wikipedia-score--${band}"
        data-tooltip="${scoreTooltip}"
        aria-label="${scoreTooltip}"
        tabindex="0"
      >${agentData.net_score}</div>
      <button
        type="button"
        class="btn btn--ghost wikipedia-signal-btn wikipedia-signal-copy"
        title="Copy of the reliability information"
        aria-label="Copy of the reliability information"
        data-copy-target="${agentDataId}"
      >
        <svg width="18" height="18" aria-hidden="true">
          <use href="/assets/images/feather-sprite.svg#icon-copy" />
        </svg>
      </button>
    </div>
    <script type="application/json" class="agent-data" id="${agentDataId}" data-agent-readable="true">${raw(agentJson)}</script>
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
    const articleId = item.id ?? `${rank}`;

    const li = document.createElement('li');
    li.className = 'wikipedia-rank-card';
    li.setAttribute('role', 'listitem');

    li.innerHTML = html`
      <span class="wikipedia-rank-number">${rank}</span>
      <div class="wikipedia-rank-title">
        <a class="wikipedia-rank-title-link" href="${url}" target="_blank" rel="noopener noreferrer">
          ${title}
          <svg width="14" height="14" aria-hidden="true" style="display:inline;vertical-align:middle;">
            <use href="/assets/images/feather-sprite.svg#icon-external-link"/>
          </svg>
        </a>
      </div>
      ${raw(buildGridWidget(item, articleId))}
    `;

    $list.appendChild(li);
  });
}

// ─── Tooltip (delegated, pointer devices only) ──────────────────────────────

function pointerFineHover() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function getTooltipEl() {
  if (!$tooltip) {
    $tooltip = document.createElement('div');
    $tooltip.className = 'wikipedia-tooltip';
    $tooltip.setAttribute('role', 'presentation');
    document.body.appendChild($tooltip);
  }
  return $tooltip;
}

function showTooltip(target) {
  if (!pointerFineHover()) return;
  const text = target.getAttribute('data-tooltip');
  if (!text) return;

  const tooltip = getTooltipEl();
  tooltip.textContent = text;
  tooltip.classList.add('is-visible');

  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
  const top = targetRect.top - tooltipRect.height - 8;

  tooltip.style.left = `${Math.max(4, left)}px`;
  tooltip.style.top = `${Math.max(4, top)}px`;
}

function hideTooltip() {
  if ($tooltip) $tooltip.classList.remove('is-visible');
}

function bindTooltips() {
  if (tooltipTeardowns) tooltipTeardowns.forEach((teardown) => teardown());

  const selector = '.wikipedia-cell, .wikipedia-score-panel';
  tooltipTeardowns = [
    delegate(document.body, selector, 'mouseover', (_e, target) => showTooltip(target)),
    delegate(document.body, selector, 'mouseout', () => hideTooltip()),
    delegate(document.body, selector, 'focusin', (_e, target) => showTooltip(target)),
    delegate(document.body, selector, 'focusout', () => hideTooltip()),
  ];
}

// ─── Grid keyboard navigation (roving tabindex) ─────────────────────────────

const ARROW_STEP = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 5, ArrowUp: -5 };
const GRID_COLUMNS = 5;

function bindGridKeyboard() {
  if (gridKeyboardTeardown) gridKeyboardTeardown();

  gridKeyboardTeardown = delegate(document.body, '.wikipedia-cell', 'keydown', (e, target) => {
    const step = ARROW_STEP[e.key];
    if (!step) return;

    const grid = target.closest('.wikipedia-grid');
    if (!grid) return;

    const cells = Array.from(grid.querySelectorAll('.wikipedia-cell'));
    const index = cells.indexOf(target);
    if (index === -1) return;

    const col = index % GRID_COLUMNS;
    if (e.key === 'ArrowRight' && col === GRID_COLUMNS - 1) return;
    if (e.key === 'ArrowLeft' && col === 0) return;

    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= cells.length) return;

    e.preventDefault();
    cells[index].setAttribute('tabindex', '-1');
    cells[nextIndex].setAttribute('tabindex', '0');
    cells[nextIndex].focus();
  });
}

// ─── Copy-to-clipboard ───────────────────────────────────────────────────────

function padSignalName(name, width) {
  return name.length >= width ? name : name + ' '.repeat(width - name.length);
}

function buildClipboardText(agentData) {
  const scored = agentData.signals.filter((signal) => signal.contribution !== 0);
  const unscored = agentData.signals.filter((signal) => signal.contribution === 0);

  const nameWidth = scored.reduce((max, signal) => Math.max(max, signal.name.length), 0);
  const scoredLines = scored.map((signal) => {
    const sign = signal.contribution > 0 ? '+' : '';
    return `${padSignalName(signal.name, nameWidth)}  ${sign}${signal.contribution}`;
  });

  const lines = [
    `${agentData.article} — reliability score ${agentData.net_score}`,
    '',
    'Scored signals:',
    ...scoredLines,
    '',
    'Not scored:',
    ...unscored.map((signal) => signal.name),
    '',
    `Net score: ${agentData.net_score} of a possible ${agentData.max_possible}`,
    '',
    SOURCE_LINE,
  ];

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
    button.setAttribute('title', originalTitle || 'Copy of the reliability information');
    button.setAttribute('aria-label', 'Copy of the reliability information');
  }, COPY_SUCCESS_MS);
}

function bindCopyButton() {
  if (copyTeardown) copyTeardown();
  copyTeardown = delegate(document.body, '.wikipedia-signal-copy', 'click', async (_e, target) => {
    const agentDataId = target.getAttribute('data-copy-target');
    const script = agentDataId && document.getElementById(agentDataId);
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
  bindTooltips();
  bindGridKeyboard();
  bindCopyButton();
  initInfiniteScroll();
  loadPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
