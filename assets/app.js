/* ==========================================================================
   TAMKAT — Low Floor / High Ceiling
   Reads content from the shared Google Sheet, falls back to data/fallback.js.
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIG — the only part you ever need to touch in this file.
   Paste the Google Sheet ID between the quotes. It's the long string in the
   Sheet's own address, between /d/ and /edit:
     docs.google.com/spreadsheets/d/THIS_PART_RIGHT_HERE/edit
   Leave it empty and the page just runs on the saved copy in data/fallback.js.
   -------------------------------------------------------------------------- */
const SHEET_ID = "1stxk5HimPx40nFTl6MG_Uw4oCqtpOxsn9voe_G8mz9Q";

/* Resources come from the first tab by position (gid 0) so renaming it can't
   break anything. Categories are looked up by tab name and are optional. */
const TABS = { resources: 0, categories: "categories" };
const GRADE_BANDS = ["K-2", "3-5", "6-8"];

const SMPS = [
  { n: 1, short: "Make sense & persevere" },
  { n: 2, short: "Reason quantitatively" },
  { n: 3, short: "Construct arguments" },
  { n: 4, short: "Model with mathematics" },
  { n: 5, short: "Use tools strategically" },
  { n: 6, short: "Attend to precision" },
  { n: 7, short: "Look for structure" },
  { n: 8, short: "Repeated reasoning" }
];

const state = {
  categories: [],
  resources: [],
  grade: "",          // "" = all bands
  smps: new Set(),    // empty = all practices
  query: "",
  source: "fallback"  // or "sheet"
};

const $ = (sel) => document.querySelector(sel);

/* ---------- CSV ----------------------------------------------------------- */

/* Hand-rolled because Sheets exports RFC-4180 CSV and teachers will absolutely
   type commas, quotes and line breaks into these cells. */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
}

async function fetchTab(tab) {
  const selector = typeof tab === "number"
    ? "gid=" + tab
    : "sheet=" + encodeURIComponent(tab);
  const url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
              "/gviz/tq?tqx=out:csv&" + selector;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(tabName + ": HTTP " + res.status);
  return rowsToObjects(parseCSV(await res.text()));
}

/* ---------- Normalizing --------------------------------------------------- */

const splitList = (s) =>
  String(s || "").split(/[,;|]/).map((x) => x.trim()).filter(Boolean);

/* Deliberately forgiving. Practices are single digits 1-8, so pull the digits
   out and ignore how they were typed — "1 3 6", "1, 3, 6" and "SMP1/SMP3" all
   work. Google Sheets has a habit of reformatting number-ish cells, and a
   teacher's tagging shouldn't break because of it. */
function parseSMPs(value) {
  const found = String(value || "").match(/[1-8]/g) || [];
  return [...new Set(found.map(Number))];
}

function normalizeCategory(row, i) {
  return {
    key: (row.key || row.category || "").trim().toLowerCase(),
    title: row.title || row.key || "Untitled",
    subtitle: row.subtitle || "",
    blurb: row.blurb || "",
    color: row.color || "#0E8C9E",
    order: Number(row.order) || (i + 1) * 10
  };
}

function normalizeResource(row, i) {
  const title = row.title || "Untitled";
  return {
    category: (row.category || "").trim().toLowerCase(),
    title: title,
    lens: row.lens || row.descriptor || "",
    url: (row.url || "").trim(),
    grades: splitList(row.grades),
    smps: parseSMPs(row.smps),
    icon: row.icon || defaultIcon(title),
    note: row.note || "",
    order: Number(row.order) || (i + 1) * 10,
    status: (row.status || "live").trim().toLowerCase()
  };
}

function loadFallback() {
  const data = window.TAMKAT_FALLBACK || { categories: [], resources: [] };
  state.categories = data.categories.map(normalizeCategory).sort(byOrder);
  state.resources = data.resources.map(normalizeResource)
    .filter((r) => r.status === "live").sort(byOrder);
  state.source = "fallback";
}

const byOrder = (a, b) => a.order - b.order;

/* The Sheet's icon column is optional. Leave it blank and the resource keeps
   the icon it has here, which spares editors from hunting for an emoji — and
   spares the Sheet from mangling one on the way in. */
let iconIndex = null;
function defaultIcon(title) {
  if (!iconIndex) {
    iconIndex = new Map(
      (window.TAMKAT_FALLBACK.resources || []).map((r) => [r.title.toLowerCase(), r.icon])
    );
  }
  return iconIndex.get(title.toLowerCase()) || "•";
}

