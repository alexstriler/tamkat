/*
 * Exports the site's contents into formats that can't run JavaScript.
 *
 *   node tools/export.js
 *
 * Writes:
 *   exports/canvas.html    paste into a Canvas page via the HTML editor
 *   exports/handout.html   import into Google Docs (File > Open > Upload)
 *
 * Pulls live from the Google Sheet when it's reachable, so a re-run always
 * reflects the current list; falls back to data/fallback.js otherwise.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://alexstriler.github.io/tamkat/";

/* ---------- load ---------------------------------------------------------- */

global.window = {};
require(path.join(ROOT, "data", "fallback.js"));
const local = global.window.TAMKAT_FALLBACK;

const SHEET_ID = (fs.readFileSync(path.join(ROOT, "assets", "app.js"), "utf8")
  .match(/const SHEET_ID = "([^"]*)"/) || [])[1];

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

async function loadResources() {
  if (!SHEET_ID) return { rows: local.resources, source: "local copy" };
  try {
    // no gid or sheet name: gviz defaults to the first tab, whatever it's called
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCSV(await res.text());
    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const out = rows.slice(1).map((cells) => {
      const o = {};
      headers.forEach((h, i) => { o[h] = (cells[i] || "").trim(); });
      return o;
    }).filter((r) => r.title && (r.status || "live").toLowerCase() === "live");
    if (!out.length) throw new Error("no usable rows");
    return { rows: out, source: "the Google Sheet" };
  } catch (err) {
    return { rows: local.resources, source: `local copy (Sheet unreachable: ${err.message})` };
  }
}

/* ---------- helpers ------------------------------------------------------- */

const esc = (s) => String(s || "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);

const grades = (r) => String(r.grades || "").split(",").map((s) => s.trim()).filter(Boolean).join(" · ");

function group(resources) {
  return local.categories.slice().sort(byOrder).map((cat) => ({
    cat,
    items: resources.filter((r) => (r.category || "").toLowerCase() === cat.key).sort(byOrder)
  }));
}

/* ---------- Canvas -------------------------------------------------------- */

/* Canvas strips <style> blocks, <script>, and external stylesheets. Everything
   here is an inline style attribute on the element itself, which survives. */
function canvasHTML(resources) {
  const parts = [];

  parts.push(
    `<h2 style="margin:0 0 4px;">Many Ways In. No Ceiling.</h2>`,
    `<p style="margin:0 0 4px;font-size:1.05em;color:#0E8C9E;"><em>Every student can enter. Every student can excel.</em></p>`,
    `<p style="margin:0 0 18px;color:#4A5A70;">Rich mathematics with multiple entry points and endless room to extend thinking &mdash; sorted by what you want students to do, not by who made it.</p>`,
    `<p style="margin:0 0 22px;padding:12px 14px;background:#F4F6F9;border-left:4px solid #E1701A;">`,
    `<strong>This list is kept current on the web.</strong> `,
    `<a href="${SITE}" target="_blank" rel="noopener">Open the live version</a> `,
    `for search, grade-band filters, and filtering by Standard for Mathematical Practice.</p>`
  );

  group(resources).forEach(({ cat, items }) => {
    if (!items.length) return;
    parts.push(
      `<h3 style="margin:26px 0 2px;color:${cat.color};border-bottom:3px solid ${cat.color};padding-bottom:5px;">${esc(cat.title)}</h3>`,
      `<p style="margin:6px 0 2px;font-size:.9em;font-weight:bold;letter-spacing:.05em;text-transform:uppercase;color:${cat.color};">${esc(cat.subtitle)}</p>`,
      `<p style="margin:0 0 12px;color:#4A5A70;">${esc(cat.blurb)}</p>`,
      `<ul style="margin:0 0 6px;padding-left:22px;">`
    );

    items.forEach((r) => {
      const name = r.url
        ? `<a href="${esc(r.url)}" target="_blank" rel="noopener"><strong>${esc(r.title)}</strong></a>`
        : `<strong>${esc(r.title)}</strong> <span style="color:#7A8798;font-size:.85em;">(link coming soon)</span>`;
      const bits = [];
      if (r.lens) bits.push(`<em style="color:${cat.color};">${esc(r.lens)}</em>`);
      const g = grades(r);
      if (g) bits.push(`<span style="color:#7A8798;">${esc(g)}</span>`);
      if (r.note) bits.push(`<span style="color:#7A8798;">${esc(r.note)}</span>`);
      parts.push(`<li style="margin-bottom:9px;">${name}<br>${bits.join(' <span style="color:#DFE5EC;">|</span> ')}</li>`);
    });

    parts.push(`</ul>`);
  });

  parts.push(
    `<p style="margin-top:28px;padding-top:12px;border-top:1px solid #DFE5EC;color:#7A8798;font-size:.9em;">`,
    `Compiled by Alex Striler. Always current at <a href="${SITE}" target="_blank" rel="noopener">${SITE}</a>.</p>`
  );

  return parts.join("\n");
}

/* ---------- Google Docs --------------------------------------------------- */

/* Docs' HTML importer understands headings, bold, italic, lists and links, and
   ignores most styling — so this stays structural and lets Docs do the rest. */
function handoutHTML(resources) {
  const parts = [
    `<html><head><meta charset="utf-8"><title>Many Ways In. No Ceiling.</title></head><body>`,
    `<h1>Many Ways In. No Ceiling.</h1>`,
    `<p><i>Every student can enter. Every student can excel.</i></p>`,
    `<p>Rich mathematics with multiple entry points and endless room to extend thinking &mdash; sorted by what you want students to do, not by who made it.</p>`,
    `<p><b>Always current at <a href="${SITE}">${SITE}</a></b>, where you can also search and filter by grade band and Standard for Mathematical Practice.</p>`,
    `<hr>`
  ];

  group(resources).forEach(({ cat, items }) => {
    if (!items.length) return;
    parts.push(`<h2>${esc(cat.title)}</h2>`);
    parts.push(`<p><b>${esc(cat.subtitle)}</b><br><i>${esc(cat.blurb)}</i></p>`);
    parts.push(`<ul>`);
    items.forEach((r) => {
      const name = r.url
        ? `<a href="${esc(r.url)}"><b>${esc(r.title)}</b></a>`
        : `<b>${esc(r.title)}</b> (link coming soon)`;
      const tail = [r.lens, grades(r), r.note].filter(Boolean).map(esc).join(" — ");
      parts.push(`<li>${name}${tail ? `<br>${tail}` : ""}</li>`);
    });
    parts.push(`</ul>`);
  });

  parts.push(`<hr><p>Compiled by Alex Striler.</p></body></html>`);
  return parts.join("\n");
}

/* ---------- go ------------------------------------------------------------ */

(async () => {
  const { rows, source } = await loadResources();
  const dir = path.join(ROOT, "exports");
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "canvas.html"), canvasHTML(rows));
  fs.writeFileSync(path.join(dir, "handout.html"), handoutHTML(rows));

  const linked = rows.filter((r) => r.url).length;
  console.log(`Read ${rows.length} resources from ${source}.`);
  console.log(`  ${linked} have links, ${rows.length - linked} still say "link coming soon".`);
  console.log(`Wrote exports/canvas.html and exports/handout.html`);
})();
