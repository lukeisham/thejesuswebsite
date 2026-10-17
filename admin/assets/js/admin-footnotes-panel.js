// Footnotes panel for the essay, response and historiography editors — an
// ordered list of plain-text footnotes with add, remove and move controls.
// Shaped like admin-mla-sources.js (SR-8): a window.Admin* namespace, DOM built
// with element factories (JS-6), one delegated click listener on the list.
//
// A body marker [fn:N] points to the footnote at list position N, so the order
// shown here is the public numbering (see
// frontend/assets/js/utils/content-markers.js and
// setup/ARCHITECTURE/journal-article-fields.md). MAX_COUNT and MAX_LENGTH must
// equal FOOTNOTE_MAX_COUNT and FOOTNOTE_MAX_LENGTH in
// api/lib/journal-field-validation.js; api/tests/guide-journal-article-fields.test.js
// checks this. The editors send getFootnotes() as the `footnotes` key of the
// save payload.

window.AdminFootnotesPanel = {};

var AdminFootnotesPanel = window.AdminFootnotesPanel;

var MAX_COUNT = 100;
var MAX_LENGTH = 1000;

var HINT_TEXT =
  "Plain text. In the article, write [fn:1] where footnote 1 belongs. " +
  "Numbers follow the order of this list, so after you move or remove a " +
  "footnote, update the [fn:N] markers in the text. Empty footnotes are not saved.";

/**
 * Mount the footnotes panel.
 *
 * @param {Element} container - Element to append the panel into.
 * @param {Array<{content: string}>} [footnotes] - Saved footnotes, in list order.
 * @returns {{ getFootnotes: function(): Array<{content: string}> }|null}
 *   `getFootnotes()` returns the non-blank footnotes in list order, ready to
 *   send as the `footnotes` payload key. Returns null when the container is missing.
 */
AdminFootnotesPanel.mount = function (container, footnotes) {
  if (!container || typeof container.appendChild !== "function") {
    console.warn("AdminFootnotesPanel.mount: container is required.");
    return null;
  }

  var fields = []; // one textarea per row, in list order

  var root = document.createElement("div");
  root.className = "afn-panel";

  var hint = document.createElement("span");
  hint.className = "admin-form-hint afn-panel__hint";
  hint.textContent = HINT_TEXT;

  var listEl = document.createElement("ol");
  listEl.className = "afn-panel__list";

  var addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className =
    "admin-btn admin-btn--ghost admin-btn--sm afn-panel__add";
  addBtn.textContent = "+ Add footnote";

  root.appendChild(hint);
  root.appendChild(listEl);
  root.appendChild(addBtn);
  container.appendChild(root);

  function currentTexts() {
    return fields.map(function (field) {
      return field.value;
    });
  }

  function buildButton(label, action, index, disabled) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-btn admin-btn--ghost admin-btn--sm";
    btn.textContent = label;
    btn.dataset.action = action;
    btn.dataset.index = String(index);
    btn.disabled = disabled;
    return btn;
  }

  function render(texts) {
    listEl.textContent = "";
    fields = [];

    texts.forEach(function (text, i) {
      var li = document.createElement("li");
      li.className = "afn-panel__item";

      var marker = document.createElement("div");
      marker.className = "afn-panel__marker";
      marker.textContent = "[fn:" + (i + 1) + "]";
      li.appendChild(marker);

      var field = document.createElement("textarea");
      field.className = "admin-textarea afn-panel__field";
      field.rows = 2;
      field.maxLength = MAX_LENGTH;
      field.spellcheck = true;
      field.value = text;
      field.setAttribute("aria-label", "Footnote " + (i + 1));
      li.appendChild(field);
      fields.push(field);

      var actions = document.createElement("div");
      actions.className = "afn-panel__actions";
      actions.appendChild(buildButton("Up", "up", i, i === 0));
      actions.appendChild(
        buildButton("Down", "down", i, i === texts.length - 1),
      );
      actions.appendChild(buildButton("Remove", "remove", i, false));
      li.appendChild(actions);

      listEl.appendChild(li);
    });

    addBtn.disabled = texts.length >= MAX_COUNT;
  }

  // One listener on the list (JS-6): buttons carry their action and row index.
  listEl.addEventListener("click", function (event) {
    var target = event.target;
    var action = target && target.dataset && target.dataset.action;
    if (!action) return;

    var index = Number(target.dataset.index);
    var texts = currentTexts();
    if (action === "remove") {
      texts.splice(index, 1);
    } else if (action === "up" && index > 0) {
      texts.splice(index - 1, 0, texts.splice(index, 1)[0]);
    } else if (action === "down" && index < texts.length - 1) {
      texts.splice(index + 1, 0, texts.splice(index, 1)[0]);
    }
    render(texts);
  });

  addBtn.addEventListener("click", function () {
    var texts = currentTexts();
    if (texts.length >= MAX_COUNT) return;
    texts.push("");
    render(texts);
    fields[fields.length - 1].focus();
  });

  render(
    (footnotes || []).map(function (footnote) {
      return footnote.content;
    }),
  );

  return {
    getFootnotes: function () {
      return currentTexts()
        .map(function (text) {
          return text.trim();
        })
        .filter(Boolean)
        .map(function (text) {
          return { content: text };
        });
    },
  };
};

/**
 * Mount the panel inside a titled sidebar card, like AdminEditorUtils.mountMlaPanel
 * does for the bibliography. Used by the three journal editors.
 *
 * @param {Element} sidebarEl - The editor sidebar to append the card to.
 * @param {Array<{content: string}>} [footnotes] - Saved footnotes, in list order.
 * @returns {{ getFootnotes: function(): Array<{content: string}> }|null}
 */
AdminFootnotesPanel.mountCard = function (sidebarEl, footnotes) {
  if (!sidebarEl || typeof sidebarEl.appendChild !== "function") {
    console.warn("AdminFootnotesPanel.mountCard: sidebarEl is required.");
    return null;
  }

  var card = document.createElement("div");
  card.className = "admin-form-card afn-card";

  var title = document.createElement("div");
  title.className = "admin-form-card__title";
  title.textContent = "Footnotes";
  card.appendChild(title);

  sidebarEl.appendChild(card);
  return AdminFootnotesPanel.mount(card, footnotes);
};
