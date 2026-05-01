// =============================================================================
//
//   THE JESUS WEBSITE — EDIT BLOGPOST MODULE
//   File:    js/6.0_news_blog/dashboard/edit_blogpost.js
//   Version: 2.1.0
//   Purpose: 3-column CRUD interface for authoring, editing, and deleting
//            blog posts. Loads real data from API — no mock rows.
//   Source:  guide_dashboard_appearance.md §6.2, guide_function.md §6.3
//
//   Changelog:
//     v2.1.0 — Providence grid refactor: split single container.innerHTML dump
//              into three _setColumn() / _clearColumnContent() calls targeting
//              "actions", "list", and "editor". Loading indicator renders into
//              the editor column. showSaveResult() appends into _getColumns().editor.
//              renderTabBar() continues passing containerId as-is.
//     v2.0.0 — Initial version with container.innerHTML injection.
//
// =============================================================================

// Trigger: dashboard_app.js routing -> window.renderEditBlogpost(containerId)
// Function: Fetches blog posts from API, renders 3-column Providence layout,
//           and manages create/edit/delete operations via PUT/DELETE
// Output: Populates the three Providence grid columns (canvas-col-actions,
//         canvas-col-list, canvas-col-editor) via _setColumn()

window.renderEditBlogpost = async function (containerId) {
  // containerId is "canvas-col-editor" when routed via dashboard_app.js loadModule().
  // We keep it for renderTabBar compatibility but no longer dump innerHTML into it.

  // ----- Render shell (loading state) into Providence columns -----
  // COL 1: Action buttons (placeholders shown while loading)
  _setColumn(
    "actions",
    "<!-- column_one: Action buttons -->" +
      '<button class="blog-editor-action-btn" id="blog-btn-save">Save Post</button>' +
      '<button class="blog-editor-action-btn" id="blog-btn-discard">Discard</button>' +
      '<button class="blog-editor-action-btn is-danger" id="blog-btn-delete">Delete Post</button>' +
      '<button class="blog-editor-action-btn" id="blog-btn-new">+ New Post</button>',
  );

  // COL 2: Existing Posts list (empty placeholder while loading)
  _setColumn(
    "list",
    "<!-- column_two: Existing Posts list -->" +
      '<p class="blog-editor-list-heading">Existing Posts</p>',
  );

  // COL 3: Loading indicator inside the editor column
  _setColumn(
    "editor",
    "<!-- column_three: Editor (loading) -->" +
      '<div class="loading-placeholder" id="blog-loading-indicator">Loading blog posts…</div>',
  );

  // ----- Internal state -----
  var blogPosts = []; // Array of { id, slug, blogposts (parsed), title, publish_date, author, body }
  var selectedPostId = null; // Currently selected post id (null = new post)

  // ----- Helper: get a reference to the editor column DOM element -----
  function _getEditorEl() {
    return document.getElementById("canvas-col-editor");
  }

  // ----- Helpers -----
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
    var dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toISOString().split("T")[0];
  }

  // ----- Fetch blog posts from API -----
  async function loadBlogPosts() {
    try {
      var listResponse = await fetch("/api/admin/records");
      if (!listResponse.ok) throw new Error("Failed to fetch records");
      var allRecords = await listResponse.json();

      // Fetch full details in parallel to check blogposts column
      var detailPromises = allRecords.map(async function (rec) {
        try {
          var resp = await fetch("/api/admin/records/" + rec.id);
          if (!resp.ok) return null;
          return await resp.json();
        } catch (_e) {
          return null;
        }
      });

      var details = await Promise.all(detailPromises);

      blogPosts = [];
      details.forEach(function (d) {
        if (d && d.blogposts && d.blogposts.trim() !== "") {
          var parsed;
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
    } catch (err) {
      throw err;
    }
  }

  // ----- Render the 3-column editor layout via Providence grid -----
  function renderEditor() {
    // --- COL 1: Action buttons (re-render to ensure fresh event bindings) ---
    _clearColumnContent("actions");
    _setColumn(
      "actions",
      "<!-- column_one: Action buttons -->" +
        '<button class="blog-editor-action-btn" id="blog-btn-save">Save Post</button>' +
        '<button class="blog-editor-action-btn" id="blog-btn-discard">Discard</button>' +
        '<button class="blog-editor-action-btn is-danger" id="blog-btn-delete">Delete Post</button>' +
        '<button class="blog-editor-action-btn" id="blog-btn-new">+ New Post</button>',
    );

    // --- COL 2: Existing Posts list ---
    var listHtml = "<!-- column_two: Existing Posts list -->";
    listHtml += '<p class="blog-editor-list-heading">Existing Posts</p>';

    if (blogPosts.length === 0) {
      listHtml += '<p class="blog-editor-empty-msg">No blog posts yet.</p>';
    } else {
      blogPosts.forEach(function (post) {
        var isSelected = post.id === selectedPostId;
        listHtml +=
          '<div class="blog-post-list-item' +
          (isSelected ? " is-selected" : "") +
          '" data-post-id="' +
          post.id +
          '">' +
          '<div class="blog-post-list-info">' +
          '<div class="blog-post-list-title">' +
          escapeHtml(post.title || "Untitled") +
          "</div>" +
          '<div class="blog-post-list-date">' +
          escapeHtml(formatDate(post.publish_date)) +
          "</div>" +
          "</div>" +
          '<div class="blog-post-list-actions">' +
          '<button class="blog-post-list-link" data-post-id="' +
          post.id +
          '" data-action="edit">Edit</button>' +
          '<button class="blog-post-list-link is-danger" data-post-id="' +
          post.id +
          '" data-action="delete">Delete</button>' +
          "</div>" +
          "</div>";
      });
    }

    _clearColumnContent("list");
    _setColumn("list", listHtml);

    // --- COL 3: Editor Form ---
    var currentPost = null;
    if (selectedPostId) {
      for (var i = 0; i < blogPosts.length; i++) {
        if (blogPosts[i].id === selectedPostId) {
          currentPost = blogPosts[i];
          break;
        }
      }
    }

    var editorHtml = "<!-- column_three: Editor form -->";

    // Publish Date
    editorHtml += '<div class="blog-editor-field">';
    editorHtml += '<label class="blog-editor-field-label">Publish Date</label>';
    editorHtml +=
      '<input type="date" class="blog-editor-field-input" id="blog-field-date" value="' +
      escapeHtml(formatDate(currentPost ? currentPost.publish_date : "")) +
      '">';
    editorHtml += "</div>";

    // Title
    editorHtml += '<div class="blog-editor-field">';
    editorHtml += '<label class="blog-editor-field-label">Title</label>';
    editorHtml +=
      '<input type="text" class="blog-editor-field-input" id="blog-field-title" placeholder="Post title…" value="' +
      escapeHtml(currentPost ? currentPost.title : "") +
      '">';
    editorHtml += "</div>";

    // Author
    editorHtml += '<div class="blog-editor-field">';
    editorHtml += '<label class="blog-editor-field-label">Author</label>';
    editorHtml +=
      '<input type="text" class="blog-editor-field-input" id="blog-field-author" placeholder="Author name…" value="' +
      escapeHtml(currentPost ? currentPost.author : "") +
      '">';
    editorHtml += "</div>";

    // Markdown Editor + Preview split
    editorHtml += '<div class="blog-editor-split">';

    // Markdown textarea
    editorHtml += '<div class="blog-editor-textarea-pane">';
    editorHtml += '<div class="blog-editor-pane-label">Markdown (Edit)</div>';
    editorHtml +=
      '<textarea class="blog-editor-textarea" id="blog-field-body" placeholder="Write blog post markdown here…">' +
      escapeHtml(currentPost ? currentPost.body : "") +
      "</textarea>";
    editorHtml += "</div>";

    // Live preview
    editorHtml += '<div class="blog-editor-textarea-pane">';
    editorHtml +=
      '<div class="blog-editor-pane-label is-preview">Live Preview</div>';
    editorHtml +=
      '<div class="blog-editor-preview-pane" id="blog-preview-pane"></div>';
    editorHtml += "</div>";

    editorHtml += "</div>"; // end .blog-editor-split

    _clearColumnContent("editor");
    _setColumn("editor", editorHtml);

    // ----- Wire column_two: Post list selection -----
    var listEl = _getColumns().list;
    if (listEl) {
      listEl.querySelectorAll("[data-action='edit']").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var postId = this.getAttribute("data-post-id");
          if (postId) {
            selectedPostId = postId;
            renderEditor();
            wireEditorEvents();
          }
        });
      });

      // ----- Wire column_two: Delete from list -----
      listEl.querySelectorAll("[data-action='delete']").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var postId = this.getAttribute("data-post-id");
          if (!postId) return;
          if (!confirm("Delete this blog post permanently?")) return;

          try {
            var resp = await fetch("/api/admin/records/" + postId, {
              method: "DELETE",
              credentials: "include",
            });

            if (resp.ok) {
              // Remove from local list
              blogPosts = blogPosts.filter(function (p) {
                return p.id !== postId;
              });
              if (selectedPostId === postId) {
                selectedPostId = null;
              }
              renderEditor();
              wireEditorEvents();
            } else {
              alert("Delete failed: " + resp.statusText);
            }
          } catch (err) {
            alert("Delete failed: " + err.message);
          }
        });
      });
    }

    // ----- Wire column_three: Live preview on body input -----
    var bodyField = document.getElementById("blog-field-body");
    var previewPane = document.getElementById("blog-preview-pane");
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

  // ----- Wire column_one action buttons -----
  function wireColumnOneButtons() {
    // Save button
    var saveBtn = document.getElementById("blog-btn-save");
    if (saveBtn) {
      var newSave = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSave, saveBtn);
      newSave.addEventListener("click", handleSave);
    }

    // Discard button
    var discardBtn = document.getElementById("blog-btn-discard");
    if (discardBtn) {
      var newDiscard = discardBtn.cloneNode(true);
      discardBtn.parentNode.replaceChild(newDiscard, discardBtn);
      newDiscard.addEventListener("click", function () {
        selectedPostId = null;
        renderEditor();
        wireEditorEvents();
      });
    }

    // Delete button
    var deleteBtn = document.getElementById("blog-btn-delete");
    if (deleteBtn) {
      var newDelete = deleteBtn.cloneNode(true);
      deleteBtn.parentNode.replaceChild(newDelete, deleteBtn);
      newDelete.addEventListener("click", async function () {
        if (!selectedPostId) {
          alert("No post selected to delete.");
          return;
        }
        if (!confirm("Delete this blog post permanently?")) return;

        try {
          var resp = await fetch("/api/admin/records/" + selectedPostId, {
            method: "DELETE",
            credentials: "include",
          });

          if (resp.ok) {
            blogPosts = blogPosts.filter(function (p) {
              return p.id !== selectedPostId;
            });
            selectedPostId = null;
            renderEditor();
            wireEditorEvents();
          } else {
            alert("Delete failed: " + resp.statusText);
          }
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      });
    }

    // New Post button
    var newBtn = document.getElementById("blog-btn-new");
    if (newBtn) {
      var newNew = newBtn.cloneNode(true);
      newBtn.parentNode.replaceChild(newNew, newBtn);
      newNew.addEventListener("click", function () {
        selectedPostId = null;
        renderEditor();
        wireEditorEvents();
      });
    }
  }

  // ----- Handle Save -----
  async function handleSave() {
    var dateField = document.getElementById("blog-field-date");
    var titleField = document.getElementById("blog-field-title");
    var authorField = document.getElementById("blog-field-author");
    var bodyField = document.getElementById("blog-field-body");

    if (!dateField || !titleField || !authorField || !bodyField) return;

    var blogData = {
      publish_date: dateField.value || "",
      title: titleField.value || "",
      author: authorField.value || "",
      body: bodyField.value || "",
    };

    var payload = {
      blogposts: JSON.stringify(blogData),
    };

    try {
      if (selectedPostId) {
        // Update existing record's blogposts column
        var resp = await fetch("/api/admin/records/" + selectedPostId, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (resp.ok) {
          showSaveResult("Post saved successfully.", "is-success");
          // Reload posts to refresh list
          await loadBlogPosts();
          renderEditor();
          wireEditorEvents();
        } else {
          var errData;
          try {
            errData = await resp.json();
          } catch (_) {
            errData = {};
          }
          showSaveResult(
            "Save failed: " + (errData.detail || resp.statusText),
            "is-error",
          );
        }
      } else {
        // Create a new record with blogposts
        var newRecord = {
          title: titleField.value || "Untitled Blog Post",
          slug: "blog-" + Date.now(),
          blogposts: JSON.stringify(blogData),
        };

        var resp = await fetch("/api/admin/records", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord),
        });

        if (resp.ok) {
          var created = await resp.json();
          showSaveResult("New post created successfully.", "is-success");
          await loadBlogPosts();
          // Select the newly created post
          if (created.id) {
            selectedPostId = created.id;
          }
          renderEditor();
          wireEditorEvents();
        } else {
          var errData;
          try {
            errData = await resp.json();
          } catch (_) {
            errData = {};
          }
          showSaveResult(
            "Create failed: " + (errData.detail || resp.statusText),
            "is-error",
          );
        }
      }
    } catch (err) {
      showSaveResult("Save failed: " + err.message, "is-error");
    }
  }

  // ----- Show save result message -----
  function showSaveResult(msg, type) {
    var editorEl = _getEditorEl();
    if (!editorEl) return;

    // Remove any existing save-result indicator from the editor column
    var existing = editorEl.querySelector(".save-result-indicator");
    if (existing) existing.remove();

    var indicator = document.createElement("div");
    indicator.className = "save-result-indicator " + type;
    indicator.textContent = msg;
    editorEl.appendChild(indicator);
  }

  // ----- Wire editor events after re-render -----
  function wireEditorEvents() {
    // This is called after renderEditor() to wire any dynamic events.
    // The post list and save buttons are already wired inside renderEditor.
    // If there's a currently selected post, scroll to it.
    var listEl = _getColumns().list;
    if (listEl) {
      var selectedEl = listEl.querySelector(".blog-post-list-item.is-selected");
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  // ----- Render top-level section tab bar -----
  // Shows [ Records ] [ Lists & Ranks ] [ Text Content (Active) ] [ Configuration ]
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

  // ----- Initialize: Load data and render -----
  try {
    await loadBlogPosts();
    var loadingEl = document.getElementById("blog-loading-indicator");
    if (loadingEl) {
      loadingEl.classList.add("is-hidden");
    }
    renderEditor();
    wireEditorEvents();
  } catch (err) {
    var loadingEl = document.getElementById("blog-loading-indicator");
    if (loadingEl) {
      loadingEl.textContent = "Error loading blog posts: " + err.message;
      loadingEl.classList.remove("loading-placeholder");
      loadingEl.classList.add("error-message");
    }
  }
};
