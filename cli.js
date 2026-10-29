#!/usr/bin/env node
// Zero-config, keyless CLI of the enrichment core — the no-account distribution
// surface (North Star rail #2). A stranger can run it with no install:
//   npx github:rezearcher/company-enrichment-cli stripe.com ramp.com
// Prints one deduped enriched JSON record per company. Same code as the hosted
// Apify actor minus the metering, so it doubles as a trust/SEO funnel into the
// paid rail. No API key, no account, no paid upstream.
import { enrichBatch } from './src/enrich.js';

function parseArgs(argv) {
  const out = { domains: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--no-hiring') out.flags.include_hiring = false;
    else if (a === '--no-contacts') out.flags.include_contacts = false;
    else if (a === '--no-tech') out.flags.include_tech = false;
    else if (a === '--smtp') out.flags.enableSmtp = true;
    else if (a === '--pages') { out.flags.maxPagesPerCompany = Number(argv[++i]) || 4; }
    else if (a === '--max') { out.flags.maxCompanies = Number(argv[++i]) || 0; }
    else if (a === '--pretty') out.pretty = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else out.domains.push(a);
  }
  return out;
}

const HELP = `company-enrichment — live firmographics + verified contacts + hiring signal from a domain

USAGE
  node cli.js <domain...> [flags]
  npx github:rezearcher/company-enrichment-cli stripe.com ramp.com

FLAGS
  --no-hiring     skip the multi-ATS hiring block
  --no-contacts   skip email/phone extraction + deliverability
  --no-tech       skip the tech-stack fingerprint
  --smtp          also run a best-effort SMTP RCPT probe (port 25 often blocked)
  --pages <n>     max pages crawled per company (default 4)
  --max <n>       cap number of companies processed
  --pretty        pretty-print JSON

Prints one enriched JSON record per company to stdout. Keyless, no account.`;

async function main() {
  const { domains, flags, pretty, help } = parseArgs(process.argv.slice(2));
  if (help || !domains.length) {
    process.stderr.write(HELP + '\n');
    process.exit(help ? 0 : 1);
  }
  const onLog = (e) => process.stderr.write(`[${e.level || 'info'}] ${e.msg}\n`);
  const { records, stats } = await enrichBatch(domains, flags, onLog);
  process.stderr.write(`\n${JSON.stringify(stats)}\n`);
  process.stdout.write(JSON.stringify(records, null, pretty ? 2 : 0) + '\n');
}

main().catch((e) => { process.stderr.write(`fatal: ${e.stack || e}\n`); process.exit(1); });
