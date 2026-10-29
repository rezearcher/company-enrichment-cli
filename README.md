# company-enrichment-cli

**Give it a domain, get one clean company record — live from the source.** Firmographics,
verified business contacts, a tech-stack fingerprint, social profiles, and a **live hiring
signal across 8 ATS platforms**. No API key, no account, no resold database.

```bash
npx github:rezearcher/company-enrichment-cli stripe.com bunq.com --pretty
```

Most enrichment tools resell a static third-party database — stale the day it ships, and you
pay for a vendor you can't see. This reads each company's **own public website live on every
run**, grades the contacts it finds by DNS/MX, fingerprints the web tech, and adds a hiring
signal pulled straight from the company's live ATS.

## Output (one record per company)

```jsonc
{
  "company_name": "Stripe",
  "canonical_domain": "stripe.com",
  "hq_country": "US",
  "logo_url": "https://.../favicon.svg",
  "social_links": [{ "network": "github", "url": "https://github.com/stripe" }],
  "tech_stack": [{ "name": "Next.js", "category": "js-framework" }],
  "contacts": {
    "emails": [{ "email": "press@stripe.com", "type": "role", "mx": true, "deliverability_grade": "B" }],
    "phones": [{ "number": "+18889262289", "type": "business" }]
  },
  "hiring": {
    "ats_vendor": "greenhouse", "open_reqs_count": 724, "hiring_intensity": "high",
    "departments_hiring": ["Engineering", "..."], "newest_posting_at": "2026-10-29T09:14:34.000Z"
  },
  "source_freshness": "live"
}
```

### The hiring signal nobody else has
`hiring` is derived live from **Greenhouse, Lever, Ashby, SmartRecruiters, Workday, Recruitee,
Workable, and BambooHR** with automatic vendor detection from the domain — whether a company is
actively hiring, how hard, where, and when it last posted. A buying-intent and growth signal a
static firmographics database cannot carry.

## Usage

```
company-enrichment <domain...> [flags]

  --no-hiring     skip the multi-ATS hiring block
  --no-contacts   skip email/phone extraction + deliverability
  --no-tech       skip the tech-stack fingerprint
  --smtp          also run a best-effort SMTP RCPT probe (port 25 often blocked)
  --pages <n>     max pages crawled per company (default 4)
  --max <n>       cap number of companies processed
  --pretty        pretty-print JSON
```

## Scope & posture
Business data only — published firmographics and published business contact points (role
inboxes, switchboard numbers, public social profiles) plus public ATS job postings. No login,
no personal/consumer PII, no third-party database. Fields a site does not publish stay `null` —
nothing is invented. See [SECURITY.md](./SECURITY.md) for the bounded-fetch + SSRF posture.

## Hosted version
Need it at scale with managed infrastructure and metered billing? The hosted actor runs the same
core on Apify with pay-per-enriched-company pricing.

## Related tools (same maintained engine)

The live hiring signal above is derived from the same 8-ATS engine
(Greenhouse · Lever · Ashby · SmartRecruiters · Workday · Recruitee · Workable · BambooHR)
that powers Grey Ridge's standalone jobs tools. Want the **raw per-role feed** instead of a
rolled-up company signal?

- **[ats-jobs-scraper-cli](https://github.com/rezearcher/ats-jobs-scraper-cli)** — normalized,
  deduplicated job rows across the eight ATS platforms, one record per open role.
- **[unified-jobs-scraper-cli](https://github.com/rezearcher/unified-jobs-scraper-cli)** — that
  ATS feed merged with LinkedIn public postings into one deduplicated feed.
- **[jobs-mcp-server](https://github.com/rezearcher/jobs-mcp-server)** — the same feed as a Model
  Context Protocol tool for Claude Desktop, Cursor, Cline and other agents.

## Local
```bash
npm install
node cli.js stripe.com --pretty
```
ISC — free to use.
