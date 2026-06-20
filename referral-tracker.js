/* ============================================================
   ELYSIUM CARE — PARTNER REFERRAL TRACKING SCRIPT  (v2)
   ============================================================
   What this does:
   1. Reads ?ref=CODE from the URL when someone lands on any page
   2. Stores it in the browser for 30 days so it survives across
      pages and return visits before they actually sign up
   3. Automatically adds a hidden "referral_code" field into every
      form on the page that uses Web3Forms (detected by the
      presence of an "access_key" hidden input — this matches
      how contactForm, applyForm, and affiliateForm are built,
      since they submit via JS fetch() rather than a form action)
   4. Appends [Ref: CODE] to the subject line so it's visible
      immediately in the email you receive
   5. Does nothing if there's no ref code present anywhere —
      completely safe to add to every page with zero side effects

   HOW TO INSTALL:
   Add this single line just before the closing </body> tag,
   on every page, in the same place:

      <script src="referral-tracker.js"></script>

   No other changes needed. Existing forms are not modified —
   this only adds one extra hidden field at submit time.
   ============================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "elysium_ref_code";
  var STORAGE_DATE_KEY = "elysium_ref_date";
  var EXPIRY_DAYS = 30;

  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function daysBetween(dateStr) {
    var stored = new Date(dateStr);
    var now = new Date();
    return (now - stored) / (1000 * 60 * 60 * 24);
  }

  function storeReferral(code) {
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem(STORAGE_DATE_KEY, new Date().toISOString());
    } catch (e) {
      /* localStorage unavailable — fail silently, tracking simply won't persist */
    }
  }

  function getStoredReferral() {
    try {
      var code = localStorage.getItem(STORAGE_KEY);
      var dateStr = localStorage.getItem(STORAGE_DATE_KEY);
      if (!code || !dateStr) return null;
      if (daysBetween(dateStr) > EXPIRY_DAYS) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_DATE_KEY);
        return null;
      }
      return code;
    } catch (e) {
      return null;
    }
  }

  function tagWeb3Forms(code) {
    var forms = document.querySelectorAll("form");
    forms.forEach(function (form) {
      // Identify Web3Forms forms by the presence of their access_key field
      // (these forms submit via fetch() in a submit listener, not a form action)
      var accessKeyField = form.querySelector('input[name="access_key"]');
      if (!accessKeyField) return;

      var existing = form.querySelector('input[name="referral_code"]');
      if (existing) {
        existing.value = code;
      } else {
        var hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = "referral_code";
        hidden.value = code;
        form.appendChild(hidden);
      }

      var subjectField = form.querySelector('input[name="subject"]');
      if (subjectField && subjectField.value.indexOf("[Ref:") === -1) {
        subjectField.value = subjectField.value + " [Ref: " + code + "]";
      }
    });
  }

  function init() {
    var urlCode = getUrlParam("ref");
    if (urlCode) {
      storeReferral(urlCode);
    }
    var activeCode = urlCode || getStoredReferral();
    if (activeCode) {
      tagWeb3Forms(activeCode);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