/* The categories tab is optional. Most of the time the six sections don't
   change, so the Sheet can be a single simple list of resources; add a
   `categories` tab only when you want to rename, recolor, or add a section. */
async function loadSheet() {
  if (!SHEET_ID) return false;

  const [res, cats] = await Promise.all([
    fetchTab(TABS.resources),
    fetchTab(TABS.categories).catch(() => [])
  ]);

  const resources = res.map(normalizeResource)
    .filter((r) => r.status === "live" && r.title && r.category).sort(byOrder);

  /* A Sheet that comes back empty or malformed is worse than the saved copy —
     keep the fallback rather than showing an empty page. */
  if (!resources.length) throw new Error("Sheet returned no usable resource rows");

  const fromSheet = cats.map(normalizeCategory).filter((c) => c.key).sort(byOrder);
  const categories = fromSheet.length ? fromSheet : builtInCategories();

  state.categories = withUnlistedCategories(categories, resources);
  state.resources = resources;
  state.source = "sheet";
  return true;
}

function builtInCategories() {
  return (window.TAMKAT_FALLBACK.categories || []).map(normalizeCategory).sort(byOrder);
}

/* If someone invents a new category in the resources tab without defining it
   anywhere, still show it rather than silently swallowing their rows. */
function withUnlistedCategories(categories, resources) {
  const known = new Set(categories.map((c) => c.key));
  const extras = [];
  resources.forEach((r) => {
    if (r.category && !known.has(r.category)) {
      known.add(r.category);
      extras.push({
        key: r.category,
        title: titleCase(r.category),
        subtitle: "",
        blurb: "",
        color: "#5A6B85",
        order: 9000 + extras.length
      });
    }
  });
  return categories.concat(extras);
}

const titleCase = (key) => key.replace(/[-_]+/g, " ")
  .replace(/\b\w/g, (ch) => ch.toUpperCase());

/* ---------- Filtering ----------------------------------------------------- */

function matches(resource) {
  if (state.grade && resource.grades.length && !resource.grades.includes(state.grade)) return false;

  if (state.smps.size) {
    if (!resource.smps.length) return false;
    if (!resource.smps.some((n) => state.smps.has(n))) return false;
  }

  if (state.query) {
    const cat = state.categories.find((c) => c.key === resource.category);
    const hay = [resource.title, resource.lens, resource.note, cat ? cat.title : "", cat ? cat.subtitle : ""]
      .join(" ").toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

const isFiltered = () => Boolean(state.grade || state.smps.size || state.query);

/* ---------- Rendering ----------------------------------------------------- */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/* The directory is the main navigation: every category laid out as a panel
   with all of its options visible underneath, no hovering required. Each row
   is a link straight to that resource. */
function buildDirectory() {
  const grid = $("#directory");
  grid.textContent = "";

  state.categories.forEach((cat) => {
    const items = state.resources.filter((r) => r.category === cat.key && matches(r));

    const panel = el("section", "panel");
    panel.style.setProperty("--cat", cat.color);

    const head = el("a", "panel__head");
    head.href = "#cat-" + cat.key;
    head.append(el("h3", "panel__title", cat.title));
    if (cat.subtitle) head.append(el("p", "panel__sub", cat.subtitle));
    panel.append(head);

    const list = el("div", "panel__list");
    items.forEach((r) => list.append(makeOption(r, cat)));

    if (!items.length) {
      list.append(el("p", "panel__empty", isFiltered()
        ? "Nothing here matches the current filters."
        : "Nothing in this category yet."));
    }
    panel.append(list);
    grid.append(panel);
  });
}

/* One row per resource. A row with a link is a real anchor straight to the
   resource; a row still waiting on its link stays visible but reads as
   not-ready, and clicking it goes to the card rather than nowhere. */
function makeOption(resource, cat) {
  const hasLink = Boolean(resource.url);
  const row = el(hasLink ? "a" : "button", "option" + (hasLink ? "" : " option--pending"));

  if (hasLink) {
    row.href = resource.url;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
  } else {
    row.type = "button";
    row.title = "Link coming soon \u2014 this opens the card on the page";
    row.addEventListener("click", () => revealCard(cat.key, resource.title));
  }

  const text = el("span", "option__text");
  const name = el("span", "option__name");
  name.append(document.createTextNode(resource.title), el("span", "option__caret", "\u203a"));
  text.append(name);
  if (resource.lens) text.append(el("span", "option__lens", resource.lens));
  row.append(text);

  if (!hasLink) row.append(el("span", "option__soon", "soon"));

  const badge = el("span", "option__badge", resource.icon);
  badge.setAttribute("aria-hidden", "true");
  row.append(badge);

  return row;
}

/* Rows without a link yet still do something useful: scroll to the card and
   flash it, so nobody clicks into a dead end.

   The jump also pushes a history entry, so the phone's back gesture returns you
   to where you were reading instead of leaving the site. Without this, tapping
   a row on a phone was a one-way trip. */
let returnScroll = null;

function revealCard(catKey, title) {
  const section = document.getElementById("cat-" + catKey);
  if (!section) return;
  const card = [...section.querySelectorAll(".card")]
    .find((c) => c.querySelector(".card__title").textContent === title);

  returnScroll = window.scrollY;
  history.pushState({ tamkatJump: true }, "");

  /* Smooth-scrolling the length of this page is a long, queasy ride on a
     phone. Animate only short hops; jump the long ones. */
  const target = card || section;
  const distance = Math.abs(target.getBoundingClientRect().top);
  target.scrollIntoView({
    behavior: distance > 2000 ? "auto" : "smooth",
    block: "center"
  });
  if (card) {
    card.classList.remove("card--flash");
    void card.offsetWidth;           // restart the animation
    card.classList.add("card--flash");
  }
}

function buildChips() {
  const grades = $("#grade-chips");
  grades.textContent = "";

  const allChip = el("button", "chip", "All grades");
  allChip.type = "button";
  allChip.dataset.grade = "";
  grades.append(allChip);

  GRADE_BANDS.forEach((band) => {
    const chip = el("button", "chip", band);
    chip.type = "button";
    chip.dataset.grade = band;
    grades.append(chip);
  });

  grades.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.grade = chip.dataset.grade;
    render();
  });

  const smpBox = $("#smp-chips");
  smpBox.textContent = "";
  SMPS.forEach((smp) => {
    const chip = el("button", "chip");
    chip.type = "button";
    chip.dataset.smp = String(smp.n);
    const num = el("span", "chip__num", "SMP " + smp.n);
    chip.append(num, document.createTextNode(smp.short));
    chip.title = "Standard for Mathematical Practice " + smp.n + ": " + smp.short;
    smpBox.append(chip);
  });

  smpBox.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const n = Number(chip.dataset.smp);
    state.smps.has(n) ? state.smps.delete(n) : state.smps.add(n);
    render();
  });
}

