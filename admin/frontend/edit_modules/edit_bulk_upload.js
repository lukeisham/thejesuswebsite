// =============================================================================
//   THE JESUS WEBSITE — BULK UPLOAD MODULE
//   File:    admin/frontend/edit_modules/edit_bulk_upload.js
//   Version: 1.0.0
//   Purpose: UI for bulk uploading CSV files to create records.
// =============================================================================

window.renderBulkUpload = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
        <div class="admin-module-header">
            <h2>Editing Module: Bulk Upload CSV</h2>
            <p class="text-sm text-muted">Technical Ledger Interface — Data Ingestion</p>
        </div>

        <div class="admin-card" id="bulk-upload-card" style="max-width: var(--content-max-width); margin: 0 auto;">
            <h3 class="font-serif" style="margin-bottom: var(--space-2);">Upload Database Records</h3>
            <p class="font-body text-sm" style="margin-bottom: var(--space-4);">Select or drag and drop a valid CSV file (max 5MB) to bulk create records. Must include 'title' and 'slug' columns.</p>
            
            <div id="drop-zone" style="border: var(--border-width-base) dashed var(--color-border); padding: var(--space-8); text-align: center; cursor: pointer; transition: var(--transition-base); background-color: var(--color-bg-secondary);">
                <p class="font-mono text-sm" style="color: var(--color-text-secondary); pointer-events: none;">DRAG & DROP CSV FILE HERE</p>
                <p class="font-mono text-xs" style="color: var(--color-text-muted); pointer-events: none;">OR CLICK TO BROWSE</p>
                <input type="file" id="csv-file-input" accept=".csv" style="display: none;">
            </div>

            <div id="selected-file-display" class="is-hidden font-mono text-sm" style="margin-top: var(--space-4); padding: var(--space-2); border: var(--border-width-thin) solid var(--color-border); background-color: var(--color-bg-primary);">
                <span id="file-name"></span>
                <button id="clear-file-btn" class="quick-action-btn" style="float: right; margin-top: -4px;">Clear</button>
            </div>

            <div id="upload-status-area" class="status-feedback is-hidden" style="margin-top: var(--space-4);">
                <div class="status-indicator-block">
                    <span id="status-icon" class="status-dot"></span>
                    <span id="status-text" class="status-text-mono"></span>
                </div>
            </div>

            <div id="upload-results" class="is-hidden" style="margin-top: var(--space-6);">
                <h4 class="font-serif">Upload Results</h4>
                <div id="success-summary" class="text-sm" style="color: var(--color-status-success); margin-bottom: var(--space-2);"></div>
                <ul id="error-list" class="text-sm font-mono" style="color: var(--color-accent-primary); list-style-type: none; padding: 0; max-height: 200px; overflow-y: auto; border: 1px solid var(--color-border); margin-top: var(--space-2); display: none;">
                </ul>
            </div>

            <footer class="admin-action-bar" style="margin-top: var(--space-8); position: relative; display: flex; justify-content: flex-end;">
                <button id="upload-submit-btn" class="btn-primary" disabled>Start Upload</button>
            </footer>
        </div>
    `;

    container.innerHTML = html;

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const selectedFileDisplay = document.getElementById('selected-file-display');
    const fileNameDisplay = document.getElementById('file-name');
    const clearFileBtn = document.getElementById('clear-file-btn');
    const submitBtn = document.getElementById('upload-submit-btn');
    const statusArea = document.getElementById('upload-status-area');
    const statusText = document.getElementById('status-text');
    const resultsContainer = document.getElementById('upload-results');
    const successSummary = document.getElementById('success-summary');
    const errorList = document.getElementById('error-list');

    let currentFile = null;

    // Drag and Drop Logic
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--color-accent-primary)';
        dropZone.style.backgroundColor = 'var(--color-bg-primary)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--color-border)';
        dropZone.style.backgroundColor = 'var(--color-bg-secondary)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--color-border)';
        dropZone.style.backgroundColor = 'var(--color-bg-secondary)';
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    clearFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        selectedFileDisplay.classList.add('is-hidden');
        dropZone.classList.remove('is-hidden');
        submitBtn.disabled = true;
        hideResults();
        hideStatus();
    });

    function handleFileSelect(file) {
        hideResults();
        hideStatus();
        
        // Client-side validation
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showStatus('ERROR: FILE MUST BE A .CSV', 'error');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showStatus('ERROR: FILE EXCEEDS 5MB LIMIT', 'error');
            return;
        }

        currentFile = file;
        fileNameDisplay.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
        selectedFileDisplay.classList.remove('is-hidden');
        dropZone.classList.add('is-hidden');
        submitBtn.disabled = false;
    }

    function showStatus(message, type) {
        statusArea.className = `status-feedback status-${type}`;
        statusText.innerText = message.toUpperCase();
        statusArea.classList.remove('is-hidden');

        if (type === 'loading') {
            statusArea.classList.add('pulse-animation');
        } else {
            statusArea.classList.remove('pulse-animation');
        }
    }

    function hideStatus() {
        statusArea.classList.add('is-hidden');
    }

    function hideResults() {
        resultsContainer.classList.add('is-hidden');
        errorList.innerHTML = '';
        errorList.style.display = 'none';
        successSummary.textContent = '';
    }

    submitBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        submitBtn.disabled = true;
        clearFileBtn.disabled = true;
        hideResults();
        showStatus('UPLOADING AND PROCESSING...', 'loading');

        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            const response = await fetch('/api/admin/bulk-upload', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showStatus('UPLOAD SUCCESSFUL', 'success');
                successSummary.textContent = result.message;
                resultsContainer.classList.remove('is-hidden');
                
                // Clear the file
                currentFile = null;
                fileInput.value = '';
                setTimeout(() => {
                    selectedFileDisplay.classList.add('is-hidden');
                    dropZone.classList.remove('is-hidden');
                    clearFileBtn.disabled = false;
                }, 2000);
            } else {
                showStatus('UPLOAD FAILED WITH ERRORS', 'error');
                if (result.errors && result.errors.length > 0) {
                    errorList.innerHTML = result.errors.map(err => `<li>- ${err}</li>`).join('');
                    errorList.style.display = 'block';
                } else if (result.detail) {
                    errorList.innerHTML = `<li>- ${result.detail}</li>`;
                    errorList.style.display = 'block';
                }
                resultsContainer.classList.remove('is-hidden');
                submitBtn.disabled = false;
                clearFileBtn.disabled = false;
            }
        } catch (error) {
            showStatus('NETWORK ERROR', 'error');
            errorList.innerHTML = `<li>- ${error.message}</li>`;
            errorList.style.display = 'block';
            resultsContainer.classList.remove('is-hidden');
            submitBtn.disabled = false;
            clearFileBtn.disabled = false;
        }
    });
};
