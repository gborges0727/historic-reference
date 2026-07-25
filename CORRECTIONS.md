# Corrections

Public generated history contains errors. What separates a record people can use from one they mock is whether the errors are sourced, visible, and fixable. Every fact on the site carries a source link, and every correction applied is logged here with the date and what changed.

To report one, open a [correction issue](.github/ISSUE_TEMPLATE/correction.yml) with the year, the fact, what is wrong, and a source.

## How a correction is applied

1. The fact is checked against the source in the issue and against the source already recorded in the data file.
2. The value and the source URL are both updated in the same commit. A corrected value never keeps the old source.
3. If the two sources disagree rather than one being wrong, the fact says so in its detail and cites both. Box office figures before about 1980 disagree constantly, and labelling the basis is the honest move.
4. The entry below records the year, the fact id, what changed, and the issue number.

## Log

Nothing yet. The first entry will look like this:

```
### 2026-08-02
- 1958 `film.gross`: rentals figures were labelled as gross. Relabelled and figures_basis
  set to rentals. (#12)
```

## Corrections already applied during the build, before any pages were public

These came out of the research pass rather than from readers, and are recorded for the same reason.

- **2011 `deaths.jobs`**: an early draft said Steve Jobs died six weeks after the iPhone 4S shipped. He died on October 5, nine days before it went on sale on October 14. The claim was backwards, and it was in the headline.
- **2011 `film.gross`**: the list was ranked but unlabelled. The available source ranks films by worldwide gross, so the label now says worldwide and the detail notes that the US domestic order differs.
- **2011 `music.listening_format`**: an early draft said Spotify's US launch was invite-only. Its own article describes a six month ad-supported free tier at launch, so the claim was dropped.
- **2011 `tech.web_sites`**: dropped entirely. Alexa shut down in 2022 and its 2011 rankings survive only in archived snapshots nobody has assembled into a citable table.
- **`tech_firsts.television_us_commercial`**: was 1947. Nothing sourceable happened to television in 1947 that 1941 does not already cover, and commercial licensing began on July 1, 1941. Changed to 1941.
- **`tech_firsts.streaming_video_mainstream`**: replaced with `streaming_video_subscription` at 2007. Mainstream is not a dateable event. Netflix turned on streaming on January 16, 2007.
- **`gas_price_us`**: the spec asked for 1929 onward. EIA publishes no national retail gasoline price before 1949 and no free primary source covers 1929 to 1948, so those years are empty rather than filled from a secondary compilation.
- **`movie_ticket_us`**: ends at 2022. NATO renamed itself Cinema United and stopped publishing the annual average. The adult-only averages quoted in trade press since 2023 measure something else, so they are not spliced in.
