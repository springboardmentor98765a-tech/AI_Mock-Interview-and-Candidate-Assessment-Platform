const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("frontend/index.html", "utf8");
const script = fs.readFileSync("frontend/script.js", "utf8");

assert.match(html, /id="feedbackForm"/, "the landing page must contain the feedback form");
assert.doesNotMatch(html, /support@aiinterviewpro\.com|Hyderabad, Telangana|9876543210/, "invented company contact details must be removed");
assert.match(script, /API_BASE_URL \+ "\/feedback"/, "feedback must be submitted to the backend");
assert.match(script, /loginEmailInput\.readOnly = true/, "saved-account mode must suppress native address suggestions");
assert.match(html, /name="aiip_account_picker"/, "the login email field must not be identified as a browser address field");

console.log("Feedback and login-picker regression checks passed.");