function makeCard(resource, cat) {
  const hasLink = Boolean(resource.url);
  const card = el(hasLink ? "a" : "div", "card" + (hasLink ? "" : " card--nolink"));
  card.style.setProperty("--cat", cat ? cat.color : "var(--teal)");

  if (hasLink) {
    card.href = resource.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
  }

  const icon = el("div", "card__icon", resource.icon);
  icon.setAttribute("aria-hidden", "true");

  const title = el("h3", "card__title", resource.title);
  const lens = resource.lens ? el("p", "card__lens", resource.lens) : null;

  const foot = el("div", "card__foot");
  const left = el("span", "card__note", resource.note || (resource.grades.join(" · ") || ""));
  const right = el("span", "card__go", hasLink ? "Open ↗" : "Link coming soon");
  foot.append(left, right);

  card.append(icon, title);
  if (lens) card.append(lens);
  card.append(foot);
  return card;
}

function render() {
  const container = $("#sections");
  container.textContent = "";

  const byCat = new Map(state.categories.map((c) => [c.key, []]));
  state.resources.forEach((r) => {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    if (matches(r)) byCat.get(r.category).push(r);
  });

  let shown = 0;

  state.categories.forEach((cat) => {
    const items = byCat.get(cat.key) || [];
    shown += items.length;

    const section = el("section", "section");
    section.id = "cat-" + cat.key;
    section.style.setProperty("--cat", cat.color);

    const head = el("div", "section__head");
    const headline = el("div", "section__headline");
    headline.append(el("h2", "section__title", cat.title));
    if (cat.subtitle) headline.append(el("p", "section__subtitle", cat.subtitle));
    head.append(headline);
    if (cat.blurb) head.append(el("p", "section__blurb", cat.blurb));
    section.append(head);

    if (items.length) {
      const grid = el("div", "grid");
      items.forEach((r) => grid.append(makeCard(r, cat)));
      section.append(grid);
    } else {
      /* Keep the category visible even when it's empty, so the six-part map
         teachers are learning doesn't rearrange itself under them. */
      section.classList.add("section--empty");
      section.append(el("p", "section__empty", "Nothing here matches right now."));
    }

    container.append(section);
  });

  const total = state.resources.length;
  const count = $("#resultcount");
  count.textContent = isFiltered()
    ? shown + " of " + total + " resources match" + describeFilters()
    : total + " resources across " + state.categories.length + " categories";

  $("#noresults").hidden = shown > 0;
  $("#clear").hidden = !isFiltered();

  const smpCount = $("#smp-count");
  smpCount.hidden = state.smps.size === 0;
  smpCount.textContent = state.smps.size + " selected";

  buildDirectory();

  document.querySelectorAll("#grade-chips .chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.grade === state.grade));
  });
  document.querySelectorAll("#smp-chips .chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(state.smps.has(Number(chip.dataset.smp))));
  });

  syncURL();
}

