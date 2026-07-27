#!/usr/bin/env node
/**
 * Build verification for the AI Interview Management Platform.
 * The project is a static site (HTML5 + CSS3 + Vanilla JS) with no
 * bundler, so "building" means validating that every required file
 * exists, is non-empty, and is structurally sound.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const required = [
  'index.html',
  'login.html',
  'candidate.html',
  'recruiter.html',
  'admin.html',
  'css/style.css',
  'js/script.js',
  'images/logo.svg',
];

let errors = 0;
let checks = 0;

function fail(msg) {
  console.error('  ✗ ' + msg);
  errors++;
}

function ok(msg) {
  console.log('  ✓ ' + msg);
  checks++;
}

console.log('\nAI Interview Management Platform — build verification\n');

// 1. Required files exist and are non-empty
console.log('Checking required files:');
for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fail('Missing: ' + rel);
    continue;
  }
  const stat = fs.statSync(abs);
  if (stat.size === 0) {
    fail('Empty: ' + rel);
    continue;
  }
  ok(rel + ' (' + stat.size + ' bytes)');
}

// 2. HTML structural sanity
console.log('\nChecking HTML structure:');
const htmlFiles = required.filter((f) => f.endsWith('.html'));
for (const rel of htmlFiles) {
  const abs = path.join(root, rel);
  const src = fs.readFileSync(abs, 'utf8');
  const lower = src.toLowerCase();
  if (!lower.includes('<!doctype html>')) fail(rel + ': missing <!DOCTYPE html>');
  else ok(rel + ': has <!DOCTYPE html>');
  if (!lower.includes('</html>')) fail(rel + ': missing </html>');
  else ok(rel + ': has </html>');
  if (!/<head[\s>]/i.test(src)) fail(rel + ': missing <head>');
  else ok(rel + ': has <head>');
  if (!/<body[\s>]/i.test(src)) fail(rel + ': missing <body>');
  else ok(rel + ': has <body>');
}

// 3. CSS/JS linkage in HTML
console.log('\nChecking asset linkage:');
for (const rel of htmlFiles) {
  const abs = path.join(root, rel);
  const src = fs.readFileSync(abs, 'utf8');
  if (!src.includes('css/style.css')) fail(rel + ': missing css/style.css link');
  else ok(rel + ': links css/style.css');
  if (!src.includes('js/script.js')) fail(rel + ': missing js/script.js link');
  else ok(rel + ': links js/script.js');
}

// 4. No forbidden frameworks/libraries actually imported or loaded.
//    We look for real usage (script src, npm import, CDN link, class names),
//    not bare words like "React" appearing as a skill/topic in copy text.
console.log('\nChecking for forbidden frameworks/libraries:');
const patterns = [
  /<script[^>]+src=["'][^"']*(react|vue|angular|tailwind|bootstrap)[^"']*["']/i,
  /<link[^>]+href=["'][^"']*(tailwind|bootstrap)[^"']*["']/i,
  /\bimport\s+[^;]*from\s+["'][^"']*(react|vue|angular|@vite|tailwind|bootstrap)[^"']*["']/i,
  /require\s*\(\s*["'][^"']*(react|vue|angular|@vite|tailwind|bootstrap)[^"']*["']\s*\)/i,
  /class=["'][^"']*(react|vue-component|tailwind|bootstrap)[^"']*["']/i,
];
let allClean = true;
for (const rel of htmlFiles.concat(['js/script.js', 'css/style.css'])) {
  const abs = path.join(root, rel);
  const src = fs.readFileSync(abs, 'utf8');
  for (const re of patterns) {
    const m = src.match(re);
    if (m) {
      fail(rel + ': forbidden framework reference: ' + m[0]);
      allClean = false;
    }
  }
}
if (allClean) ok('No forbidden frameworks/libraries detected');

// 5. JS syntax check via Node's parser
console.log('\nChecking JavaScript syntax:');
const jsPath = path.join(root, 'js/script.js');
try {
  new Function(fs.readFileSync(jsPath, 'utf8'));
  ok('js/script.js parses without syntax errors');
} catch (e) {
  fail('js/script.js syntax error: ' + e.message);
}

// 6. Role routing sanity in login page
console.log('\nChecking login role routing:');
const loginSrc = fs.readFileSync(path.join(root, 'login.html'), 'utf8');
for (const role of ['candidate', 'recruiter', 'admin']) {
  const dest = role + '.html';
  if (loginSrc.includes(dest) || fs.readFileSync(path.join(root, 'js/script.js'), 'utf8').includes(dest)) {
    ok('routes to ' + dest);
  } else {
    fail('no route to ' + dest);
  }
}

// Summary
console.log('\n────────────────────────────────────────');
console.log('  Checks passed: ' + checks);
console.log('  Checks failed: ' + errors);
console.log('────────────────────────────────────────\n');

if (errors > 0) {
  console.error('BUILD FAILED with ' + errors + ' error(s)\n');
  process.exit(1);
} else {
  console.log('BUILD SUCCEEDED — open InterviewDashboard/index.html in a browser\n');
  process.exit(0);
}
