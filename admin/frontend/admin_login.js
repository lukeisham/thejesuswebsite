// =============================================================================
//
//   THE JESUS WEBSITE — ADMIN LOGIN LOGIC
//   File:    admin/frontend/admin_login.js
//   Version: 1.1.0
//   Purpose: Handles login form submission, authentication requests, and JWT state.
//
// =============================================================================

// Trigger: DOMContentLoaded on admin.html login view
// Function: Intercepts login form submission, posts credentials to /api/admin/login, and handles success or error state
// Output: Hides login view and reveals dashboard app on success, or displays error message on failure

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('admin-login-form');
    const errorDiv = document.getElementById('login-error');
    const passwordInput = document.getElementById('admin-password');
    const submitBtn = document.getElementById('login-submit-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Clear previous errors and indicate loading
            errorDiv.classList.remove('is-visible');
            errorDiv.classList.add('is-hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Authenticating...';

            const password = passwordInput.value;

            try {
                // In Phase 3 (task 24), this will hit the backend API (backend/admin_api.py).
                // We stub the fetch logic here to ensure the infrastructure is ready.
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password: password })
                });

                if (response.ok) {
                    // Success! JWT token expects to be set as HttpOnly cookie by backend.
                    transitionToDashboard();
                } else {
                    // Handle error (401 Unauthorized, 429 Too Many Requests, etc.)
                    // E.g., read the error payload if exists
                    let errData;
                    try {
                        errData = await response.json();
                    } catch(jsonErr) {
                        errData = { detail: 'Authentication failed.' };
                    }
                    throw new Error(errData.detail || 'Authentication failed.');
                }
            } catch (error) {
                // Currently simulating error since backend doesn't exist yet
                console.warn("Backend API not found, simulating error. Real error:", error);
                
                // For demonstration/testing before Task 24 is built:
                if (password === 'admin') {
                    console.log('Test override accepted for UI development.');
                    transitionToDashboard();
                } else {
                    // Display actual error message
                    errorDiv.textContent = error.message;
                    errorDiv.classList.remove('is-hidden');
                    errorDiv.classList.add('is-visible');
                }
            } finally {
                // Reset button state
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                passwordInput.value = '';
            }
        });
    }

    function transitionToDashboard() {
        // Hide login view, show dashboard app
        const loginView = document.getElementById('login-view');
        const dashboardApp = document.getElementById('dashboard-app');
        
        if (loginView) {
            loginView.classList.add('is-hidden');
            loginView.classList.remove('is-visible-flex');
        }
        if (dashboardApp) {
            dashboardApp.classList.remove('is-hidden');
            dashboardApp.classList.add('is-visible');
            dashboardApp.innerHTML = `
                <div style="padding: var(--space-8); text-align: center;">
                    <h2 class="font-serif text-2xl">Dashboard Authorized</h2>
                    <p class="text-muted mt-4">Module loading awaiting Task 23 implementation...</p>
                </div>
            `;
        }
        
        // Trigger custom event so dashboard components can initialize
        window.dispatchEvent(new Event('adminAuthSuccess'));
    }
});
