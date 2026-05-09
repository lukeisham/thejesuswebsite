// Trigger:  Included via <script> in dashboard.html. Called by any dashboard
//           module on load (restore) and on auto-save / explicit save (stash).
//           Also called on logout to clear stashed state.
// Main:    Two functions:
//            window.stashFieldState(moduleName, fieldData) — serializes current
//              form state to sessionStorage[namespace + '/' + moduleName].
//            window.restoreFieldState(moduleName) — returns previously stashed
//              state for the given module, or null if none exists.
//            window.clearFieldState(moduleName) — removes stashed state for
//              a specific module.
//            window.clearAllFieldStates() — removes all stashed field states
//              for the current session.
// Output:  Form state persisted in sessionStorage, keyed by admin session JWT
//          and module name. Survives page navigation / refresh within the same
//          browser tab. Cleared on explicit Publish or logout.

"use strict";

/* -----------------------------------------------------------------------------
   INTERNAL: _getNamespace
   Reads the admin_session JWT cookie and uses it as a namespace key.
   Falls back to 'anonymous' if no cookie is found.

   Returns:
     (string) — the namespace key for sessionStorage
----------------------------------------------------------------------------- */
function _getNamespace() {
  // Read the admin_session cookie
  var cookies = document.cookie.split("; ");
  for (var i = 0; i < cookies.length; i++) {
    var parts = cookies[i].split("=");
    if (parts[0] === "admin_session") {
      return "tjw_field_cache_" + parts[1];
    }
  }
  return "tjw_field_cache_anonymous";
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: stashFieldState
   Serializes current form state to sessionStorage for the given module.
   Called on every auto-save or explicit save.

   Parameters:
     moduleName (string) — the module identifier (e.g., "records-single",
                           "blog-posts", "essay-historiography")
     fieldData (Object)  — the form data to persist (key-value pairs)

   Returns:
     (boolean) — true if successfully stored
----------------------------------------------------------------------------- */
function stashFieldState(moduleName, fieldData) {
  try {
    var namespace = _getNamespace();
    var key = namespace + "/" + moduleName;
    var payload = {
      data: fieldData,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn("[field_persistence] Failed to stash state:", err);
    return false;
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: restoreFieldState
   Returns previously stashed state for the given module, or null if none
   exists or if the session has changed.

   Parameters:
     moduleName (string) — the module identifier

   Returns:
     (Object|null) — the stashed field data, or null
----------------------------------------------------------------------------- */
function restoreFieldState(moduleName) {
  try {
    var namespace = _getNamespace();
    var key = namespace + "/" + moduleName;
    var raw = sessionStorage.getItem(key);
    if (!raw) return null;

    var parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch (err) {
    console.warn("[field_persistence] Failed to restore state:", err);
    return null;
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: clearFieldState
   Removes stashed state for a specific module.

   Parameters:
     moduleName (string) — the module identifier
----------------------------------------------------------------------------- */
function clearFieldState(moduleName) {
  try {
    var namespace = _getNamespace();
    var key = namespace + "/" + moduleName;
    sessionStorage.removeItem(key);
  } catch (err) {
    console.warn("[field_persistence] Failed to clear state:", err);
  }
}

/* -----------------------------------------------------------------------------
   MAIN FUNCTION: clearAllFieldStates
   Removes all stashed field states for the current session namespace.
   Called on logout.
----------------------------------------------------------------------------- */
function clearAllFieldStates() {
  try {
    var namespace = _getNamespace();
    var prefix = namespace + "/";
    var keysToRemove = [];

    for (var i = 0; i < sessionStorage.length; i++) {
      var key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(function (key) {
      sessionStorage.removeItem(key);
    });

    console.log(
      "[field_persistence] Cleared",
      keysToRemove.length,
      "field state(s) for session.",
    );
  } catch (err) {
    console.warn("[field_persistence] Failed to clear all states:", err);
  }
}

/* -----------------------------------------------------------------------------
   GLOBAL EXPOSURE
----------------------------------------------------------------------------- */
window.stashFieldState = stashFieldState;
window.restoreFieldState = restoreFieldState;
window.clearFieldState = clearFieldState;
window.clearAllFieldStates = clearAllFieldStates;
