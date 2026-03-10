/**
 * system_feed.js
 * Handles unified polling of system metrics and updates dashboard widgets/feed.
 * Powered by /api/v1/system/feed
 */

const alertCache = new Set(); // Deduplication for alerts

export function initSystemFeed() {
    console.log("System Feed: Initializing passive monitoring...");

    // Initial fetch
    fetchSystemFeed();

    // Poll every 60 minutes (as per plan)
    // Note: In a production app, we might want this more frequent, 
    // but we are following the SYSTEM_DATA_VIEWER_REFACTOR.md spec.
    setInterval(fetchSystemFeed, 60 * 60 * 1000);
}

let lastFeedData = null;

async function fetchSystemFeed() {
    try {
        const response = await fetch('/api/v1/system/feed');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.status === "success") {
            lastFeedData = data.data;
            updateWidgets(lastFeedData);
            renderUnifiedFeed(lastFeedData);
            checkForAlerts(lastFeedData);
        }
    } catch (error) {
        console.error("System Feed: Fetch failed:", error);
    }
}

function updateWidgets(feed) {
    // 1. Contacts
    updateWidgetStatus('wgt-contact-triage', feed.contacts.length > 0 ? 'warning' : 'idle',
        `${feed.contacts.length} Unread`);

    // 2. Drafts
    const totalDrafts = feed.draft_counts.record_drafts + feed.draft_counts.essay_drafts;
    updateWidgetStatus('wgt-draft-results', totalDrafts > 0 ? 'active' : 'idle',
        `${totalDrafts} Pending`);

    // 3. Security
    updateWidgetStatus('wgt-security', feed.security_logs.length > 5 ? 'error' : 'active',
        `${feed.security_logs.length} Recent Logs`);

    // 4. Work Queue
    updateWidgetStatus('wgt-agent-workflow', feed.work_queue.length > 0 ? 'active' : 'idle',
        `${feed.work_queue.length} In Queue`);

    // 5. Reflections
    updateWidgetStatus('wgt-self-reflection', 'active', 'Monitoring');

    // 6. Spelling
    updateWidgetStatus('wgt-spelling', feed.spelling_errors.length > 0 ? 'warning' : 'active',
        `${feed.spelling_errors.length} Issues`);

    // 7. Deadlinks
    updateWidgetStatus('wgt-deadlinks', feed.deadlinks.length > 0 ? 'error' : 'active',
        `${feed.deadlinks.length} Broken`);

    // 8. Page Metrics
    updateWidgetStatus('wgt-page-metrics', 'active', 'Tracking');

    // 9. Server Metrics
    updateWidgetStatus('wgt-server-metrics', 'active',
        `CPU: ${feed.server_metrics.cpu_usage.toFixed(1)}%`);

    // 10. Trace
    updateWidgetStatus('wgt-core-agent', 'active', 'Online');
}

function updateWidgetStatus(widgetId, status, label) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;

    const light = widget.querySelector('.traffic-light');
    const labelEl = widget.querySelector('.wgt-status-label');

    if (light) {
        light.className = `traffic-light status-${status}`;
    }
    if (labelEl) {
        labelEl.textContent = label;
    }
}

