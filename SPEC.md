# Year Context: build specification

## Purpose

A static site with one page per year from 1920 to 2025. Each page tells a reader what the world was like in that year, so they can watch a film from that year with the right context in their head.

The problem it solves: a 2011 film feels recent, and 2011 was fifteen years ago. Fifteen years before 2011 was 1996, which does not feel recent at all. Readers systematically underestimate how far away the recent past is, and the site corrects that.

## Scope

106 year pages, 1920 through 2025. 2026 gets added after the year ends.

Out of scope for v1: film title search, per-film pages, user accounts, any server. The data structure below leaves room for a `/film/` route later, so do not build it now and do not block it either.

## Stack

- Astro, static output, no SSR adapter.
- Content collections with `type: 'data'` for the year JSON files, validated by Zod at build time.
- No UI framework. Astro components and plain CSS.
- No runtime data fetching. Everything resolves at build.
- Node 20+, npm.
- GitHub Actions builds and deploys to GitHub Pages.

Dependencies stay minimal. Astro and Zod are enough. Do not add a CSS framework, a search library, or an icon package without asking.

## Repo layout

```
astro.config.mjs         one base constant, carries the TODO for the repo name
package.json
SPEC.md
CLAUDE.md
DESIGN.md                the design plan, written before the CSS
CORRECTIONS.md
.github/workflows/deploy.yml
.github/ISSUE_TEMPLATE/correction.yml
scripts/
  validate-data.mjs      schema, sources, anachronisms
  validate-prose.mjs     overlap, density, banned phrases
  fetch-sources.mjs      research helper, pulls a year's source pages as raw text
  scaffold-year.mjs      research helper, fills the facts the series already cover
  lib/corpus.mjs         shared loading and reporting for both validators
src/
  content.config.ts      the year collection, glob loader plus the shared schema
  data/
    years/
      1920.json ... 2025.json
    series/
      cpi_us.json
      population_us.json
      population_world.json
      life_expectancy_us.json
      gas_price_us.json
      min_wage_us.json
      movie_ticket_us.json
    tech_firsts.json
    tech_firsts.sources.json
    banned_phrases.json
  lib/
    year-schema.mjs      Zod schema, tier rule, lead pointer resolution
    sections.mjs         availability windows, section grouping
    anchor.mjs           computes the anchoring block, pure
    series.mjs           the only module that imports the baked series
    format.mjs
  layouts/Base.astro
  components/
    AnchorStub.astro
    Fact.astro
  pages/
    index.astro
    corrections.astro
    year/[year].astro
  styles/global.css
```

### Deviations from the original layout, and why

- **Astro 7 removed the legacy content collections API.** There is no `type: 'data'` and no `src/content/config.ts`. Data collections are a glob loader over JSON files, and the config file lives at `src/content.config.ts`. The year files moved to `src/data/years/` because `src/content/` is no longer a special directory.
- **The schema lives in `src/lib/year-schema.mjs`, not in the content config.** Both Astro and `scripts/validate-data.mjs` import it, so `npm run validate` fails on exactly what the build would fail on. Restating the schema in two places would let them drift.
- **`src/lib` is `.mjs` rather than `.ts`.** The validator scripts run under bare node with no build step, so shared modules cannot carry type annotations. Collection entries are still typed inside `.astro` files, because Astro generates those types from the Zod schema either way.
- **Series files are `{ label, unit, coverage, sources, note, retrieved, updated, values }`** with the year map under `values`, rather than years and metadata mixed at the top level. Code that iterates years never has to filter metadata keys out. `sources` is a list of `{ years, from, until, name, url }` because five of the seven series are spliced from more than one source and each range needs its own citation. `from` and `until` repeat the prose `years` field as integers so `scaffold-year.mjs` can pick the right citation for a given year without parsing English.

## Year data schema

One file per year at `src/content/years/<year>.json`.

