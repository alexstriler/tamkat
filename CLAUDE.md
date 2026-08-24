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
- Google Sheet: created, ID `1stxk5HimPx40nFTl6MG_Uw4oCqtpOxsn9voe_G8mz9Q`, still
  private. The page therefore falls back to `data/fallback.js` and says so in the
  footer. It starts reading live the moment the Sheet is set to link-viewable.
- Shared with Tammy and Cathy: not yet
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
