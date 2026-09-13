const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("frontend/index.html", "utf8");
const script = fs.readFileSync("frontend/script.js", "utf8");

function selectMarkup(id) {
  const match = html.match(new RegExp(`<select id="${id}">([\\s\\S]*?)<\\/select>`));
  assert.ok(match, `${id} must exist`);
  return match[1];
}

for (const id of ["register-role", "google-role", "login-role"]) {
  assert.match(selectMarkup(id), /value="candidate"/, `${id} must offer Candidate`);
  assert.match(selectMarkup(id), /value="recruiter"/, `${id} must offer Recruiter`);
  assert.match(selectMarkup(id), /value="admin"/, `${id} must offer Admin`);
}

assert.match(
  script,
  /login-password"\)\.value = account\.password/,
  "saved account selection must fill the password"
);

console.log("Registration policy frontend checks passed.");
