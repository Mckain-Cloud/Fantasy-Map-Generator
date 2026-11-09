#!/usr/bin/env node
/**
 * Codemod: convert page-per-test Playwright specs to the shared-page fixture.
 *
 *   node scripts/codemod-shared-page.mjs tests/unit            # rewrite in place
 *   node scripts/codemod-shared-page.mjs tests/unit --dry      # report only
 *
 * Handles the three shapes found in this repo:
 *   A) test.beforeEach(({page}) => { startCoverage; page.goto; waitForAppReady })
 *      + test.afterEach(({page}) => { stopCoverage; flushCoverage })
 *   B) let page; test.beforeAll(({browser}) => { page = await browser.newPage(); goto... })
 *      + test.afterAll(() => { ...; page.close() })
 *   C) already on shared-test.js (left alone)
 */

import fs from "fs";
import path from "path";

const [, , root = "tests/unit", flag] = process.argv;
const dry = flag === "--dry";

const NAV_LINE = /^\s*(await\s+)?(startCoverage\(|stopCoverage\(|flushCoverage\(|page\.goto\(|gotoApp\(|waitForAppReady\(|page\??\.close\(\)|page = await browser\.newPage\(|page = await context\.newPage\()/;
const HELPER_NAMES = ["startCoverage", "stopCoverage", "flushCoverage", "waitForAppReady", "gotoApp"];

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (p.endsWith(".spec.js")) yield p;
  }
}

/** Find `test.<hook>(async (...) => {` ... matching `});` and return [start, end). */
function findHookBlocks(src, hook) {
  const blocks = [];
  const re = new RegExp(`^[ \\t]*test\\.${hook}\\(async \\((?:\\{[^}]*\\}|[^)]*)\\) => \\{`, "gm");
  let m;
  while ((m = re.exec(src))) {
    let depth = 0;
    let i = m.index + m[0].length - 1; // at the opening brace
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    // consume `);` and the trailing newline
    let end = i + 1;
    while (end < src.length && /[ \t)]/.test(src[end])) end++;
    if (src[end] === ";") end++;
    if (src[end] === "\r") end++;
    if (src[end] === "\n") end++;
    blocks.push({start: m.index, end, header: m[0], body: src.slice(m.index + m[0].length, i)});
  }
  return blocks;
}

function rewriteHook(block, hook) {
  const lines = block.body.split("\n");
  const kept = lines.filter(l => l.trim() && !NAV_LINE.test(l) && !/^\s*\/\/\s*(Wait for|Clean|Start|Stop|Navigate)/i.test(l));
  const indent = block.header.match(/^[ \t]*/)[0];

  if (hook === "beforeAll" && /page = await (browser|context)\.newPage/.test(block.body)) {
    // Shape B: bind the outer `page` to the worker-scoped fixture
    const body = [`${indent}  page = appPage;`, ...kept].join("\n");
    return `${indent}test.beforeAll(async ({appPage}) => {\n${body}\n${indent}});\n`;
  }
  if (kept.length === 0) return ""; // hook did nothing but navigate / coverage
  const paramsMatch = block.header.match(/async \(([^)]*)\) =>/);
  const params = paramsMatch ? paramsMatch[1] : "";
  return `${indent}test.${hook}(async (${params}) => {\n${kept.join("\n")}\n${indent}});\n`;
}

function convert(src) {
  if (src.includes("setup/shared-test.js")) return {src, changed: false, note: "already shared"};
  if (!/from ['"]@playwright\/test['"]/.test(src)) return {src, changed: false, note: "no playwright import"};

  let out = src;

  // 1. hooks (process from the end so indices stay valid)
  for (const hook of ["afterAll", "beforeAll", "afterEach", "beforeEach"]) {
    const blocks = findHookBlocks(out, hook).reverse();
    for (const b of blocks) {
      if (!NAV_LINE.test(b.body) && !/startCoverage|stopCoverage|flushCoverage/.test(b.body)) continue;
      out = out.slice(0, b.start) + rewriteHook(b, hook) + out.slice(b.end);
    }
  }

  // 2. imports
  out = out.replace(/import\s*\{\s*test\s*,\s*expect\s*\}\s*from\s*['"]@playwright\/test['"];?/, m => {
    const depth = 2; // tests/<group>/<sub>/file.spec.js -> ../../setup
    return `import {test, expect} from "${"../".repeat(depth)}setup/shared-test.js";`;
  });
  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*['"]([./]*setup\/(?:helpers|coverageHelpers)\.js)['"];?\n?/g, (m, names, from) => {
    const remaining = names
      .split(",")
      .map(s => s.trim())
      .filter(n => n && !HELPER_NAMES.includes(n));
    return remaining.length ? `import {${remaining.join(", ")}} from "${from}";\n` : "";
  });

  // 3. tidy double blank lines left behind
  out = out.replace(/\n{3,}/g, "\n\n");
  return {src: out, changed: out !== src, note: ""};
}

let changed = 0;
for (const file of walk(root)) {
  const depthFromTests = path.relative("tests", file).split(path.sep).length - 1;
  const src = fs.readFileSync(file, "utf8");
  const result = convert(src);
  if (!result.changed) {
    console.log(`skip  ${file} ${result.note}`);
    continue;
  }
  // fix import depth for files not exactly two levels below tests/
  const fixed = result.src.replace('"../../setup/shared-test.js"', `"${"../".repeat(depthFromTests)}setup/shared-test.js"`);
  if (!dry) fs.writeFileSync(file, fixed);
  changed++;
  console.log(`${dry ? "would" : "wrote"} ${file}`);
}
console.log(`${changed} file(s) ${dry ? "would change" : "changed"}`);
