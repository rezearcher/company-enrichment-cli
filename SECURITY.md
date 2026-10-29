# Security & data posture — Company Enrichment Scraper

## Bounded downside (no runaway compute)
Every outbound fetch carries a hard request timeout (`ENRICH_REQUEST_TIMEOUT_MS`, default 20s,
covering headers **and** body read) and a streamed response-size ceiling
(`ENRICH_MAX_RESPONSE_BYTES`, default 5 MB/page). The crawl is capped at `maxPagesPerCompany`
pages and the run at `maxCompanies`. A slow-loris or unbounded-body host can neither hang a run
nor exhaust memory — the per-company cost stays bounded and recoverable.

## SSRF guard
A caller supplies "domains", so the crawler treats every host as untrusted input. Before any
fetch it rejects non-`http(s)` schemes, `localhost`/`*.local`/`*.internal` names, and any host
that resolves to a loopback, private (RFC 1918), link-local, CGNAT, or IPv6 unique-local address.
A crafted "domain" therefore cannot pivot the runner into an internal network.

## Credentials & COGS
No credentials are held or required. All upstreams are keyless: the company's own public website,
free DNS (MX/A), the public ATS JSON endpoints, and an optional raw-TCP SMTP probe. No paid API,
no resold database, no secret in the image.

## Data scope (what we will and won't collect)
- **Collected:** published business firmographics and published business contact points — role
  inboxes (`info@`, `sales@`, …), switchboard/E.164 phone numbers, public social profiles, and the
  company's public ATS job postings.
- **Not collected:** anything behind a login, personal/consumer PII, scraped individual profiles,
  or data from third-party databases. Obvious placeholder/noreply addresses are dropped.
- **No fabrication:** a field not evidenced on the source stays `null`; a crawl that reaches no
  usable page is flagged `enrichment_status: "thin"`, never emitted as confident-but-empty.

## Input validation / parser safety
Parser regexes are reviewed to be linear-time (no catastrophic backtracking); phone capture is
conservative (international `+` form or `tel:` hrefs only) to avoid misreading IDs/dates as numbers.
Email capture excludes image-extension and known-placeholder matches.

## Reporting
Security concerns: open an issue on the distribution repository. No data is retained beyond the
caller's own Apify dataset for the run.
