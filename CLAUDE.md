# TAMKAT — project notes

## What this is

A public web page of math resources for K–8 teachers: "Low Floor · High Ceiling."
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
- **Cards without URLs still render**, greyed out as "Link coming soon." Alex is
  populating links over time, and a visible gap is more useful than a hidden one.
- **Empty categories collapse to a small line when filtering** rather than
  disappearing, so the six-part mental map stays stable while teachers filter.
- **Filters live in the address bar**, so a filtered view is shareable as a link.
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
   and the icons live in `data/fallback.js`, matched by title; the column only
   overrides. Emoji typed directly into Sheets in a browser are fine — it's the
   upload path that breaks them.

## Source material

`Use-these-topics.HEIC` — photo of the planning whiteboard. It's the inventory
the seed content came from: Steve Wyborney's routines, Pam Harris, Dan Finkel,
the quick sense-making routines list, and the district items (fluency
intervention plan, progress monitoring/GLR, teaching tip videos, IA toolkits).
