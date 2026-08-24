# TAMKAT — project notes

## What this is

A public web page of math resources for K–8 teachers: "Many Ways In. No Ceiling."
The title is Alex's, and it states the design principle directly — multiple entry
points, endless room to extend thinking. (It replaced the earlier headline "Low
Floor · High Ceiling", which named the same idea in jargon a teacher new to the
phrase wouldn't recognize.)

It replaces an older Canva page that showed the same resources as three
undifferentiated rows of tiles, two of which carried the identical heading
"Low Floor/High Ceiling Routines."

The organizing idea (Alex's, from the "New Version" notes) is three layers:

1. **Six categories** answering "what do you want students to do?" — the primary navigation
2. **Clickable activity cards** inside each category, keeping the visual appeal of the old tiles
3. **An instructional lens** under each card name (`Estimate • Reason • Defend`) so a
   teacher sees *why* they'd pick it

The point is that the page should feel instructionally intentional rather than
like a digital filing cabinet.

## Who edits what

- **Alex** — owns everything; the only one who changes design or code (through Claude)
- **Tammy and Cathy** — edit the Google Sheet (content only); see README.md
- **Every other teacher** — read-only, no login

## Architecture

Static page on GitHub Pages, content from a Google Sheet read at page load via
the gviz CSV endpoint. `data/fallback.js` is a baked-in copy that renders first
and stays up if the Sheet is unreachable — the page is never blank.

`SHEET_ID` at the top of `assets/app.js` is the only wiring between the two.

No build step, no dependencies. Keep it that way — the value of this project is
that it still works in five years without anyone running `npm install`.

## Design decisions worth not re-litigating

- **Six categories to start, more later** — categories come from the Sheet, so
  adding a seventh is a Sheet row, not a code change.
- **The directory is always visible, never a hover menu.** An earlier version put
  each category's contents in a pull-down bubble on hover; Alex replaced it with
  the panel layout (modelled on a Teacher Dashboard screenshot he sent) so every
  option is on screen without pointing at anything. Don't reintroduce hover-only
  navigation — it hides content and doesn't exist on a touchscreen.
- **Resources with no URL yet still render**, tagged "soon" and clicking through
  to their card. Alex is populating links over time, and a visible gap is more
  useful than a hidden one.
- **Empty categories collapse to a small line when filtering** rather than
  disappearing, so the six-part mental map stays stable while teachers filter.
- **Filters live in the address bar**, so a filtered view is shareable as a link.
- **Every jump has to be reversible.** Alex hit this on a phone: tapping a row
  scrolled him deep into a ~12,000px page with no history entry, so the back
  gesture left the site entirely. Jumps now push a history entry and restore the
  previous scroll position, there's a fixed "All categories" button once the
  directory is out of reach, and long jumps are instant rather than a smooth
  scroll through the whole page. Keep this property for anything new that moves
  the viewport.
- Palette (navy / teal / orange) carried over from the original Canva page on
  purpose — teachers should recognize it as the same resource.

## Status

- Built: 2026-08-23
- Links: not yet populated — every card currently shows "Link coming soon"
- Google Sheet: `1stxk5HimPx40nFTl6MG_Uw4oCqtpOxsn9voe_G8mz9Q`, link-viewable.
  The page reads it live and the footer says so.
- Sheet editors: Tammy (`striler.ta@vcpusd.org`) and Cathy
  (`kathykuno@iusd.org`) both have Editor. Note the two are in different
  districts (VCPUSD and IUSD), so the Sheet is shared across organizations —
  worth remembering if either district ever tightens external sharing.
- GitHub Pages: live at <https://alexstriler.github.io/tamkat/> (repo `alexstriler/tamkat`, public)

## Two Google Sheets traps, already worked around

1. **Sheets date-parses number lists.** A cell reading `1, 3, 6` silently became
   `1, 3, 2006` on import — and `1 3 6` did too, so it isn't about the delimiter.
   SMP tags are therefore written as `SMP 1, SMP 3, SMP 6`, and `parseSMPs()`
   just pulls digits 1–8 out of whatever it's given.
2. **The Drive connector mangles 4-byte emoji** on upload (🔍 arrives as `ð`).
   3-byte symbols like ⚫ and ➕ survive. So the Sheet's `icon` column ships empty
   and icons live in the code; the column only overrides. Emoji typed directly
   into Sheets in a browser are fine — it's the upload path that breaks them.

3. **gviz returns the first tab, with a 200, for a tab that doesn't exist.**
   Asking for `sheet=categories` when there's no such tab hands back the
   *resources* rows. They were read as categories, so the page rendered 38
   categories and 252 cards. A real categories tab has a `key` column and the
   resources tab doesn't, which is what now tells them apart — see
   `loadSheet()`. Don't rely on a missing tab producing an error.
4. **A CSV-imported Sheet's first tab is not gid 0.** This one is gid
   `1069584519` and named "Untitled". Both the page and the exporter now request
   the gviz CSV with no `gid` or `sheet` parameter at all, which returns the
   first tab whatever it's called. Pinning `gid=0` silently fetches nothing.

## embed.html

A trimmed copy of the page for embedding in another site (Google Sites, a
district page). Same CSS and JS; `<body class="is-embed">` is what changes the
behaviour — the hero and card sections are dropped, and a resource with no link
renders as a plain div rather than a button, because in an embed there's no card
to scroll to. GitHub Pages sends no X-Frame-Options, so framing works.

Keep it in step with index.html when the filter bar or directory markup changes.

## Deploys look stale for ten minutes unless you bump the version

GitHub Pages serves assets with `Cache-Control: max-age=600`, so a returning
visitor runs the previous CSS/JS for up to ten minutes after a push. This burned
an hour once: a fix was confirmed live on the CDN via curl while the browser
kept running the cached copy, which looked exactly like the fix not working.

`index.html` therefore loads its assets with a `?v=N` query. **Bump that number
in all three tags whenever you change `assets/*` or `data/fallback.js`** — it
changes the cache key, so the new files take effect immediately. If a change
seems not to have deployed, check this first.

## Icons

Alex supplied 38 line-art SVGs in `icons/`, one per resource, already drawn in
the six category colours. They replaced the emoji placeholders. `data/fallback.js`
maps each resource to its file through an `art` slug; the emoji stays as a
fallback for a missing file or an editor override.

They're referenced as `<img src>`, not inlined — cacheable and cheap. Two
consequences to remember:

- **No `currentColor` inside the files.** It resolves to black in an `<img>`
  rather than inheriting the page's colour. Eight of the originals used it for
  filled dots and had their real colour baked in.
- **The SVGs carry their own rounded tile**, so `.card__icon--art` and
  `.option__badge--art` strip the background and border the emoji versions
  needed. Don't re-add chrome around them.

## Source material

`Use-these-topics.HEIC` — photo of the planning whiteboard. It's the inventory
the seed content came from: Steve Wyborney's routines, Pam Harris, Dan Finkel,
the quick sense-making routines list, and the district items (fluency
intervention plan, progress monitoring/GLR, teaching tip videos, IA toolkits).
