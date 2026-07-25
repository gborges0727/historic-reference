# Design plan

Written before the CSS, per SPEC.md. Revised once, notes at the bottom.

## What the pages have to do

106 pages of dense sourced facts, each one arguing that a year is further away than it feels. A reader arrives because they are about to watch a film. They need the year's shape in about forty seconds, then the option to keep reading. So: fast orientation at the top, density below it, and a visual system that makes 1931 and 2011 feel like different places without changing where anything sits.

## Concept: the projection booth

Cool grey ground like a dimmed theatre wall, ink that is almost black with a blue cast, and one warm-to-cold accent that changes with the era tier. The accent tracks the color cast of the medium the year was recorded on, which is the one thing that genuinely differs across the range.

## Colors

Six named values. The accent is the only one that moves.

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#16181d` | Text. Near-black with blue in it, never `#000`. |
| `--ground` | `#dfe1dc` | Page. Cool grey with a green cast, deliberately not cream. |
| `--card` | `#f4f5f2` | Stub and fact surfaces, one step up from the ground. |
| `--rule` | `#b9bdb6` | Borders and dividers. |
| `--era` | per tier | Accent: `#4a5b70` early, `#a8322d` broadcast, `#175a92` modern. |
| `--era-wash` | per tier | The same hue at 8 percent, for stub fill and hover. |

Early is silver-nitrate blue-grey, broadcast is Technicolor red, modern is digital blue. Each accent clears 4.5:1 on `--ground` for text and 3:1 for rules.

## Type

- Display: **Big Shoulders Display**, 700. Condensed capitals for the year and section headers. It reads as a cinema marquee and a ledger heading at the same time, which is exactly the two things this site is.
- Body: **Newsreader**, 400 with italic and 600. A text serif with warmth that holds up at 17px, and not one of the four fonts every generated page uses.
- Figures: **DM Mono**, 400 and 500. Every number, date, fact label, and source. Aligned digits are functional in the then-and-now strip and give the whole thing the feel of a printed record.

## Layout

A narrow left rail carries the year as a vertical marquee, sticky on desktop. Content sits in one measured column of about 62 characters to the right of it. Nothing is centered. The anchoring stub and the section grid break wider than the text column, so the page has two measures rather than one.

At mobile widths the rail becomes a horizontal band above the content and the grid collapses to one column.

## Signature element: the ticket stub

The anchoring block is a ticket stub. Perforations run down its left edge as a repeating radial gradient, and the four then-and-now figures are printed as ticket fields in mono, each one showing the year figure above the present one. The distance line reads across the top like the admission row. The year itself stayed in the rail rather than being punched into the stub, because printing it twice within one screen made the stub compete with the page title instead of sitting under it. It appears on all 106 pages, it is the thing someone remembers, and it earns its place because the reader is holding a film in their head when they arrive.

## Motion

Lead facts fade up on load with a staggered delay, CSS only. Fact rows lift their era rule from 2px to 4px on hover. Both stop under `prefers-reduced-motion`. Nothing else moves.

## Floor

Responsive to 320px, focus visible as a 2px era outline with offset, full contrast in both accents, and every page readable with JavaScript off, because there is none.

## Revision pass

Three things in the first draft read as defaults rather than choices, and changed:

1. The accent started as a single amber lamp color across all years. That is the cream-and-terracotta look the spec names, arriving by a different route. Replaced with the three era casts.
2. Section headers were going to be small caps with hairline rules above them, which is the broadsheet almanac the spec says to resist. They are now condensed display capitals with a 3px era rule underneath, which reads as a marquee rather than a newspaper.
3. Fact values were in the body serif. Moved to mono, which makes the numbers scannable and separates recorded fact from written prose without adding a second color.