```jsonc
{
  "year": 2011,
  "tier": "modern",                // "early" | "broadcast" | "modern", computed, see below
  "headline": "One sentence someone would recognize.",
  "texture": [
    "2 to 4 paragraphs of written context."
  ],
  "lead": [
    "pol.us_president",
    "event.bin_laden",
    "film.gross#0",
    "tech.iphone_4s"
  ],
  "facts": {
    "pol.us_president": {
      "section": "politics",
      "label": "US President",
      "value": "Barack Obama (D)",
      "detail": "Third year of his first term.",
      "date": "",
      "source": "https://..."
    },
    "film.gross": {
      "section": "film",
      "label": "Highest-grossing films, US domestic",
      "value": ["Title A", "Title B", "Title C"],
      "detail": "",
      "source": "https://..."
    }
  },
  "figures_basis": "gross",        // "gross" | "rentals" | "unavailable"
  "notes": ""                      // editorial notes, not rendered
}
```

Field rules:

- `year` integer, 1920 to 2025, must match the filename.
- `headline` one sentence, no trailing period optional, under 120 characters.
- `texture` array of 2 to 4 strings. Each string is one paragraph, 40 to 120 words. Early-tier years may have 2.
- `lead` array of 4 to 8 strings. Each entry is a fact id, optionally suffixed with `#n` to point at one element of an array-valued fact. Every id must exist in `facts`. Early-tier years may have as few as 4.
- `facts` object keyed by fact id. Ids are lowercase, dot-separated, stable across years where the same fact recurs (`pol.us_president` is the same id in every year).
- `facts[].section` one of: `politics`, `world`, `film`, `tv`, `radio`, `music`, `tech`, `prices`, `culture`, `sports`, `deaths`.
- `facts[].value` string, number, or array of strings.
- `facts[].source` required URL for any fact whose value or detail contains a digit, and for every fact in `politics`, `world`, `film`, `tv`, `music`, `sports`, and `deaths`. Optional for `culture` facts that are qualitative.
- `facts[].date` optional ISO date or `YYYY-MM`, for dated events.
- `figures_basis` required when the year has a `film.gross` fact. See box office basis below.

Do not add fields without updating the Zod schema and this document in the same commit.

## Fact ids and the lead

Every fact lives in one place. The lead holds pointers, never copies of the text. Reordering or rewriting the lead can never desynchronize it from the body, because there is nothing to desynchronize.

The page renders lead facts first, in lead order, in a distinct visual treatment. Everything else renders below, grouped by section, behind a disclosure control on mobile and inline on desktop.

Choosing the lead is a separate generation pass that runs after the facts exist. Pick the items that orient a reader fastest. For most years that means: who governed, the single largest world event, the film everyone saw, the piece of technology in people's hands, and the one price or number that lands hardest.

Do not pad the lead to a fixed length. A 1931 page with four lead items reads better than one padded to eight with filler.

## Era tiers and section availability

Tiers are computed from the year, not stored by hand. Store the computed value in the file anyway so it is greppable, and have the validator check it.

- `early`: 1920 to 1949
- `broadcast`: 1950 to 1992
- `modern`: 1993 to 2025

Section availability, enforced in `sections.ts`:

| Section | Available from | Notes |
| --- | --- | --- |
| politics | 1920 | |
| world | 1920 | |
| film.gross | 1920 | basis varies, see below |
| film.awards | 1929 | first Academy Awards ceremony |
| film.world_cinema | 1920 | 3 to 5 notable international releases |
| film.ticket_price | 1948 | earliest reliable US average |
| film.how_people_watched | 1920 | prose, always present |
| radio | 1920 to 1959 | |
| tv | 1950 | Nielsen season rankings start 1950-51 |
| music.charts | 1940 | Billboard best-seller chart begins |
| music.hot100 | 1958 | |
| tech.devices | 1920 | household and consumer technology generally |
| tech.games | 1972 | added: the Magnavox Odyssey, first home console, shipped September 1972 |
| tech.internet | 1993 | |
| tech.web_sites | 1996 | |
| tech.social | 2003 | |
| prices | 1920 | |
| culture.slang | 1920 | |
| culture.memes | 1996 | |
| sports | 1920 | |
| deaths | 1920 | |