function describeFilters() {
  const bits = [];
  if (state.grade) bits.push("grades " + state.grade);
  if (state.smps.size) bits.push("SMP " + [...state.smps].sort((a, b) => a - b).join(", "));
  if (state.query) bits.push('"' + state.query + '"');
  return bits.length ? " — " + bits.join(" · ") : "";
}

/* Filters live in the address bar, so a coach can send a colleague a link
   straight to, say, the K–2 fluency view. */
function syncURL() {
  const params = new URLSearchParams();
  if (state.grade) params.set("grade", state.grade);
  if (state.smps.size) params.set("smp", [...state.smps].sort((a, b) => a - b).join(","));
  if (state.query) params.set("q", state.query);
  const qs = params.toString();
  history.replaceState(null, "", qs ? "?" + qs : location.pathname);
}

function readURL() {
  const params = new URLSearchParams(location.search);
  const grade = params.get("grade") || "";
  if (GRADE_BANDS.includes(grade)) state.grade = grade;
  (params.get("smp") || "").split(",").map(Number)
    .filter((n) => n >= 1 && n <= 8).forEach((n) => state.smps.add(n));
  state.query = (params.get("q") || "").toLowerCase().trim();
  if (state.query) $("#search").value = state.query;
  if (state.smps.size) $("#smp-details").open = true;
}

function clearFilters() {
  state.grade = "";
  state.smps.clear();
  state.query = "";
  $("#search").value = "";
  render();
}

function setStatus() {
  const status = $("#datastatus");
  if (state.source === "sheet") {
    status.textContent = "Content is live from the shared Google Sheet.";
    status.classList.remove("is-stale");
  } else if (SHEET_ID) {
    status.textContent = "Couldn't reach the Google Sheet just now — showing the last saved copy.";
    status.classList.add("is-stale");
  } else {
    status.textContent = "Showing the built-in copy of the resource list.";
    status.classList.remove("is-stale");
  }
}

/* ---------- Go ------------------------------------------------------------ */

/* Everything below is about being able to get back out again — the page is
   long on a phone, and a jump you can't reverse is a trap. */
function wireNavigation() {
  const button = $("#backup");
  const directory = document.querySelector(".directory");

  const goBackUp = () => {
    returnScroll = null;
    const distance = Math.abs(directory.getBoundingClientRect().top);
    directory.scrollIntoView({
      behavior: distance > 2000 ? "auto" : "smooth",
      block: "start"
    });
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  };
  button.addEventListener("click", goBackUp);

  /* Show the escape hatch as soon as the directory is behind you. */
  const onScroll = () => {
    const past = window.scrollY > directory.offsetTop + directory.offsetHeight - 120;
    button.hidden = !past;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* Back gesture after a jump: return to where they were, not off the site. */
  window.addEventListener("popstate", () => {
    if (returnScroll === null) return;
    const y = returnScroll;
    returnScroll = null;
    window.scrollTo({
      top: y,
      behavior: Math.abs(window.scrollY - y) > 2000 ? "auto" : "smooth"
    });
  });

  /* Escape does the same thing on a keyboard. */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !button.hidden) goBackUp();
  });
}

function wireEvents() {
  let timer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(timer);
    const value = e.target.value.toLowerCase().trim();
    timer = setTimeout(() => { state.query = value; render(); }, 120);
  });


  $("#clear").addEventListener("click", clearFilters);
  $("#noresults-clear").addEventListener("click", clearFilters);
}

async function init() {
  loadFallback();          // paint something immediately, always
  buildChips();
  wireEvents();
  wireNavigation();
  readURL();
  render();
  setStatus();

  try {
    if (await loadSheet()) { // then upgrade to live content if the Sheet answers
      render();
      setStatus();
    }
  } catch (err) {
    console.warn("[TAMKAT] Google Sheet unavailable, using saved copy:", err.message);
    setStatus();
  }
}

init();
