# Low Floor · High Ceiling — Math Resources for Teachers

A single page where any K–8 teacher can find math routines, tasks, games, and
supports, sorted by **what they want students to do** rather than by who
published it.

**Live page:** _(added once the site is published)_
**Content Sheet:** [Low Floor High Ceiling — Resource List (edit me)](https://docs.google.com/spreadsheets/d/1stxk5HimPx40nFTl6MG_Uw4oCqtpOxsn9voe_G8mz9Q/edit)

---

## For Tammy and Cathy — how to change what's on the page

Everything teachers see comes from one Google Sheet. You never touch code.
Edit the Sheet, refresh the page, and your change is live.

### Add a resource

Open the Sheet, go to the **`resources`** tab, and add a row at the bottom.
Only three columns really matter: `category`, `title`, and `url`.

| Column | What to put | If you leave it blank |
|---|---|---|
| `category` | One of: `wonder`, `make-sense`, `play-solve`, `build-fluency`, `reflect-justify`, `support-learning` | The card won't show up — this one is required |
| `title` | What teachers should see, e.g. `Esti-Mysteries` | Card won't show up |
| `lens` | Three or four words on what students actually do: `Estimate • Notice • Reason • Revise` | Card shows without the italic line |
| `url` | Full web address, starting with `https://` | Card shows greyed out as "Link coming soon" — useful for staging something you're still gathering |
| `grades` | `K-2`, `3-5`, `6-8` — any combination, separated by commas | Shows up under every grade filter |
| `smps` | Practices, written as `SMP 1, SMP 3, SMP 6` | Hidden whenever someone filters by a practice |
| `icon` | One emoji, only if you want to override the built-in one | Keeps the icon the page already has |
| `note` | Small credit line, e.g. `Steve Wyborney` | Shows the grade bands instead |
| `order` | A number — lower numbers come first inside the category | Falls to the bottom of its category |
| `status` | `live` | Treated as hidden — see below |

### Hide a resource without deleting it

Change its `status` from `live` to `draft`. It disappears from the page and the
row stays in the Sheet. Change it back to `live` when it's ready.

### Rename or add a category

The six sections are built into the page, so most of the time there's nothing to
do here. To change them, add a second tab named exactly **`categories`** with the
header row `key, title, subtitle, blurb, color, order`. Once that tab exists the
page uses it instead of the built-in list. There's a ready-made copy at
`sheet/categories.csv` in this repo — in Sheets, use *File → Import → Insert new
sheet*, then rename the new tab to `categories`.

Each row in that tab is one section of the page.

- To rename a section, edit its `title` or `subtitle` — but **leave `key` alone**,
  because that's what the resource rows point at.
- To add a seventh category, add a row with a new `key` (lowercase, no spaces,
  e.g. `assess`), then use that same key in the `category` column of the
  resources you want in it.
- `order` controls where the section sits on the page. The existing ones go
  10, 20, 30, 40, 50, 60 — leaving gaps so you can slot something in at 35.
- `color` is a hex code like `#0E8C9E`. It tints that section's rule, card
  edges, and the italic lens text.

### Things worth knowing

- **Changes take a minute or two.** Google caches the Sheet briefly. If you don't
  see your edit, wait a moment and refresh.
- **Nothing you type can break the page.** If the Sheet is unreachable, the page
  quietly falls back to a built-in copy of the list and says so in the footer.
- **The `•` character** in the lens column: copy it from a row that already has
  one, or type `Option + 8` on a Mac.
- **Write practices as `SMP 3`, not just `3`.** Google Sheets sees a bare list
  like `1, 3, 6` as a date and silently turns it into `1, 3, 2006`. The `SMP`
  prefix stops that. (The page reads the numbers out of whatever you type, so
  `SMP3` and `SMP 3` both work.)
- **The icon column can stay empty.** Every resource already has an icon built
  into the page. Fill the column in only when you want a different one.
- **Don't reorder the tabs or rename the header row.** The resource list has to
  stay the first tab, and the page looks for those exact column names.

---

## What teachers can do on the page

- Browse six categories, each with clickable activity cards
- Filter by grade band (K–2 / 3–5 / 6–8)
- Filter by Standard for Mathematical Practice — "show me everything that builds SMP 3"
- Search by name or by what students do
- Share a filtered view: the address bar updates as you filter, so a coach can
  send a colleague a link straight to, say, the K–2 fluency view
- Print it — the page has a print layout that includes the web addresses

---

## For whoever maintains the code

Plain HTML, CSS, and JavaScript. No build step, no dependencies, no framework.

```
index.html          markup shell
assets/styles.css   all styling; light and dark, responsive, print
assets/app.js       Sheet fetch, filtering, rendering — SHEET_ID lives at the top
data/fallback.js    baked-in copy of the content, used if the Sheet is unreachable
```

The page reads the Sheet through Google's gviz CSV endpoint:

```
https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&gid=0
```

The resource list is addressed by position (`gid=0`, the first tab) rather than
by name, so renaming the tab or the file can't break the page. The optional
`categories` tab is looked up by name.

That requires the Sheet's link sharing to be set to **anyone with the link can
view**. No "Publish to web" step is needed.

To run it locally:

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321.

When the resource list changes substantially, refresh `data/fallback.js` so the
offline copy doesn't drift too far from the Sheet.
