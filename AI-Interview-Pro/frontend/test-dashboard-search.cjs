const assert = require("node:assert/strict");
const fs = require("node:fs");

const tools = fs.readFileSync(require.resolve("./dashboard-tools.js"), "utf8");
const admin = fs.readFileSync(require.resolve("./admin-live.js"), "utf8");

assert.match(tools, /data-evidence-id/, "interview evidence must have its own action target");
assert.doesNotMatch(
  tools,
  /Interview evidence[\s\S]{0,500}href="notifications\.html"/,
  "interview evidence must not route to notifications"
);
assert.match(tools, /completed_interview=/, "candidate evidence should open the completed interview report");
assert.match(tools, /openSharedReport/, "recruiter evidence should open the authorized shared report");
assert.match(tools, /adminInterviewSearch/, "admin evidence should locate the matching activity record");
assert.match(admin, /Candidate, domain or interview ID/, "admin activity must support evidence lookup");

console.log("Dashboard search routing checks passed.");
