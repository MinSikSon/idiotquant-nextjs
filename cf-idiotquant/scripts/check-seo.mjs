import assert from 'node:assert/strict';
// 프로덕션 빌드 후 실행: node scripts/check-seo.mjs http://127.0.0.1:3100
const base = process.argv[2] || 'http://127.0.0.1:3100';
const paths = ['', '/quant', '/screener', '/analyze', '/compare', '/calculator'];
const decode = value => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
for (const agent of ['Googlebot', 'OAI-SearchBot']) {
  for (const path of paths) {
    const response = await fetch(base + path, { headers: { 'User-Agent': agent }, redirect: 'manual' });
    assert.equal(response.status, 200, `${agent} ${path}: accessible`);
    const html = await response.text();
    assert.ok(html.includes(`rel="canonical" href="https://idiotquant.com${path}"`), `${path}: canonical`);
    assert.ok(!/name="robots" content="[^"]*noindex/.test(html), `${path}: indexable`);
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    assert.ok(title?.includes('IdiotQuant'), `${path}: title`);
    assert.ok(html.includes('property="og:image"'), `${path}: share image`);
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
    const faq = scripts.find(schema => schema['@type'] === 'FAQPage');
    assert.ok(faq?.mainEntity.length >= 3, `${path}: FAQ schema`);
    const text = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ''));
    for (const item of faq.mainEntity) {
      assert.ok(text.includes(item.name), `${path}: visible question ${item.name}`);
      assert.ok(text.includes(item.acceptedAnswer.text), `${path}: visible answer`);
    }
    console.log(`${agent} ${path || '/'}: 200, canonical, metadata, ${faq.mainEntity.length} visible FAQ answers`);
  }
}
const redirect = await fetch(base + '/search?ticker=AAPL', { redirect: 'manual' });
assert.equal(redirect.status, 308);
assert.equal(new URL(redirect.headers.get('location'), base).pathname, '/analyze');
assert.equal(new URL(redirect.headers.get('location'), base).searchParams.get('ticker'), 'AAPL');
const sitemap = await (await fetch(base + '/sitemap.xml')).text();
assert.ok(sitemap.includes('https://idiotquant.com/compare'));
assert.ok(!sitemap.includes('/search'));
assert.ok(!sitemap.includes('<lastmod>'));
const robots = await (await fetch(base + '/robots.txt')).text();
assert.ok(robots.includes('User-agent: *\nAllow: /'));
const admin = await fetch(base + '/admin', { redirect: 'manual' });
assert.ok(admin.status >= 300 && admin.status < 400);
const profile = await (await fetch(base + '/profile')).text();
assert.ok(/name="robots" content="[^"]*noindex/.test(profile));
console.log('PASS: legacy ticker preserved; sitemap/robots correct; profile remains noindex; admin redirects');
