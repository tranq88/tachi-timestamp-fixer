# Tachi Timestamp Fixer

A static, dependency-free website for correcting timezone-shifted Kamaitachi BATCH-MANUAL JSON exports. Files are read and processed in browser memory. There are no uploads, external scripts, analytics, or network requests for score processing.

## Use

Open `index.html` in a browser, select or drop your `.json` export, choose the **source service's UTC offset**, and download the corrected JSON. A valid upload shows the filename and enables downloading; no timestamp preview is displayed.

The correction is:

```text
corrected timeAchieved = original timeAchieved − (offset in minutes × 60,000)
```

For example, **UTC+09:00 subtracts nine hours**; **UTC−05:00 adds five hours**. The dropdown defaults to UTC+09:00 and covers UTC−12:00 through UTC+14:00 in 15-minute increments, including half-hour and quarter-hour offsets. UTC+00:00 is omitted because it makes no timestamp changes.

Unix milliseconds already describe an absolute UTC instant. Use this tool only when the exporter has incorrectly shifted that instant. Select the server's offset at the time the scores were recorded, including daylight saving time if applicable. A single offset applies to the entire file; exports spanning different offsets need to be corrected separately. Always start with the original export to avoid applying the correction twice.

## Supported format

The file must have a `meta` object containing a nonempty `game` string and a nonempty `scores` array. The tool checks the structure and timestamps; it does not validate game-specific scores, song identifiers, or all of Kamaitachi's import requirements.

Only numeric `scores[].timeAchieved` fields are shifted. Missing, `null`, and `0` values are preserved because Tachi interprets them as unknown times. Malformed timestamps block download and identify the affected score. Numeric strings, ISO dates, and Unix seconds are not converted to milliseconds; inputs must already use Unix milliseconds. Numeric second values cannot reliably be distinguished from early millisecond dates, so verify the units in the original export.

All other JSON fields are carried through, including metadata, scores, judgements, and optional values. Downloads use `<original-name>-utc-corrected.json` and compact JSON with no added whitespace. JSON whitespace and numeric spelling may change on serialization. As with native JavaScript JSON parsing, integers beyond JavaScript's safe integer range cannot be preserved exactly; timestamp values outside the supported range are rejected.

References: [Tachi's BATCH-MANUAL types](https://github.com/zkldi/Tachi/blob/main/typescript/common/src/types/batch-manual.ts) and [score timestamp conversion](https://github.com/zkldi/Tachi/blob/main/typescript/server/src/lib/score-import/import-types/common/batch-manual/converter.ts).

## Host on GitHub Pages

1. Add the project files to a GitHub repository and push them to `main`.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**.
4. Select **main** and **/(root)**, then save.

No build step or package installation is required. Relative asset paths work with both repository Pages URLs and custom domains. `.nojekyll` marks the site as plain static content.

See [GitHub's publishing source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

