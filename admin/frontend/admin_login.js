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

document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('admin-login-form');
    const errorDiv = document.getElementById('login-error');
    const passwordInput = document.getElementById('admin-password');
    const submitBtn = document.getElementById('login-submit-btn');

    // --- Auto-Session Check on Load ---
    if (typeof window.verifyAdminSession === 'function') {
        const isValid = await window.verifyAdminSession();
        if (isValid) {
            console.log("Existing valid session found. Auto-transitioning to dashboard.");
            transitionToDashboard();
            return;
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            errorDiv.classList.remove('is-visible');
            errorDiv.classList.add('is-hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Authenticating...';

            const password = passwordInput.value;

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                });

                if (response.ok) {
                    transitionToDashboard();
                } else {
                    let errData;
                    try {
                        errData = await response.json();
                    } catch(jsonErr) {
                        errData = { detail: 'Authentication failed.' };
                    }
                    throw new Error(errData.detail || 'Invalid credentials.');
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.remove('is-hidden');
                errorDiv.classList.add('is-visible');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                passwordInput.value = '';
            }
        });
    }

    function transitionToDashboard() {
        const loginView = document.getElementById('login-view');
        const dashboardApp = document.getElementById('dashboard-app');
        
        if (loginView) {
            loginView.classList.add('is-hidden');
            loginView.classList.remove('is-visible-flex');
        }
        if (dashboardApp) {
            dashboardApp.classList.remove('is-hidden');
            dashboardApp.classList.add('is-visible');
            // innerHTML will be populated by dashboard_app.js upon receiving the event
        }
        
        window.dispatchEvent(new Event('adminAuthSuccess'));
    }
});
