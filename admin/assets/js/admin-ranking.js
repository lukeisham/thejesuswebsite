// admin-ranking.js — Drag-to-Rank Reorder Module (SR-1)
// Pure vanilla JS. One job: drag-to-reorder with pointer events + keyboard a11y.
// Page wiring calls AdminRanking.init() and supplies a save callback; pages
// reuse the shared admin.js CRUD helpers rather than duplicating fetch logic.
//
// Exported as global AdminRanking namespace.

window.AdminRanking = {};
const AdminRanking = window.AdminRanking;

/* ─────────────────────────────────────────────────────────────────────────────
   Pure helper: computeSortOrders
   Takes an array of items (each with an id) and moves the item at fromIndex
   to toIndex, returning [{ id, sort_order }] with sequential sort_order values.
   Boundary-safe (clamps indices). Exported for tests.
   ───────────────────────────────────────────────────────────────────────────── */
AdminRanking.computeSortOrders = function (items, fromIndex, toIndex) {
  const len = items.length;
  if (len < 2 || fromIndex === toIndex) {
    return items.map(function (item, i) { return { id: item.id, sort_order: i }; });
  }

  const clampedFrom = Math.max(0, Math.min(fromIndex, len - 1));
  const clampedTo = Math.max(0, Math.min(toIndex, len - 1));
  if (clampedFrom === clampedTo) {
    return items.map(function (item, i) { return { id: item.id, sort_order: i }; });
  }

  const reordered = items.slice();
  const moved = reordered.splice(clampedFrom, 1)[0];
  reordered.splice(clampedTo, 0, moved);

  return reordered.map(function (item, i) { return { id: item.id, sort_order: i }; });
};

/* ─────────────────────────────────────────────────────────────────────────────
   init(containerSelector, options)
   options.save(items)  — async callback, receives [{id, sort_order}]
   options.itemSelector — selector for draggable rows (default '.draggable-row')
   options.handleSelector— selector for drag handle (default '.drag-handle')
   ───────────────────────────────────────────────────────────────────────────── */
AdminRanking.init = function (containerSelector, options) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const itemSel = options.itemSelector || '.draggable-row';
  const handleSel = options.handleSelector || '.drag-handle';

  let draggedEl = null;
  let startY = 0;
  let currentIndex = -1;
  let dropTargetEl = null;

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  function getItems() {
    return Array.from(container.querySelectorAll(itemSel)).map(function (el) {
      return { id: Number(el.dataset.id), el: el };
    });
  }

  function clearDropTarget() {
    if (dropTargetEl) {
      dropTargetEl.classList.remove('drop-target');
      dropTargetEl = null;
    }
  }

  async function saveOrder() {
    const items = getItems();
    const orders = items.map(function (item, i) { return { id: item.id, sort_order: i }; });
    if (typeof options.save === 'function') {
      try {
        await options.save(orders);
      } catch (err) {
        console.error('Ranking save failed:', err);
      }
    }
  }

  /* ── Keyboard accessibility ───────────────────────────────────────────── */

  container.addEventListener('keydown', function (e) {
    const handle = e.target.closest(handleSel);
    if (!handle) return;
    const row = handle.closest(itemSel);
    if (!row) return;

    const items = getItems();
    const idx = items.findIndex(function (item) { return item.el === row; });
    if (idx < 0) return;

    if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      container.insertBefore(row, items[idx - 1].el);
      row.querySelector(handleSel).focus();
      saveOrder();
    } else if (e.key === 'ArrowDown' && idx < items.length - 1) {
      e.preventDefault();
      const next = items[idx + 1].el;
      container.insertBefore(row, next.nextSibling);
      row.querySelector(handleSel).focus();
      saveOrder();
    }
  });

  /* ── Pointer events for drag ──────────────────────────────────────────── */

  container.addEventListener('pointerdown', function (e) {
    const handle = e.target.closest(handleSel);
    if (!handle) return;
    const row = handle.closest(itemSel);
    if (!row) return;

    e.preventDefault();
    draggedEl = row;
    startY = e.clientY;
    const items = getItems();
    currentIndex = items.findIndex(function (item) { return item.el === row; });
    if (currentIndex < 0) {
      draggedEl = null;
      return;
    }

    draggedEl.classList.add('dragging');
    draggedEl.setPointerCapture(e.pointerId);
    draggedEl.style.transition = 'none';
  });

  container.addEventListener('pointermove', function (e) {
    if (!draggedEl) return;

    const dy = e.clientY - startY;

    // Apply vertical offset visually
    draggedEl.style.transform = 'translateY(' + dy + 'px)';
    draggedEl.style.zIndex = '100';
    draggedEl.style.position = 'relative';

    // Find drop target
    clearDropTarget();
    const items = getItems();
    const draggedIdx = items.findIndex(function (item) { return item.el === draggedEl; });
    if (draggedIdx < 0) return;

    // Find the row under the pointer
    const pointerRow = document.elementFromPoint(e.clientX, e.clientY);
    if (pointerRow) {
      const targetRow = pointerRow.closest(itemSel);
      if (targetRow && targetRow !== draggedEl) {
        const targetIdx = items.findIndex(function (item) { return item.el === targetRow; });
        if (targetIdx >= 0) {
          dropTargetEl = targetRow;
          dropTargetEl.classList.add('drop-target');
        }
      }
    }
  });

  container.addEventListener('pointerup', async function (e) {
    if (!draggedEl) return;

    draggedEl.classList.remove('dragging');
    draggedEl.style.transform = '';
    draggedEl.style.zIndex = '';
    draggedEl.style.position = '';
    draggedEl.style.transition = '';

    // If we have a drop target, reorder the DOM
    if (dropTargetEl) {
      const items = getItems();
      const targetIdx = items.findIndex(function (item) { return item.el === dropTargetEl; });
      const draggedIdx = items.findIndex(function (item) { return item.el === draggedEl; });

      if (targetIdx >= 0 && draggedIdx >= 0 && targetIdx !== draggedIdx) {
        if (targetIdx > draggedIdx) {
          // Insert after the target
          container.insertBefore(draggedEl, dropTargetEl.nextSibling);
        } else {
          // Insert before the target
          container.insertBefore(draggedEl, dropTargetEl);
        }
      }
    }

    clearDropTarget();

    try {
      draggedEl.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }

    draggedEl = null;
    currentIndex = -1;
    startY = 0;

    await saveOrder();
  });

  // Cancel drag if pointer leaves the container entirely
  container.addEventListener('pointerleave', function (e) {
    if (!draggedEl) return;
    // Only cancel if the pointer truly left (not entering a child)
    if (!container.contains(e.relatedTarget)) {
      draggedEl.classList.remove('dragging');
      draggedEl.style.transform = '';
      draggedEl.style.zIndex = '';
      draggedEl.style.position = '';
      draggedEl.style.transition = '';
      clearDropTarget();
      try { draggedEl.releasePointerCapture(e.pointerId); } catch (_) {}
      draggedEl = null;
      currentIndex = -1;
      startY = 0;
    }
  });
};