Two more windows were added for facts that every year carries and the original table had no row for: `music.format`, how people listened, from 1920, and `culture.mood`, qualitative and never numeric, from 1920. A `tech` section-level default from 1920 covers one-off product facts such as `tech.iphone_4s`. Anything about an online service must use a gated id instead, or its window will not fire. `sections.mjs` maps specific ids onto these families, so `film.best_picture` is checked against the 1929 `film.awards` gate and `tech.facebook` against the 2003 `tech.social` gate.

A section with no available facts renders nothing. It does not render a header with an empty body, and it never renders a placeholder like "Top websites: none." A 1942 page has no tech-internet section at all, which reads as correct. A 1942 page saying the internet had no users reads as broken.

## Anchoring module

Computed at build time in `lib/anchor.ts` from the static series. No generated prose. This runs on every year page, including recent ones, because miscalibration about 2011 is the thing that started this project.

Four outputs:

**Distance, both directions.** `2026 - year` years ago. Then the same span measured backward from the page year. For 2011: fifteen years ago, and the same distance backward from 2011 lands in 1996. For 1927: ninety-nine years ago, and the same span backward lands in 1828.

**Living memory.** Someone who was 20 that year would now be `2026 - year + 20`. When that number passes about 100, emit a line marking the year as outside anyone's firsthand adult recall.

**Then and now.** US population, world population, US life expectancy at birth, and a CPI translation of one dollar. Rendered as a four-item strip with both figures. CPI-U runs from 1913, so coverage is unbroken across the whole range.

**Technology age.** Read `data/tech_firsts.json`, compute the age of each entry relative to the page year, and emit a sentence covering the three or four most relevant. Suppress entries with a negative age, or render them as a countdown when the gap is under 15 years and the technology is one a modern reader assumes exists.

```jsonc
// data/tech_firsts.json
{
  "radio_broadcasting_us": 1920,
  "talking_pictures": 1927,
  "television_us_commercial": 1947,
  "jet_airliner_service": 1952,
  "color_tv_majority_us": 1972,
  "vcr_home": 1975,
  "personal_computer": 1977,
  "cell_phone_commercial": 1983,
  "cd_audio": 1982,
  "world_wide_web_public": 1993,
  "dvd": 1997,
  "broadband_majority_us": 2004,
  "smartphone_modern": 2007,
  "streaming_video_mainstream": 2010
}
```

Every entry needs a source recorded in the file's sibling `tech_firsts.sources.json`. This one hand-checked file produces correct, year-specific, non-repeating content on all 106 pages, so it is worth getting exactly right.

The research pass changed two of those years and kept the rest. `television_us_commercial` moved from 1947 to 1941, the date commercial television was licensed and WNBT and WCBW signed on, because nothing sourceable happened in 1947 that 1941 does not cover and by 1948 only about one percent of US households owned a set. `streaming_video_mainstream` at 2010 became `streaming_video_subscription` at 2007, because mainstream is not a dateable event and Netflix turned streaming on in January 2007. Six other entries are correct as given but carry caveats worth reading in the sources file: 1920 radio has competing claims, 1975 Betamax was not the first home video format, 1982 CD is the Japanese launch and the US had to wait until March 1983, 1983 cellular is the Ameritech network rather than the handset which went on sale in 1984, 1977 personal computers means the first pre-assembled ones, and 2004 broadband is half of home internet users rather than half of households.

## Static series files

Each series is a JSON object mapping year to value, plus a `source` and `updated` key. Bake them in. Do not call an API at runtime.

