# Design plan

Written before the CSS, per SPEC.md. Rewritten once the first version shipped, notes at the bottom.

## What the pages have to do

106 pages of dense sourced facts, each one arguing that a year is further away than it feels. A reader arrives because they are about to watch a film. They need the year's shape in about forty seconds, then the option to keep reading. So: fast orientation at the top, density below it, and a structure that survives a 1931 page with eight sections and a 2011 page with ten.

## Concept: the data sheet

White ground, Helvetica, hard 2px rules, one orange accent, and every fact in a bordered card under a numbered section. The page reads as a printed sheet rather than an article. Nothing is centered, nothing is rounded, and there are no shadows.

## Colors

Six values plus white. The accent never changes.

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#111214` | Text, major rules, the timeline marker. |
| `--prose` | `#26282c` | Texture paragraphs and corrections copy. |
| `--detail` | `#3a3d42` | Card detail text, one step lighter than prose. |
| `--muted` | `#6b6e73` | Labels, meta, footer, list subtitles. |
| `--hairline` | `#dfe1e4` | Card borders and table row rules. |
| `--track` | `#eceef0` | The unfilled part of the timeline. |
| `--accent` | `#e8590c` | Timeline fill, distance label, now-values, date stamps, link underline, focus ring. |

## Type

One family, `Helvetica Neue` falling back to Helvetica and Arial, with `tabular-nums` on the body so the figures in the lead table and the vitals row line up. Weight does the work that a second family would: 700 for the giant year, the headline, section labels, card values, and year chips, 400 for everything else. Size carries the rest, from a 180px year down to a 10px uppercase micro label.

## Layout

A 1120px sheet. The hero splits into the year and headline on the left and the lead facts table on the right, then the vitals row runs the full width under both. Every section below is a 200px label column against a card grid that auto-fills at 280px, so a section with two facts and a section with eight use the same grid. List facts take the full row and print their entries in a second auto-fit grid inside the card.

At 760px the hero, the sections, and the index decade rows each collapse to one column, and the prose drops from two columns to one. The card and vitals grids are auto-fit and need no override.

## Signature element: the timeline strip

Under the headline, a 6px track with an orange fill from 1920 to the page year and a 2px ink marker at the fill edge. Below it, the span ends and the distance in years. It replaces both the ticket stub and the mirror-year sentence the first version carried. The distance a reader needs is how far back the year is, and a strip shows that against the whole range of the site in a way a sentence cannot. Under the strip sit the two computed lines that survived, the living-memory line and the technology-age line.

## Motion

None. No load animation, no hover lift. Hover changes color on links and border plus color on year chips.

## Floor

Responsive to 320px, focus visible as a 2px accent outline with offset, and every page readable with JavaScript off, because there is none.

## Revision pass

The first version used three era accents, two display webfonts, a serif body, and a ticket-stub anchor block on a grey ground. Four things changed and why:

1. **Era tiers no longer style anything.** Three accents meant three looks for one site, and a reader lands on one page at a time and never sees the system. The `tier` field stays in the data and in the validator, where it gates which sections a year can carry.
2. **The mirror year is gone from every page.** "The same distance back from 2011 lands in 1996" asks the reader to hold three years at once. The timeline strip shows the same distance without the arithmetic.
3. **Webfonts are gone.** Three families over a network for a page whose whole argument is sourced text. Helvetica is on the machine already, and one family with real weight contrast holds the hierarchy.
4. **Facts became cards in a grid rather than rows in a column.** A year carries between twenty and forty facts and the old single column ran them to a scroll nobody finished. A bordered card in an auto-filling grid puts four or six facts on a screen and keeps the label, value, detail and source in the same place on each one.
