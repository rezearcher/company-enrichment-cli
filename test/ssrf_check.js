// SSRF regression test for src/crawl.js fetchPage.
//
// Proves the redirect-based SSRF bypass is closed: a PUBLIC company site that
// 3xx-redirects the runner toward an internal/cloud-metadata address must be
// REFUSED at the hop, not followed. Also covers direct private hosts, bad
// protocols, the redirect-hop cap, and that a legitimate public redirect
// (http->https, apex->www) is still followed.
import { fetchPage } from '../src/crawl.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.error('  ✗ ' + msg); } }
async function refuses(fn, needle, msg) {
  try { await fn(); fail++; console.error('  ✗ ' + msg + ' (did NOT throw)'); }
  catch (e) {
    const m = String(e && e.message || e);
    if (!needle || m.toLowerCase().includes(needle.toLowerCase())) { pass++; }
    else { fail++; console.error(`  ✗ ${msg} (threw "${m}", wanted "${needle}")`); }
  }
}

function hdrs(obj) {
  const h = new Headers(obj || {});
  return h;
}

// Build a fake fetch from a map of href -> {status, location?, contentType?, body?}.
// Records every href actually requested so we can assert the internal host was
// NEVER contacted.
function fakeFetchFrom(map) {
  const requested = [];
  const impl = (href) => {
    requested.push(href);
    const r = map[href] || map[href.replace(/\/$/, '')] || { status: 200, contentType: 'text/html', body: '<html>ok</html>' };
    return Promise.resolve({
      url: href,
      status: r.status,
      headers: hdrs({ 'content-type': r.contentType || 'text/html', ...(r.location ? { location: r.location } : {}) }),
      text: async () => r.body || '',
      body: null,
    });
  };
  impl.requested = requested;
  return impl;
}

console.log('ssrf_check:');

// 1. Public site 302 -> AWS metadata IP: refused at the hop, metadata NEVER fetched.
{
  const f = fakeFetchFrom({
    'https://evil-public.example/': { status: 302, location: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/' },
  });
  await refuses(() => fetchPage('https://evil-public.example/', { fetchImpl: f }), 'private', '302->169.254.169.254 refused');
  ok(!f.requested.some((u) => u.includes('169.254.169.254')), 'metadata endpoint was never requested');
}

// 2. Public site 301 -> loopback: refused.
{
  const f = fakeFetchFrom({
    'https://evil-public.example/': { status: 301, location: 'http://127.0.0.1:8080/admin' },
  });
  await refuses(() => fetchPage('https://evil-public.example/', { fetchImpl: f }), 'private', '301->127.0.0.1 refused');
  ok(!f.requested.some((u) => u.includes('127.0.0.1')), 'loopback was never requested');
}

// 3. Public site 302 -> RFC1918 10.x: refused.
{
  const f = fakeFetchFrom({
    'https://evil-public.example/': { status: 302, location: 'http://10.0.0.5/' },
  });
  await refuses(() => fetchPage('https://evil-public.example/', { fetchImpl: f }), 'private', '302->10.0.0.5 refused');
}

// 4. Protocol smuggling via redirect: 302 -> file:// refused.
{
  const f = fakeFetchFrom({
    'https://evil-public.example/': { status: 302, location: 'file:///etc/passwd' },
  });
  await refuses(() => fetchPage('https://evil-public.example/', { fetchImpl: f }), 'non-http', '302->file:// refused');
}

// 5. Direct private host (no redirect) still refused by the entry guard.
await refuses(() => fetchPage('http://169.254.169.254/latest/meta-data/', { fetchImpl: fakeFetchFrom({}) }), 'private', 'direct metadata IP refused');
await refuses(() => fetchPage('ftp://example.com/', { fetchImpl: fakeFetchFrom({}) }), 'non-http', 'ftp:// refused');
await refuses(() => fetchPage('http://localhost/', { fetchImpl: fakeFetchFrom({}) }), 'internal', 'localhost refused');

// 6. Redirect-hop cap: a public->public loop is bounded, not infinite.
{
  const f = fakeFetchFrom({
    'https://a.example/': { status: 302, location: 'https://b.example/' },
    'https://b.example/': { status: 302, location: 'https://a.example/' },
  });
  await refuses(() => fetchPage('https://a.example/', { fetchImpl: f }), 'too many redirects', 'redirect loop bounded');
}

// 7. Legitimate public redirect IS still followed (http->https, apex->www).
{
  const f = fakeFetchFrom({
    'http://acme-public.example/': { status: 301, location: 'https://www.acme-public.example/' },
    'https://www.acme-public.example/': { status: 200, contentType: 'text/html', body: '<html><title>Acme</title></html>' },
  });
  const res = await fetchPage('http://acme-public.example/', { fetchImpl: f });
  ok(res.status === 200 && /Acme/.test(res.html), 'public http->https->www redirect followed to 200');
  ok(res.finalUrl.includes('www.acme-public.example'), 'finalUrl reflects the followed hop');
}

console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