| File | Coverage | Source |
| --- | --- | --- |
| `cpi_us.json` | 1913 to 2025, annual CPI-U average | BLS via Minneapolis Fed |
| `population_us.json` | 1920 to 2025 | Census, four vintages |
| `population_world.json` | 1920 to 2025 | HYDE and UN WPP via Our World in Data |
| `life_expectancy_us.json` | 1920 to 2024 | CDC/NCHS, dataset plus four data briefs |
| `gas_price_us.json` | 1949 to 2025 | EIA Monthly Energy Review table 9.4 |
| `min_wage_us.json` | 1938 to 2025 | DOL |
| `movie_ticket_us.json` | 1948 to 2022, gaps before 1974 | NATO, archived |

Gaps are allowed. Store `null` for a missing year and have the renderer skip it. Do not interpolate.

Four ranges came back shorter than this table originally claimed, and the files say so in their own `note`:

- **Gasoline starts in 1949, not 1929.** EIA publishes no national retail price before 1949 and no free primary source covers 1929 to 1948. The series is also spliced: leaded regular through 1975, unleaded regular from 1976, recorded in a `basis` array so a page can label which grade it is quoting.
- **Ticket prices end in 2022.** NATO became Cinema United and stopped publishing the annual average. The adult-only figures quoted in trade press since 2023 measure something else. Before 1974 the source itself publishes single years rather than a run, so 1949 to 1973 is mostly gaps.
- **Life expectancy ends in 2024.** 2025 is not published yet.
- **World population for 2024 and 2025 is a UN medium-variant projection**, listed in `projected_years`, because the WPP 2024 revision's estimates stop at 2023.

US population carries a visible step between 2019 and 2020 where estimates made before the 2020 census meet estimates rebased on it. It is a real discontinuity in the source data, not a mistake, and the file explains it.

## Box office basis

Figures from 1920 through the late 1970s are usually reported as rentals, meaning the distributor's share rather than the ticket-window total. Sources disagree by roughly a factor of two and neither figure is wrong.

Set `figures_basis` per year:

- `gross` renders dollar amounts with no qualifier.
- `rentals` renders dollar amounts with a label explaining that the figure is the distributor's share.
- `unavailable` renders a ranked list of titles with no dollar amounts at all.

When the basis cannot be established from a source, use `unavailable`. A ranked list with no numbers is accurate. A rentals figure labeled as gross is the kind of error readers catch and screenshot.

Same principle for music: record the chart name per era rather than presenting a continuous series across methodology changes.

## Validation

The build fails on any error below. Wire `npm run validate` into `npm run build` and into CI before deploy.

### Data checks, `scripts/validate-data.mjs`

1. **Schema.** Zod parse of every year file. Filename matches `year`.
2. **Source coverage.** Every fact requiring a source per the rules above has a non-empty `https://` URL. No exceptions, no placeholder URLs.
3. **Lead integrity.** Every lead id resolves to an existing fact. Array indexes are in range. Lead length 4 to 8. No duplicates.
4. **Anachronism.** No 4-digit year later than the page year appears anywhere in `facts` or `texture`. A 1931 page referencing 1975 is a hallucination or a retrospective framing, and both are wrong here. The anchoring module is computed outside the data files and is exempt.
5. **Section availability.** No fact in a section that is unavailable for that year's tier.
6. **Tier.** Stored `tier` matches the computed tier.
7. **Coverage.** All 106 files exist, none empty.
8. **Dated facts belong to the page year.** A `date` field must start with the page year. Added because check 4 only catches dates in the future, and a 2010 date on a 2011 page is the same class of error.
9. **Box office basis travels with the fact.** `figures_basis` is required when `film.gross` exists, and a year marked `unavailable` may not carry dollar amounts.
10. **`tech_firsts.json` is complete.** Every key has a matching entry with a source URL in `tech_firsts.sources.json`, the years agree, and every key has phrasing in `anchor.mjs`. One file drives the technology line on all 106 pages, so a key that silently renders nothing is worth failing the build over.

