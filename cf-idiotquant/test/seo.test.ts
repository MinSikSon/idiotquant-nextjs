import test from 'node:test';
import assert from 'node:assert/strict';
import sitemap from '../app/sitemap.ts';

test('사이트맵은 비교 페이지를 포함하고 검색 리디렉션과 비공개 URL은 제외한다', () => {
  const entries = sitemap();
  const urls = entries.map(entry => entry.url);
  assert.equal(new Set(urls).size, urls.length);
  for (const path of ['', '/quant', '/screener', '/analyze', '/compare', '/calculator']) {
    assert.ok(urls.includes(`https://idiotquant.com${path}`));
  }
  for (const path of ['/search', '/login', '/accounts', '/admin', '/profile', '/balance']) {
    assert.ok(!urls.includes(`https://idiotquant.com${path}`));
  }
  assert.ok(entries.every(entry => entry.lastModified === undefined));
});
