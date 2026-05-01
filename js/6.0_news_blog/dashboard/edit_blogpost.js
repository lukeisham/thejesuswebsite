// =============================================================================
//
//   THE JESUS WEBSITE — EDIT BLOGPOST MODULE
//   File:    js/6.0_news_blog/dashboard/edit_blogpost.js
//   Version: 3.0.0
//   Purpose: 3-column CRUD interface for authoring, editing, and deleting
//            blog posts. Loads real data from API — no mock rows.
//   Source:  guide_dashboard_appearance.md §6.2, guide_function.md §6.3
//
//   Changelog:
//     v3.0.0 — Full ES6+ rewrite: var → let/const, template literals, extracted
//              fetch options to named variables, catch (_) → catch (_e).
//              No inline objects in await expressions. One function/script.
//     v2.1.0 — Providence grid refactor: split single container.innerHTML dump
//              into three _setColumn() / _clearColumnContent() calls targeting
//              "actions", "list", and "editor".
//     v2.0.0 — Initial version with container.innerHTML injection.
//
// =============================================================================

// Trigger: dashboard_app.js routing → window.renderEditBlogpost(containerId)
// Function: Fetches blog posts from API, renders 3-column Providence layout,
//           and manages create/edit/delete operations via PUT/DELETE
// Output: Populates the three Providence grid columns (canvas-col-actions,
//         canvas-col-list, canvas-col-editor) via _setColumn()