`--partial` skips check 7 only, for use while the 106 years are still being filled. `npm run validate:partial` and `npm run build:partial` are the local equivalents. CI never passes the flag, so an incomplete corpus cannot deploy.

### Prose checks, `scripts/validate-prose.mjs`

1. **Cross-year overlap.** Extract every 5-gram from `texture` and `headline` across all year files. Fail if any 5-gram appears in more than two years. This catches drift directly. Expect "was becoming increasingly ubiquitous" and "reshaping how people consumed" on the first run.
2. **Distinctive-token density.** Every texture paragraph needs at least two distinctive tokens, where a distinctive token is a proper noun or a specific number that appears in at most three year files across the corpus. A 2011 paragraph mentioning only smartphones and social media fails. One mentioning Qwikster and Fukushima passes.
3. **Banned phrases.** Fail on any string in `data/banned_phrases.json`. Seed list: "marked a turning point", "on the cusp of", "little did they know", "a pivotal year", "the world was changing", "would come to define", "a defining moment", "set the stage for", "in many ways", "it is worth noting", "increasingly", "landscape" used figuratively. Add to this list whenever a pattern shows up twice.
4. **Em dash.** Fail on the `—` character anywhere in `texture`, `headline`, or fact values. Split the sentence or use a comma.
5. **Paragraph length.** 40 to 120 words per texture paragraph.

Overlap and density are the checks that matter. Generated era prose drifts toward the same three observations for every year after 2005, and those two checks are what catch it mechanically.

## Content generation protocol

Content is generated, not hand-written, so the process has to carry the accuracy burden that an editor would otherwise carry.

Per year, in order:

1. **Research pass.** Pull sources first. Do not draft from memory. Gather: heads of government, three to six major world events with dates, box office rankings, awards, chart-toppers, TV rankings where applicable, notable technology releases with dates, notable deaths, and the price series values. Record a URL for every one.
2. **Facts pass.** Write the `facts` object from the research. Every numeric or dated fact carries its source URL. Anything you cannot source gets dropped, not guessed.
3. **Texture pass.** Write 2 to 4 paragraphs using only material already in `facts`, plus specific detail from the research that did not warrant its own fact. Aim for the specific and slightly odd. In 2011 you still burned through a data plan by accident because unlimited was ending, and Netflix split itself in half and reversed within a month. That texture distinguishes 2011 from 2016. "Smartphones were becoming ubiquitous" is true of fifteen consecutive years and distinguishes nothing.
4. **Lead pass.** Choose 4 to 8 fact ids.
5. **Validate.** Run both scripts. Fix and repeat.

### The two research helpers

Neither one runs at build time and neither is in the deploy workflow. They exist because doing 106 years at the cost of the first one is not worth doing.

```
node scripts/fetch-sources.mjs 1931 1958      pulls source pages into .sources/<year>/
node scripts/scaffold-year.mjs 1931           writes .sources/<year>/scaffold.json
node scripts/scaffold-year.mjs 1931 --write   writes src/data/years/<year>.json
```

`fetch-sources.mjs` requests year-indexed pages as **raw wikitext** and writes them to `.sources/`, which is gitignored. Raw, and read locally, because a page fetched through a summarising tool comes back with half the year quietly missing, and you discover it when a fact turns out not to exist. It picks its candidate titles from the year: radio pages only up to 1959, television and Nielsen pages from 1950, Hot 100 from 1958, games from 1972, and the Academy Awards ceremony numbered `year - 1927`. Misses are printed rather than treated as failures, because coverage genuinely varies by year. 1931 returns seven pages and about 312KB.

`scaffold-year.mjs` writes a year file with the facts that need no year-specific research, meaning everything the seven static series already cover: gas price, minimum wage, and ticket price, each carrying the source URL for the range the year falls in and the basis label in force that year. It then prints which availability windows are open, which are closed, and what the anchoring inputs are. The output fails validation on purpose until the research pass fills the headline, the texture, the lead, and the sourced facts. `--write` refuses to overwrite an existing year file.

