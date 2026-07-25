# Working rules

Read `SPEC.md` before starting. It holds the schema, the validation rules, and the build sequence. This file holds the rules that apply to every session.

## The build gate

`npm run validate` must pass before any commit. It runs `scripts/validate-data.mjs` and `scripts/validate-prose.mjs`. Do not commit with failures, do not disable a check to get a commit through, and do not add a check exemption without saying so explicitly in the commit message.

If a check fires on content that is actually correct, fix the check and explain why in the same commit. Silently loosening a threshold defeats the point of having one.

While the 106 years are still being filled, `npm run validate:partial` skips the corpus coverage check and nothing else. Use it locally. CI runs the strict command, so an incomplete corpus cannot deploy. Once every year exists, the partial scripts come out of `package.json`.

## Accuracy

Never write a fact from memory. Pull a source first, then write the fact, then record the URL in the same edit. This applies hardest to years before 1980, where dates for films, deaths, and product releases are easy to get confidently wrong.

Anything you cannot source gets dropped. An absent fact costs a reader nothing. A wrong fact with a plausible source URL costs the whole site its credibility.

When two sources disagree, say so in `detail` and cite both. Box office figures before 1980 disagree constantly, and the honest move is to label the basis rather than pick a number.

## Prose

Generated era prose drifts toward the same observations for every year. The validator catches the worst of it. These rules cover the rest.

- Write about the specific year, using detail that could not apply to the year before or after.
- No em dashes. Split the sentence or use a comma.
- No forward-looking framing. A 1931 page does not know what happens in 1932.
- No verdict sentences. State the fact that earns the verdict.
- No sentence whose only job is to introduce the next one.
- Plain noun headers. Not "The year everything changed."

Do not restate the fact list in prose. The box office fact already carries the title and the amount, so a texture sentence that says the same thing in words adds nothing and pulls every year toward the same sentence. The overlap check caught this twice in the first eighteen years, both times on a box office opener. Texture carries what a fact cannot: why a thing was strange, what it sat next to, what it cost someone.

Before finishing a texture pass, go paragraph by paragraph and name the specific detail each one carries. A paragraph you cannot point to a detail in is filler.

## Data files

One year per file, filename matches the `year` field. Facts keyed by stable dot-separated ids that stay the same across years. Sources on everything numeric or dated.

Do not add schema fields without updating `src/content/config.ts` and `SPEC.md` in the same commit.

Static series in `src/data/series/` are baked in and updated by hand once a year. Never fetch them at runtime.

## Scope

Ask before adding a dependency. Astro and Zod cover the build.

Ask before building film search, per-film routes, or anything requiring a runtime API call. The spec defers all of it to v2.

Do not hardcode a base path. Use `import.meta.env.BASE_URL` for internal links. The single `base` constant in `astro.config.mjs` carries a TODO until the repo name is settled.

## Commits

One logical change per commit. Message states what changed and why. When a commit adds year content, say which years and note anything that was dropped for lack of a source.
