// Trigger:  User clicks "Run All Tests", "Run API Tests", or "Run Agent Tests"
//           buttons in the System dashboard testing section.
// Main:    executeTestSuite(suiteType) — sends a POST request to the backend
//           to trigger the specified test suite, then pipes the live test
//           output into the test console element. Disables buttons during
//           execution and re-enables them on completion.
// Output:  Live test output streamed into #test-output-content.
//           Errors routed via window.surfaceError().

'use strict';

/* -----------------------------------------------------------------------------
   MODULE STATE
----------------------------------------------------------------------------- */
let _isRunning = false;

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: executeTestSuite
   Triggers a test suite execution on the backend and displays results.

   Parameters:
     suiteType — 'all' | 'api' | 'agent' | 'port'
----------------------------------------------------------------------------- */
async function executeTestSuite(suiteType) {
    if (_isRunning) return;

    _isRunning = true;
    _disableButtons(true);

    const consoleEl = document.getElementById('test-output-content');
    if (consoleEl) {
        consoleEl.textContent = `Starting ${_suiteLabel(suiteType)} test suite...\n`;
    }

    try {
        // Map suite type to the appropriate backend endpoint
        let endpoint;
        let testLabel;

        switch (suiteType) {
            case 'all':
                endpoint = '/api/admin/tests/run';
                testLabel = 'All Tests';
                break;
            case 'api':
                endpoint = '/api/admin/tests/run?suite=api';
                testLabel = 'API Tests';
                break;
            case 'agent':
                endpoint = '/api/admin/tests/run?suite=agent';
                testLabel = 'Agent Tests';
                break;
            case 'port':
                endpoint = '/api/admin/tests/run?suite=port';
                testLabel = 'Port Tests';
                break;
            default:
                throw new Error('Unknown test suite: ' + suiteType);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(function () { return ''; });
            throw new Error(
                'Test suite failed to start (HTTP ' + response.status + '). ' +
                (errorText || 'Check server logs for details.')
            );
        }

        const result = await response.json();

        // Display test results
        if (consoleEl) {
            const output = _formatTestOutput(result, testLabel);
            consoleEl.textContent += output + '\n';
            consoleEl.textContent += 'Test suite completed.\n';

            // Scroll to bottom
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    } catch (err) {
        console.error('[test_execution_logic] Test execution failed:', err);

        if (consoleEl) {
            consoleEl.textContent +=
                `\nERROR: ${err.message}\n`;
            consoleEl.textContent += 'Test suite aborted.\n';
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }

        if (typeof window.surfaceError === 'function') {
            window.surfaceError(
                'Error: Test suite failed to start. Check server logs for details.'
            );
        }
    } finally {
        _isRunning = false;
        _disableButtons(false);
    }
}

/* -----------------------------------------------------------------------------
   INTERNAL: _formatTestOutput
   Formats the JSON response from the test suite trigger into readable text.
----------------------------------------------------------------------------- */
function _formatTestOutput(result, testLabel) {
    let output = '';

    output += `Suite: ${testLabel}\n`;
    output += `Status: ${result.status || 'unknown'}\n`;

    if (result.results && Array.isArray(result.results)) {
        result.results.forEach(function (r) {
            const status = r.passed ? 'PASS' : 'FAIL';
            const name = r.name || r.test || 'unnamed';
            output += `  [${status}] ${name}`;
            if (r.message) {
                output += ` — ${r.message}`;
            }
            output += '\n';
        });
    }

    if (result.summary) {
        output += `\nSummary: ${result.summary}\n`;
    }

    return output;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _suiteLabel
   Returns a human-readable label for a given suite type.
----------------------------------------------------------------------------- */
function _suiteLabel(suiteType) {
    const labels = {
        all: 'All',
        api: 'API',
        agent: 'Agent',
        port: 'Port',
    };
    return labels[suiteType] || suiteType;
}

/* -----------------------------------------------------------------------------
   INTERNAL: _disableButtons
   Enables or disables all test execution buttons.
----------------------------------------------------------------------------- */
function _disableButtons(disabled) {
    const btnIds = ['btn-run-all-tests', 'btn-run-api-tests', 'btn-run-agent-tests'];

    btnIds.forEach(function (id) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = disabled;
            if (disabled) {
                btn.setAttribute('data-original-text', btn.textContent);
                btn.textContent = 'Running...';
            } else {
                const original = btn.getAttribute('data-original-text');
                if (original) {
                    btn.textContent = original;
                    btn.removeAttribute('data-original-text');
                }
            }
        }
    });
}

/* -----------------------------------------------------------------------------
   PUBLIC: initTestExecution
   Called by dashboard_system.js when the System module is loaded.
   Wires click handlers to the test execution buttons.
----------------------------------------------------------------------------- */
function initTestExecution() {
    const btnAll = document.getElementById('btn-run-all-tests');
    const btnApi = document.getElementById('btn-run-api-tests');
    const btnAgent = document.getElementById('btn-run-agent-tests');

    if (btnAll) {
        btnAll.addEventListener('click', function () {
            executeTestSuite('all');
        });
    }

    if (btnApi) {
        btnApi.addEventListener('click', function () {
            executeTestSuite('api');
        });
    }

    if (btnAgent) {
        btnAgent.addEventListener('click', function () {
            executeTestSuite('agent');
        });
    }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.executeTestSuite = executeTestSuite;
window.initTestExecution = initTestExecution;
