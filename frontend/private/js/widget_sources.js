// ==========================================
// SOURCE MANAGER WIDGET
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('sources-list');
    const searchInput = document.getElementById('search-sources-input');
    const addBtn = document.getElementById('add-source-btn');

    // Modal elements
    const modal = document.getElementById('source-editor-modal');
    const closeBtn = document.getElementById('source-close-btn');
    const saveBtn = document.getElementById('source-save-btn');
    const errorMsg = document.getElementById('source-error-msg');

    // Form inputs
    const authorNameInput = document.getElementById('source-edit-author-name');
    const authorOrcidInput = document.getElementById('source-edit-author-orcid');
    const titleInput = document.getElementById('source-edit-title');
    const pubNameInput = document.getElementById('source-edit-pub-name');
    const pubLinkInput = document.getElementById('source-edit-pub-link');
    const doiInput = document.getElementById('source-edit-doi');
    const typeSelect = document.getElementById('source-edit-type');
    const yearInput = document.getElementById('source-edit-year');

    let sources = [];

    // Initialize
    if (listEl && !listEl.dataset.wgtInit) {
        listEl.dataset.wgtInit = 'true';
        loadSources();

        searchInput.addEventListener('input', (e) => {
            renderSources(e.target.value);
        });

        addBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        saveBtn.addEventListener('click', saveSource);
    }

    // Toggle input visibility based on Source Type
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            const type = typeSelect.value;
            if (type === 'AcademicPaper') {
                doiInput.parentElement.style.display = 'flex';
                doiInput.parentElement.style.flexDirection = 'column';
                doiInput.parentElement.style.gap = '10px';
            } else {
                // Keep it simple since it's inside a flex column containing labels and inputs sequentially
                // In my html, label and input are siblings.
            }
        });
    }

    async function loadSources() {
        try {
            listEl.innerHTML = '<li><span style="color: #999;">Loading...</span></li>';
            const res = await fetch('/api/v1/sources');
            if (!res.ok) throw new Error('Fetch failed');
            sources = await res.json();
            renderSources('');
        } catch (err) {
            console.error('Error loading sources:', err);
            listEl.innerHTML = `<li><a href="#" style="color: red;">Error failed to load sources</a></li>`;
        }
    }

    function renderSources(filterText) {
        listEl.innerHTML = '';
        const filter = filterText.toLowerCase();

        const filtered = sources.filter(s => {
            const author = s.author.Name || s.author.Orcid || "";
            const txt = (s.title.text + " " + author).toLowerCase();
            return txt.includes(filter);
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `<li><a href="#">No sources found <span class="label" style="float: right;">—</span></a></li>`;
            return;
        }

        filtered.forEach(source => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.marginBottom = '0.5rem';

            const authorLabel = source.author.Name ? source.author.Name : source.author.Orcid;

            const link = document.createElement('a');
            link.href = "#";
            link.innerHTML = `[${source.source_type}] <strong>${authorLabel}</strong>: ${source.title.text}`;
            link.style.flex = "1";
            link.className = "nav-link";

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Del';
            delBtn.className = 'label';
            delBtn.style.cursor = 'pointer';
            delBtn.style.border = 'none';
            delBtn.style.background = '#ffdada';
            delBtn.style.color = 'red';
            delBtn.style.padding = '2px 6px';
            delBtn.style.borderRadius = '3px';

            delBtn.onclick = async (e) => {
                e.preventDefault();
                if (confirm('Delete this source?')) {
                    await deleteSource(source.id);
                }
            };

            li.appendChild(link);
            li.appendChild(delBtn);
            listEl.appendChild(li);
        });
    }

    async function deleteSource(id) {
        try {
            const res = await fetch(`/api/v1/admin/sources/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            await loadSources();
        } catch (err) {
            alert('Failed to delete source');
            console.error(err);
        }
    }

    function openModal() {
        errorMsg.style.display = 'none';

        // Reset form
        authorNameInput.value = '';
        authorOrcidInput.value = '';
        titleInput.value = '';
        pubNameInput.value = '';
        pubLinkInput.value = '';
        doiInput.value = '';
        typeSelect.value = 'Book';
        yearInput.value = '';

        typeSelect.dispatchEvent(new Event('change'));
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    async function saveSource() {
        errorMsg.style.display = 'none';

        const payload = {
            author_name: authorNameInput.value.trim() || null,
            author_orcid: authorOrcidInput.value.trim() || null,
            title_text: titleInput.value.trim(),
            publication_name: pubNameInput.value.trim() || null,
            publication_link: pubLinkInput.value.trim() || null,
            doi_link: doiInput.value.trim() || null,
            source_type_str: typeSelect.value,
            year: yearInput.value ? parseInt(yearInput.value) : null
        };

        if (!payload.title_text) {
            errorMsg.textContent = "Title is required.";
            errorMsg.style.display = "block";
            return;
        }

        if (!payload.author_name && !payload.author_orcid) {
            errorMsg.textContent = "Author Name or ORCID is required.";
            errorMsg.style.display = "block";
            return;
        }

        saveBtn.textContent = "Saving...";
        saveBtn.disabled = true;

        try {
            const res = await fetch('/api/v1/admin/sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text);
            }

            closeModal();
            await loadSources();
        } catch (err) {
            errorMsg.textContent = `Error: ${err.message}`;
            errorMsg.style.display = 'block';
        } finally {
            saveBtn.textContent = "Save Source";
            saveBtn.disabled = false;
        }
    }
});
