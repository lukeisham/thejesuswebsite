/**
 * widget_user_manager.js
 * ──────────────────────
 * Fetches the user list from the backend for the Admin dashboard
 * and provides UI controls to add or remove contributors.
 */

(function initUserManager() {
    "use strict";

    var userList = document.getElementById("user-list");
    var addBtn = document.getElementById("add-user-btn");
    var emailInput = document.getElementById("new-user-email");

    if (!userList || userList.dataset.wgtInit) return;
    userList.dataset.wgtInit = "true";

    function renderUsers() {
        fetch("/api/v1/admin/users")
            .then(function (res) {
                if (!res.ok) throw new Error("Status " + res.status);
                return res.json();
            })
            .then(function (users) {
                userList.innerHTML = "";
                if (!users || users.length === 0) {
                    userList.innerHTML = '<li><a href="#" style="color: #999;">No users found <span class="label" style="float: right;">null</span></a></li>';
                    return;
                }

                users.forEach(function (user) {
                    var li = document.createElement("li");
                    // Base item displaying email
                    var content = '<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border-color);">';
                    content += '<span>' + user.email + ' <span class="label" style="font-size: 0.65rem; margin-left: 6px;">' + user.role + '</span></span>';

                    // Prevent deleting self, or we can just allow delete with caution
                    content += '<button class="delete-user-btn" data-id="' + user.id + '" style="background: none; border: none; color: red; cursor: pointer; font-size: 1rem;" title="Delete User">&times;</button>';
                    content += '</div>';

                    li.innerHTML = content;
                    userList.appendChild(li);
                });

                // Attach delete listeners
                var deleteBtns = userList.querySelectorAll(".delete-user-btn");
                deleteBtns.forEach(function (btn) {
                    btn.addEventListener("click", function (e) {
                        e.preventDefault();
                        var userId = btn.getAttribute("data-id");
                        if (confirm("Are you sure you want to remove this user's access?")) {
                            fetch("/api/v1/admin/users/" + userId, {
                                method: "DELETE"
                            }).then(function (res) {
                                if (res.ok) {
                                    renderUsers();
                                } else {
                                    alert("Failed to delete user.");
                                }
                            });
                        }
                    });
                });
            })
            .catch(function (e) {
                userList.innerHTML = '<li><a href="#" style="color: red;">Failed to load users</a></li>';
                console.error(e);
            });
    }

    if (addBtn && emailInput) {
        addBtn.addEventListener("click", function () {
            var email = emailInput.value.trim();
            if (!email) {
                alert("Please enter a valid email address.");
                return;
            }

            // All users are Admin
            var payload = {
                email: email,
                role: "Admin"
            };

            addBtn.disabled = true;
            addBtn.textContent = "Adding...";

            fetch("/api/v1/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).then(function (res) {
                addBtn.disabled = false;
                addBtn.textContent = "+ Add User";
                emailInput.value = "";

                if (res.ok) {
                    renderUsers();
                } else {
                    res.text().then(function (t) { alert("Error adding user: " + t); });
                }
            }).catch(function (e) {
                addBtn.disabled = false;
                addBtn.textContent = "+ Add User";
                console.error(e);
            });
        });
    }

    // Initial load
    renderUsers();
})();
