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

    // 2. Drafts — API returns feed.drafts { records, essays, responses }
    const totalDrafts = (feed.drafts.records || 0) + (feed.drafts.essays || 0) + (feed.drafts.responses || 0);
    updateWidgetStatus('wgt-draft-results', totalDrafts > 0 ? 'active' : 'idle',
        `${totalDrafts} Pending`);

    // 3. Security — API field is feed.security (not feed.security_logs)
    updateWidgetStatus('wgt-security', feed.security.length > 5 ? 'error' : 'active',
        `${feed.security.length} Recent Logs`);

    // 4. Work Queue
    updateWidgetStatus('wgt-agent-workflow', feed.work_queue.length > 0 ? 'active' : 'idle',
        `${feed.work_queue.length} In Queue`);

    // 5. Reflections
    updateWidgetStatus('wgt-self-reflection', 'active', 'Monitoring');

    // 6. Spelling — API field is feed.spelling (not feed.spelling_errors)
    updateWidgetStatus('wgt-spelling', feed.spelling.length > 0 ? 'warning' : 'active',
        `${feed.spelling.length} Issues`);

    // 7. Deadlinks
    updateWidgetStatus('wgt-deadlinks', feed.deadlinks.length > 0 ? 'error' : 'active',
        `${feed.deadlinks.length} Broken`);

    // 8. Page Metrics
    updateWidgetStatus('wgt-page-metrics', 'active', 'Tracking');

    // 9. Server Metrics — API returns string fields: ram_usage, disk_usage, llm_api, tokens_today/week/month
    //    There is no cpu_usage field; use ram_usage as primary indicator.
    updateWidgetStatus('wgt-server-metrics', 'active',
        `RAM: ${feed.server_metrics.ram_usage}`);

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
        { key: 'security', label: 'SECURITY' },
        { key: 'contacts', label: 'CONTACTS' },
        { key: 'work_queue', label: 'QUEUE' },
        { key: 'reflections', label: 'REFLECTION' },
        { key: 'trace', label: 'AGENT TRACE' },
        { key: 'page_metrics', label: 'METRICS' },
        { key: 'deadlinks', label: 'DEADLINKS' },
        { key: 'spelling', label: 'SPELLING' }
    ];

    categories.forEach(cat => {
        const items = feed[cat.key] || [];
        if (items.length === 0 && cat.key !== 'server_metrics') return;

        const li = document.createElement('li');
        li.className = 'feed-category-header';
        li.textContent = cat.label;
        list.appendChild(li);

        if (cat.key === 'server_metrics') {
            const itemLi = document.createElement('li');
            const sm = feed.server_metrics;
            itemLi.innerHTML = `RAM: ${sm.ram_usage} | Disk: ${sm.disk_usage} | LLM: ${sm.llm_api}<br>`
                + `Tokens: ${sm.tokens_today} today / ${sm.tokens_week} this week / ${sm.tokens_month} this month`;
            list.appendChild(itemLi);
        } else {
            items.slice(0, 5).forEach(item => {
                const itemLi = document.createElement('li');
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
        case 'spelling':
            // SpellingIssue fields: bad_word, suggestion (Option), text, context, severity
            return `<strong>${item.bad_word}</strong> &rarr; ${item.suggestion || 'None'} <br><small>${item.context}</small>`;
        case 'deadlinks':
            // DeadlinkIssue fields: id, url, status, context, last_checked
            return `<strong>${item.url}</strong> <span class="label" style="background:#fee2e2; color:#991b1b; padding: 2px 4px; border-radius: 3px; font-size: 0.7rem;">${item.status}</span>`;
        case 'security':
            // SecurityLogResponse fields: event_type, created_at, ip_address, details
            return `<strong>${item.event_type}</strong> - ${item.ip_address || 'Unknown IP'}`;
        case 'work_queue':
            // WorkQueueItem fields: task, status, description (Option)
            return `<strong>${item.task}</strong> [${item.status}]`;
        case 'contacts':
            return `<strong>${item.name}</strong>: ${item.subject}`;
        case 'reflections':
            // ReflectionResponse fields: reflection (not summary)
            return `<small>${item.reflection}</small>`;
        case 'trace':
            // AgentTraceStep fields: action (Option), reasoning (Option)
            return `<small>${item.action || item.reasoning || JSON.stringify(item)}</small>`;
        case 'page_metrics':
            // PageMetric fields: page_id (not path), views (not view_count), avg_time_on_page, bounce_rate
            return `<strong>${item.page_id}</strong>: ${item.views} views`;
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

    // 2. Spelling Alert — API field is feed.spelling
    if (feed.spelling.length > 0) {
        const alertKey = `spelling-${feed.spelling.length}`;
        if (!alertCache.has(alertKey)) {
            injectAlert(chatContainer, `⚠️ Found ${feed.spelling.length} new spelling errors in recent articles.`);
            alertCache.add(alertKey);
        }
    }

    // 3. Security Alert — API field is feed.security; timestamp field is created_at
    feed.security.forEach(log => {
        if (log.event_type.toLowerCase().includes('fail') || log.event_type.toLowerCase().includes('unauthorized')) {
            const alertKey = `security-${log.created_at}-${log.ip_address}`;
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
