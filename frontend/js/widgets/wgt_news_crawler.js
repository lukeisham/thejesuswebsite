/**
 * News Crawler Widget
 * Handles triggering news harvests and displaying status.
 */

export default {
    init() {
        const widget = document.getElementById('wgt-news-crawler');
        if (!widget) return;

        const triggerBtn = widget.querySelector('.wgt-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', () => this.runCrawler());
        }
    },

    async runCrawler() {
        const widget = document.getElementById('wgt-news-crawler');
        const statusLabel = widget.querySelector('.wgt-status-label');
        const trafficLight = widget.querySelector('.traffic-light');

        statusLabel.textContent = 'Crawling...';
        trafficLight.className = 'traffic-light status-active';

        try {
            const response = await fetch('/api/v1/news_run', { method: 'POST' });
            if (!response.ok) throw new Error('Crawl trigger failed');

            const message = await response.text();
            console.log('Crawler Response:', message);

            statusLabel.textContent = 'Completed';
            trafficLight.className = 'traffic-light status-active';

            // Pulse the other widgets if needed, but for now just success
            setTimeout(() => {
                statusLabel.textContent = 'Idle';
                trafficLight.className = 'traffic-light status-idle';
            }, 3000);

        } catch (error) {
            console.error('News Crawler Error:', error);
            statusLabel.textContent = 'Error';
            trafficLight.className = 'traffic-light status-error';
        }
    }
};

// Auto-init for module
document.addEventListener('DOMContentLoaded', () => {
    import('./wgt_news_crawler.js').then(module => {
        module.default.init();
    });
});
