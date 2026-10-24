# Analytics reports

This folder holds the insights reports written by `scripts/analytics-report.ts`. Each run queries
the dashboard's PostHog project and writes `insights-YYYY-MM-DD.md` (UTC date) with:

- top and least-viewed component pages (never-viewed entries from `scripts/entries.ts` included),
- zero-result palette searches, most-copied components and install command copies,
- most-tweaked demo props, the light/dark and mobile/tablet/desktop split,
- demo errors, Web Vitals and TTFB p75 per page, and 404 paths,
- Developer's Pick: page views, card clicks (featured and home-teaser splits) and click-through,
  the filters chosen and the items Surprise me opened,
- a ranked list of suggested improvements from fixed rules (the thresholds are the exported
  constants at the top of the script).

All numbers are aggregate counts. Cookieless (anonymous-tier) visitors are hashed per day, so one
person who comes back on another day counts as a new visitor.

## Run it

You need a PostHog personal API key with only the "Query Read" scope and the numeric project id
(both under PostHog -> Settings). The key is a secret: keep it out of shell history and files.

```sh
read -s POSTHOG_PERSONAL_API_KEY && export POSTHOG_PERSONAL_API_KEY
POSTHOG_PROJECT_ID=12345 npm run analytics:report -- --days 7
```

Or in one line (this one ends up in shell history):

```sh
POSTHOG_PERSONAL_API_KEY=... POSTHOG_PROJECT_ID=... npm run analytics:report -- --days 7
```

- `--days N`: window of 1 to 365 days, default 30.
- `POSTHOG_HOST`: private API host, default `https://eu.posthog.com` (EU Cloud). This is not the
  ingestion host `eu.i.posthog.com`. Use `https://us.posthog.com` for a US Cloud project.

The script prints only the path of the written report. It never prints or writes the key; on an
HTTP error it prints the query name, the status and the start of the response body.

## Reports are not committed

`.gitignore` ignores `analytics/insights-*.md`, because the reports hold usage data and change
every run (decision D3). Only this README is tracked. To keep a history in git instead, delete the
`analytics/insights-*.md` line from `.gitignore` and commit the reports.