window.renderEditBlogpost = async function (containerId) {
  // containerId is "canvas-col-editor" when routed via dashboard_app.js loadModule().
  // We keep it for renderTabBar compatibility but no longer dump innerHTML into it.

  // ============================================================================
  //   SHELL — Render loading placeholders into the three Providence columns
  // ============================================================================

  _setColumn(
    "actions",
    `<!-- column_one: Action buttons -->
      <button class="blog-editor-action-btn" id="blog-btn-save">Save Post</button>
      <button class="blog-editor-action-btn" id="blog-btn-discard">Discard</button>
      <button class="blog-editor-action-btn is-danger" id="blog-btn-delete">Delete Post</button>
      <button class="blog-editor-action-btn" id="blog-btn-new">+ New Post</button>`,
  );

  _setColumn(
    "list",
    `<!-- column_two: Existing Posts list -->
      <p class="blog-editor-list-heading">Existing Posts</p>`,
  );

  _setColumn(
    "editor",
    `<!-- column_three: Editor (loading) -->
      <div class="loading-placeholder" id="blog-loading-indicator">Loading blog posts…</div>`,
  );

  // ============================================================================
  //   INTERNAL STATE
  // ============================================================================

  let blogPosts = []; // { id, slug, title, publish_date, author, body, raw }
  let selectedPostId = null; // Currently selected post id (null = new post)

  // ============================================================================
  //   HELPERS
  // ============================================================================

  function _getEditorEl() {
    return document.getElementById("canvas-col-editor");
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(d) {
    if (!d) return "";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toISOString().split("T")[0];
  }

  // ============================================================================
  //   DATA — Fetch blog posts from API
  // ============================================================================

  async function loadBlogPosts() {
    const listResponse = await fetch("/api/admin/records");
    if (!listResponse.ok) throw new Error("Failed to fetch records");
    const allRecords = await listResponse.json();

    // Fetch full details in parallel to check blogposts column
    const detailPromises = allRecords.map(async function (rec) {
      try {
        const resp = await fetch(`/api/admin/records/${rec.id}`);
        if (!resp.ok) return null;
        return await resp.json();
      } catch (_e) {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);

    blogPosts = [];
    details.forEach(function (d) {
      if (d && d.blogposts && d.blogposts.trim() !== "") {
        let parsed;
        try {
          parsed = JSON.parse(d.blogposts);
        } catch (_e) {
          parsed = {};
        }
        blogPosts.push({
          id: d.id,
          slug: d.slug || "",
          title: d.title || parsed.title || "",
          publish_date: parsed.publish_date || "",
          author: parsed.author || "",
          body: parsed.body || "",
          raw: d.blogposts,
        });
      }
    });

    // Sort by publish_date descending
    blogPosts.sort(function (a, b) {
      return (b.publish_date || "").localeCompare(a.publish_date || "");
    });

    return blogPosts;
  }

  // ============================================================================
  //   RENDER — Build the 3-column editor layout via Providence grid
  // ============================================================================

  function renderEditor() {
    // --- COL 1: Action buttons (clone to ensure fresh event bindings) ---
    _clearColumnContent("actions");
    _setColumn(
      "actions",
      `<!-- column_one: Action buttons -->
        <button class="blog-editor-action-btn" id="blog-btn-save">Save Post</button>
        <button class="blog-editor-action-btn" id="blog-btn-discard">Discard</button>
        <button class="blog-editor-action-btn is-danger" id="blog-btn-delete">Delete Post</button>
        <button class="blog-editor-action-btn" id="blog-btn-new">+ New Post</button>`,
    );

    // --- COL 2: Existing Posts list ---
    let listHtml = `<!-- column_two: Existing Posts list -->
      <p class="blog-editor-list-heading">Existing Posts</p>`;

    if (blogPosts.length === 0) {
      listHtml += `<p class="blog-editor-empty-msg">No blog posts yet.</p>`;
    } else {
      blogPosts.forEach(function (post) {
        const isSelected = post.id === selectedPostId;
        listHtml += `
          <div class="blog-post-list-item${isSelected ? " is-selected" : ""}" data-post-id="${post.id}">
            <div class="blog-post-list-info">
              <div class="blog-post-list-title">${escapeHtml(post.title || "Untitled")}</div>
              <div class="blog-post-list-date">${escapeHtml(formatDate(post.publish_date))}</div>
            </div>
            <div class="blog-post-list-actions">
              <button class="blog-post-list-link" data-post-id="${post.id}" data-action="edit">Edit</button>
              <button class="blog-post-list-link is-danger" data-post-id="${post.id}" data-action="delete">Delete</button>
            </div>
          </div>`;
      });
    }

    _clearColumnContent("list");
    _setColumn("list", listHtml);

    // --- COL 3: Editor Form ---
    let currentPost = null;
    if (selectedPostId) {
      for (let i = 0; i < blogPosts.length; i++) {
        if (blogPosts[i].id === selectedPostId) {
          currentPost = blogPosts[i];
          break;
        }
      }
    }

    const editorHtml = `<!-- column_three: Editor form -->
      <div class="blog-editor-field">
        <label class="blog-editor-field-label">Publish Date</label>
        <input type="date" class="blog-editor-field-input" id="blog-field-date"
               value="${escapeHtml(formatDate(currentPost ? currentPost.publish_date : ""))}">
      </div>
      <div class="blog-editor-field">
        <label class="blog-editor-field-label">Title</label>
        <input type="text" class="blog-editor-field-input" id="blog-field-title"
               placeholder="Post title…" value="${escapeHtml(currentPost ? currentPost.title : "")}">
      </div>
      <div class="blog-editor-field">
        <label class="blog-editor-field-label">Author</label>
        <input type="text" class="blog-editor-field-input" id="blog-field-author"
               placeholder="Author name…" value="${escapeHtml(currentPost ? currentPost.author : "")}">
      </div>
      <div class="blog-editor-split">
        <div class="blog-editor-textarea-pane">
          <div class="blog-editor-pane-label">Markdown (Edit)</div>
          <textarea class="blog-editor-textarea" id="blog-field-body"
                    placeholder="Write blog post markdown here…">${escapeHtml(currentPost ? currentPost.body : "")}</textarea>
        </div>
        <div class="blog-editor-textarea-pane">
          <div class="blog-editor-pane-label is-preview">Live Preview</div>
          <div class="blog-editor-preview-pane" id="blog-preview-pane"></div>
        </div>
      </div>`;

    _clearColumnContent("editor");
    _setColumn("editor", editorHtml);

    // --- Wire COL 2: Post list selection ---
    const listEl = _getColumns().list;
    if (listEl) {
      listEl.querySelectorAll("[data-action='edit']").forEach(function (btn) {
        btn.addEventListener("click", function () {
          const postId = this.getAttribute("data-post-id");
          if (postId) {
            selectedPostId = postId;
            renderEditor();
            wireEditorEvents();
          }
        });
      });

      // Wire COL 2: Delete from list
      listEl.querySelectorAll("[data-action='delete']").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          const postId = this.getAttribute("data-post-id");
          if (!postId) return;
          if (!confirm("Delete this blog post permanently?")) return;

          const deleteUrl = `/api/admin/records/${postId}`;
          const deleteOptions = {
            method: "DELETE",
            credentials: "include",
          };

          try {
            const resp = await fetch(deleteUrl, deleteOptions);

            if (resp.ok) {
              blogPosts = blogPosts.filter(function (p) {
                return p.id !== postId;
              });
              if (selectedPostId === postId) {
                selectedPostId = null;
              }
              renderEditor();
              wireEditorEvents();
            } else {
              alert(`Delete failed: ${resp.statusText}`);
            }
          } catch (err) {
            alert(`Delete failed: ${err.message}`);
          }
        });
      });
    }

    // --- Wire COL 3: Live preview on body input ---
    const bodyField = document.getElementById("blog-field-body");
    const previewPane = document.getElementById("blog-preview-pane");
    if (bodyField && previewPane) {
      function updatePreview() {
        previewPane.textContent = bodyField.value || "(no content yet)";
      }
      bodyField.addEventListener("input", updatePreview);
      updatePreview();
    }

    // Wire save, discard, delete, new buttons (column_one)
    wireColumnOneButtons();
  }

  // ============================================================================
  //   WIRE — Column 1 action buttons (clone each to remove stale listeners)
  // ============================================================================

  function wireColumnOneButtons() {
    // Save button
    const saveBtn = document.getElementById("blog-btn-save");
    if (saveBtn) {
      const newSave = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSave, saveBtn);
      newSave.addEventListener("click", handleSave);
    }

    // Discard button
    const discardBtn = document.getElementById("blog-btn-discard");
    if (discardBtn) {
      const newDiscard = discardBtn.cloneNode(true);
      discardBtn.parentNode.replaceChild(newDiscard, discardBtn);
      newDiscard.addEventListener("click", function () {
        selectedPostId = null;
        renderEditor();
        wireEditorEvents();
      });
    }

    // Delete button
    const deleteBtn = document.getElementById("blog-btn-delete");
    if (deleteBtn) {
      const newDelete = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDelete, deleteBtn);
      newDelete.addEventListener("click", async function () {
        if (!selectedPostId) {
          alert("No post selected to delete.");
          return;
        }
        if (!confirm("Delete this blog post permanently?")) return;

        const deleteUrl = `/api/admin/records/${selectedPostId}`;
        const deleteOptions = {
          method: "DELETE",
          credentials: "include",
        };

        try {
          const resp = await fetch(deleteUrl, deleteOptions);

          if (resp.ok) {
            blogPosts = blogPosts.filter(function (p) {
              return p.id !== selectedPostId;
            });
            selectedPostId = null;
            renderEditor();
            wireEditorEvents();
          } else {
            alert(`Delete failed: ${resp.statusText}`);
          }
        } catch (err) {
          alert(`Delete failed: ${err.message}`);
        }
      });
    }

    // New Post button
    const newBtn = document.getElementById("blog-btn-new");
    if (newBtn) {
      const newNew = newBtn.cloneNode(true);
      newBtn.parentNode.replaceChild(newNew, newBtn);
      newNew.addEventListener("click", function () {
        selectedPostId = null;
        renderEditor();
        wireEditorEvents();
      });
    }
  }

  // ============================================================================
  //   SAVE — Create or update a blog post record via the API
  // ============================================================================

  async function handleSave() {
    const dateField = document.getElementById("blog-field-date");
    const titleField = document.getElementById("blog-field-title");
    const authorField = document.getElementById("blog-field-author");
    const bodyField = document.getElementById("blog-field-body");

    if (!dateField || !titleField || !authorField || !bodyField) return;

    const blogData = {
      publish_date: dateField.value || "",
      title: titleField.value || "",
      author: authorField.value || "",
      body: bodyField.value || "",
    };

    const payload = {
      blogposts: JSON.stringify(blogData),
    };

    try {
      if (selectedPostId) {
        // Update existing record's blogposts column (PUT)
        const putUrl = `/api/admin/records/${selectedPostId}`;
        const putOptions = {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        };

        const resp = await fetch(putUrl, putOptions);

        if (resp.ok) {
          showSaveResult("Post saved successfully.", "is-success");
          await loadBlogPosts();
          renderEditor();
          wireEditorEvents();
        } else {
          let errData = {};
          try {
            errData = await resp.json();
          } catch (_e) {
            /* keep default */
          }
          showSaveResult(
            `Save failed: ${errData.detail || resp.statusText}`,
            "is-error",
          );
        }
      } else {
        // Create a new record with blogposts (POST)
        const newRecord = {
          title: titleField.value || "Untitled Blog Post",
          slug: `blog-${Date.now()}`,
          blogposts: JSON.stringify(blogData),
        };

        const postUrl = "/api/admin/records";
        const postOptions = {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        };

        const resp = await fetch(postUrl, postOptions);

        if (resp.ok) {
          const created = await resp.json();
          showSaveResult("New post created successfully.", "is-success");
          await loadBlogPosts();
          if (created.id) {
            selectedPostId = created.id;
          }
          renderEditor();
          wireEditorEvents();
        } else {
          let errData = {};
          try {
            errData = await resp.json();
          } catch (_e) {
            /* keep default */
          }
          showSaveResult(
            `Create failed: ${errData.detail || resp.statusText}`,
            "is-error",
          );
        }
      }
    } catch (err) {
      showSaveResult(`Save failed: ${err.message}`, "is-error");
    }
  }

  // ============================================================================
  //   FEEDBACK — Show save result message in the editor column
  // ============================================================================

  function showSaveResult(msg, type) {
    const editorEl = _getEditorEl();
    if (!editorEl) return;

    // Remove any existing save-result indicator
    const existing = editorEl.querySelector(".save-result-indicator");
    if (existing) existing.remove();

    const indicator = document.createElement("div");
    indicator.className = `save-result-indicator ${type}`;
    indicator.textContent = msg;
    editorEl.appendChild(indicator);
  }

  // ============================================================================
  //   POST-RENDER — Wire editor events after re-render
  // ============================================================================

  function wireEditorEvents() {
    const listEl = _getColumns().list;
    if (listEl) {
      const selectedEl = listEl.querySelector(
        ".blog-post-list-item.is-selected",
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  // ============================================================================
  //   TAB BAR — Render top-level section navigation
  // ============================================================================

  if (typeof window.renderTabBar === "function") {
    window.renderTabBar(
      containerId,
      [
        { name: "records", label: "Records", module: "records-edit" },
        {
          name: "lists-ranks",
          label: "Lists & Ranks",
          module: "lists-resources",
        },
        { name: "text-content", label: "Text Content", module: "text-blog" },
        {
          name: "configuration",
          label: "Configuration",
          module: "config-diagrams",
        },
      ],
      "text-content",
    );
  }

  // ============================================================================
  //   INITIALIZE — Load data and render
  // ============================================================================

  try {
    await loadBlogPosts();
    const loadingEl = document.getElementById("blog-loading-indicator");
    if (loadingEl) {
      loadingEl.classList.add("is-hidden");
    }
    renderEditor();
    wireEditorEvents();
  } catch (err) {
    const loadingEl = document.getElementById("blog-loading-indicator");
    if (loadingEl) {
      loadingEl.textContent = `Error loading blog posts: ${err.message}`;
      loadingEl.classList.remove("loading-placeholder");
      loadingEl.classList.add("error-message");
    }
  }
};
