const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("frontend/index.html", "utf8");
const script = fs.readFileSync("frontend/script.js", "utf8");
const css = fs.readFileSync("frontend/style.css", "utf8");

for (const id of ["heroGetStarted", "heroLearnMore", "footerRegister", "footerLogin", "footerOpenLogin", "pageProgress"]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must exist`);
}

const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] || "";
assert.doesNotMatch(footer, /href="#"(?:\s|>)/, "the footer must not contain dead social links");
assert.match(script, /heroGetStarted.*registerBtn\.click/, "Get Started must open registration");
assert.match(script, /heroLearnMore/, "the secondary hero action must be wired");
assert.match(script, /IntersectionObserver/, "homepage sections must use progressive reveal navigation");
assert.match(css, /\.site-footer/, "the redesigned footer styles must exist");

console.log("Homepage interaction and footer checks passed.");