function renderUnifiedFeed(feed) {
    const list = document.getElementById('viewer-results-list');
    if (!list) return;

    list.innerHTML = ''; // Clear for fresh render

    const categories = [
        { key: 'server_metrics', label: 'SERVER' },
        { key: 'token_metrics', label: 'TOKENS' },
        { key: 'security_logs', label: 'SECURITY' },
        { key: 'contacts', label: 'CONTACTS' },
        { key: 'work_queue', label: 'QUEUE' },
        { key: 'reflections', label: 'REFLECTION' },
        { key: 'page_metrics', label: 'METRICS' },
        { key: 'deadlinks', label: 'DEADLINKS' },
        { key: 'spelling_errors', label: 'SPELLING' }
    ];

    categories.forEach(cat => {
        const items = feed[cat.key] || [];
        if (items.length === 0 && cat.key !== 'server_metrics') return;

        const li = document.createElement('li');
        li.className = 'feed-category-header';
        li.style.cssText = 'padding: 4px 8px; background: #eee; font-size: 0.7rem; font-weight: bold; margin-top: 10px; border-radius: 4px;';
        li.textContent = cat.label;
        list.appendChild(li);

        if (cat.key === 'server_metrics') {
            const itemLi = document.createElement('li');
            itemLi.style.padding = '8px 0; border-bottom: 1px solid #eee; font-size: 0.8rem;';
            itemLi.innerHTML = `CPU: ${feed.server_metrics.cpu_usage.toFixed(1)}% | RAM: ${feed.server_metrics.memory_usage.toFixed(1)}%`;
            list.appendChild(itemLi);
        } else {
            items.slice(0, 5).forEach(item => {
                const itemLi = document.createElement('li');
                itemLi.style.padding = '8px 0; border-bottom: 1px solid #eee; font-size: 0.8rem;';
                itemLi.innerHTML = formatItemSummary(item, cat.key);
                list.appendChild(itemLi);
            });
        }
    });

    if (list.innerHTML === '') {
        list.innerHTML = '<li style="padding: 20px; text-align: center; color: #999;">No active system notifications.</li>';
    }
}

function formatItemSummary(item, key) {
    switch (key) {
        case 'spelling_errors':
            return `<strong>${item.bad_word}</strong> &rarr; ${item.suggestion || 'None'} <br><small>${item.context}</small>`;
        case 'deadlinks':
            return `<strong>${item.url}</strong> <span class="label" style="background:#fee2e2; color:#991b1b; padding: 2px 4px; border-radius: 3px; font-size: 0.7rem;">${item.status}</span>`;
        case 'security_logs':
            return `<strong>${item.event_type}</strong> - ${item.ip_address || 'Unknown IP'}`;
        case 'work_queue':
            return `<strong>${item.task_name}</strong> [${item.status}]`;
        case 'contacts':
            return `<strong>${item.name}</strong>: ${item.subject}`;
        case 'reflections':
            return `<small>${item.summary}</small>`;
        case 'page_metrics':
            return `<strong>${item.path}</strong>: ${item.view_count} views`;
        default:
            return JSON.stringify(item);
    }
}

function checkForAlerts(feed) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    // 1. Deadlinks Alert
    if (feed.deadlinks.length > 0) {
        const alertKey = `deadlinks-${feed.deadlinks.length}`;
        if (!alertCache.has(alertKey)) {
            injectAlert(chatContainer, `⚠️ System found ${feed.deadlinks.length} deadlinks that require replacement.`);
            alertCache.add(alertKey);
        }
    }

    // 2. Spelling Alert
    if (feed.spelling_errors.length > 0) {
        const alertKey = `spelling-${feed.spelling_errors.length}`;
        if (!alertCache.has(alertKey)) {
            injectAlert(chatContainer, `⚠️ Found ${feed.spelling_errors.length} new spelling errors in recent articles.`);
            alertCache.add(alertKey);
        }
    }

    // 3. Security Alert
    feed.security_logs.forEach(log => {
        if (log.event_type.toLowerCase().includes('fail') || log.event_type.toLowerCase().includes('unauthorized')) {
            const alertKey = `security-${log.timestamp}-${log.ip_address}`;
            if (!alertCache.has(alertKey)) {
                injectAlert(chatContainer, `🚨 Security Alert: ${log.event_type} detected from ${log.ip_address || 'unknown'}`);
                alertCache.add(alertKey);
            }
        }
    });
}

function injectAlert(container, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'system-alert';
    alertDiv.style.cssText = 'padding: 10px; margin: 10px 0; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; font-size: 0.9rem; color: #92400e; box-shadow: 0 1px 2px rgba(0,0,0,0.05);';
    alertDiv.innerHTML = `<div style="display:flex; gap:10px; align-items:center;">
        <span style="font-size:1.2rem;">ℹ️</span>
        <div>${message}</div>
    </div>`;
    container.appendChild(alertDiv);

    // Auto-scroll chat to show new alert
    container.scrollTop = container.scrollHeight;
}

// Automatically init if this is included
if (typeof window !== 'undefined') {
    window.initSystemFeed = initSystemFeed;
    // Expose alertCache for debugging/reset
    window.resetAlertCache = () => alertCache.clear();
}
