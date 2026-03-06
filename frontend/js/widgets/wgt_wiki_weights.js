/**
 * Wiki Ranking Weights Widget
 * Handles fetching, displaying, and editing Wikipedia ranking weights.
 */

export default {
    init() {
        const widget = document.getElementById('wgt-wiki-weights');
        if (!widget) return;

        const triggerBtn = widget.querySelector('.wgt-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.fetchWeights());
        }

        this.setupCrudForm();
    },

    async fetchWeights() {
        const widget = document.getElementById('wgt-wiki-weights');
        const statusLabel = widget.querySelector('.wgt-status-label');
        const trafficLight = widget.querySelector('.traffic-light');

        statusLabel.textContent = 'Fetching...';
        trafficLight.className = 'traffic-light status-active';

        try {
            const response = await fetch('/api/v1/weights/wikipedia');
            if (!response.ok) throw new Error('Failed to fetch weights');

            const weights = await response.json();

            // Push to System Data Viewer
            this.updateViewer(weights);

            statusLabel.textContent = 'Updated';
            trafficLight.className = 'traffic-light status-active';
            setTimeout(() => {
                statusLabel.textContent = 'Idle';
                trafficLight.className = 'traffic-light status-idle';
            }, 3000);

        } catch (error) {
            console.error('Wiki Weights Error:', error);
            statusLabel.textContent = 'Error';
            trafficLight.className = 'traffic-light status-error';
        }
    },

    updateViewer(weights) {
        const viewerList = document.getElementById('viewer-results-list');
        const viewerStatus = document.getElementById('viewer-status-indicator');

        if (!viewerList) return;

        viewerStatus.textContent = '[SYSTEM MODE - WEIGHTS]';
        viewerList.innerHTML = '';

        if (weights.length === 0) {
            viewerList.innerHTML = '<li>No weights defined.</li>';
            return;
        }

        weights.forEach(weight => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.gap = '10px';
            li.style.alignItems = 'flex-start';
            li.style.padding = '8px 0';
            li.style.borderBottom = '1px solid #eee';

            const encoded = encodeURIComponent(JSON.stringify(weight));

            li.innerHTML = `
                <input type="checkbox" class="viewer-checkbox" style="margin-top: 4px;">
                <div class="viewer-data-content" data-raw="${encoded}" style="flex: 1; font-size: 0.85rem;">
                    <strong>${weight.name}</strong> 
                    <span style="color: #666;">(${weight.match_target}: ${weight.match_value})</span>
                    <span style="float: right; font-weight: bold; color: ${weight.weight_score >= 0 ? 'green' : 'red'};">
                        ${weight.weight_score >= 0 ? '+' : ''}${weight.weight_score}
                    </span>
                </div>
            `;
            viewerList.appendChild(li);
        });

        // Switch viewer tab to Weights if it exists
        const weightsTab = document.querySelector('.tab[data-target="view-weights"]');
        if (weightsTab) weightsTab.click();
    },

    setupCrudForm() {
        const saveBtn = document.getElementById('save-weight');
        const clearBtn = document.getElementById('clear-weight-form');
        if (!saveBtn || !clearBtn) return;

        clearBtn.addEventListener('click', () => this.clearForm());

        saveBtn.addEventListener('click', async () => {
            const weight = {
                id: document.getElementById('weight-id').value,
                name: document.getElementById('weight-name').value,
                match_target: document.getElementById('weight-target').value,
                match_value: document.getElementById('weight-value').value,
                weight_score: parseInt(document.getElementById('weight-score').value)
            };

            if (!weight.name || isNaN(weight.weight_score)) {
                alert('Please provide a name and numeric score.');
                return;
            }

            try {
                const method = weight.id ? 'PUT' : 'POST';
                const url = weight.id ? `/api/v1/weights/wikipedia/${weight.id}` : '/api/v1/weights/wikipedia';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(weight)
                });

                if (response.ok) {
                    alert('Weight saved successfully!');
                    this.fetchWeights();
                    this.clearForm();
                } else {
                    throw new Error('Save failed');
                }
            } catch (error) {
                console.error('Save Weight Error:', error);
                alert('Error saving weight');
            }
        });

        // Handle "Edit in CRUD" from the viewer
        // We listen on the global viewer action button
        const editBtn = document.getElementById('btn-viewer-edit');
        if (editBtn) {
            const originalClick = editBtn.onclick; // Capture if any
            editBtn.addEventListener('click', () => {
                // Check if we are in Weights mode
                const viewerStatus = document.getElementById('viewer-status-indicator');
                if (viewerStatus.textContent.includes('WEIGHTS')) {
                    this.handleViewerEdit();
                }
            });
        }
    },

    handleViewerEdit() {
        const checkedItems = document.querySelectorAll('.viewer-checkbox:checked');
        if (checkedItems.length !== 1) return;

        const dataDiv = checkedItems[0].nextElementSibling;
        if (dataDiv && dataDiv.classList.contains('viewer-data-content')) {
            const rawData = decodeURIComponent(dataDiv.getAttribute('data-raw') || '');
            try {
                const weight = JSON.parse(rawData);

                // Populate the Form
                document.getElementById('weight-id').value = weight.id;
                document.getElementById('weight-name').value = weight.name;
                document.getElementById('weight-target').value = weight.match_target;
                document.getElementById('weight-value').value = weight.match_value;
                document.getElementById('weight-score').value = weight.weight_score;

                // Shift Tab
                const weightsTab = document.querySelector('.tab[data-target="crud-weights"]');
                if (weightsTab) weightsTab.click();

                // Scroll up
                window.scrollTo({ top: 0, behavior: 'smooth' });

            } catch (e) {
                console.error('Parse error during weight edit', e);
            }
        }
    },

    clearForm() {
        document.getElementById('weight-id').value = '';
        document.getElementById('weight-name').value = '';
        document.getElementById('weight-target').value = 'url';
        document.getElementById('weight-value').value = '';
        document.getElementById('weight-score').value = '';
    }
};

// Auto-init for module
document.addEventListener('DOMContentLoaded', () => {
    // Since this is a module, we don't need a global but we'll export it.
    // The dashboard loading it will run this DOMContentLoaded or we can call it.
    import('./wgt_wiki_weights.js').then(module => {
        module.default.init();
    });
});