What the helpers do not do is write prose or choose the lead. The prose validator fails any 5-gram that appears in three years, so the writing is per-year work by construction.

Sourcing constraints:

- Wikipedia is research input, never a text source. Its content is CC BY-SA, and copying prose forces share-alike onto the repo. Facts are not copyrightable. Read, then write original sentences.
- Box Office Mojo prohibits scraping. Use Wikipedia's per-year highest-grossing lists as the research path to the underlying figures.
- Alexa's site rankings shut down in 2022 and have no live source. Historical top-sites data comes from Internet Archive snapshots or Wikipedia's historical tables, assembled by hand.
- TMDB, if used later for film search, requires attribution in the footer.

## Page structure

Order on a year page:

1. Year, large. Headline.
2. Anchoring strip. Distance both directions, living memory when applicable, then-and-now figures, technology age.
3. Lead facts, 4 to 8, distinct treatment.
4. Texture paragraphs.
5. Full facts by section, grouped, sources visible or on hover.
6. Previous and next year navigation.
7. Correction link pointing at the issue template.

The index page is a year picker across 106 years. A dense grid by decade works better than a dropdown and gives the site a real front page.

### Design direction

Before writing CSS, write a short design plan: 4 to 6 named hex values, a display face and a body face chosen deliberately, a layout concept, and one signature element the site is remembered by. Review that plan and revise anything that reads as a default rather than a choice for this subject.

Three looks to avoid, because they are where generated design currently clusters: cream background with high-contrast serif and terracotta accent, near-black with a single acid accent, and broadsheet columns with hairline rules and zero border radius. The last one is especially tempting for an almanac and especially worth resisting.

The subject offers better material. The site spans 1920 to 2025, so the visual system can carry that span: type or color that shifts with the era tier, a treatment drawn from the printed almanac, the film title card, or the ticket stub. Spend boldness in one place and keep the rest quiet.

Quality floor, unannounced: responsive to mobile, visible keyboard focus, reduced motion respected, and readable without JavaScript.

## Deployment

GitHub Pages via Actions. `astro.config.mjs` holds one `base` constant with a TODO for the final repo name. Nothing else hardcodes a path. Use Astro's `import.meta.env.BASE_URL` for every internal link.

- Repo named `<user>.github.io`: `base` is `/`.
- Any other repo name: `base` is `/<repo-name>/`.

The deploy workflow runs `npm ci`, `npm run validate`, `npm run build`, then uploads. Validation failure blocks deploy.

## Corrections

`CORRECTIONS.md` at the repo root, plus `.github/ISSUE_TEMPLATE/correction.yml` asking for year, fact id, what is wrong, and a source. Every year page links to it.

Public generated history will contain errors. What separates a site people trust from one they mock is whether errors are sourced, visible, and fixable.

## Build sequence

Do not generate 106 years before the template is proven.

1. Schema, both validators, page template, anchoring module, all static series. No year content yet.
2. Populate 2011 completely. Review hard for accuracy and for whether the page reads right.
3. Pilot four years spanning the tiers: 1931, 1958, 1987, 2004. These exercise every empty-section path in the renderer. Fix the template against them.
4. Batch the remaining 101 in groups of ten. Run the prose validator after every batch so overlap surfaces while it is still cheap to fix.

## Open items

- Repo and site name, which sets the Pages base path. Deferred, placeholder in config.
- Film title search. Deferred to v2. If it happens, the path is a static title-to-year index built from TMDB's daily ID export, filtered to the most popular 40 to 50 thousand titles, split by first character so the browser fetches roughly 100KB, matched client-side. A scheduled Action refreshes it monthly.
- A "years that shaped it" toggle showing the window a film was written and shot in, roughly three years before release. Cheap to add once year pages exist.
