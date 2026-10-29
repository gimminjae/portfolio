import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadContent, validateContent } from '../scripts/content.mjs';
import { renderPage, escapeHtml } from '../src/render.js';
const content = await loadContent();
const original = JSON.parse(await readFile(new URL('./fixtures/original-projects.json', import.meta.url), 'utf8'));
test('preserves every existing project title and summary, including the original 80% claim', () => {
  assert.deepEqual(content.projects.map(({ title, summary }) => ({ title, summary })), original);
});
test('all navigation, project and article links resolve in the generated page', () => {
  const html = renderPage(content);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
  for (const note of content.notes) assert.ok(html.includes(encodeURIComponent(note.path)));
  for (const p of content.projects) assert.ok(html.includes(`id="project-${p.id}"`));
});
test('changing only content changes page copy and metadata without changing components', () => {
  const next = structuredClone(content);
  next.profile.name = '테스트 이름'; next.profile.meta.title = '새로운 문서 제목';
  next.projects[0].summary = '수정한 프로젝트 설명';
  const html = renderPage(next);
  assert.ok(html.includes('테스트 이름')); assert.ok(html.includes('<title>새로운 문서 제목</title>'));
  assert.ok(html.includes('수정한 프로젝트 설명'));
});
test('content is escaped in text, attributes and metadata', () => {
  const next = structuredClone(content);
  next.profile.name = '<script>alert("x")</script>';
  next.projects[0].title = '" onclick="alert(1)';
  const html = renderPage(next);
  assert.ok(!html.includes('<script>alert')); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&quot; onclick=&quot;alert(1)'));
  assert.equal(escapeHtml("<&>'\""), '&lt;&amp;&gt;&#39;&quot;');
});
test('rejects duplicate project identifiers and mistyped categories before publication', () => {
  const duplicate = structuredClone(content); duplicate.projects[1].id = duplicate.projects[0].id;
  assert.throws(() => validateContent(duplicate), /Duplicate project/);
  const invalid = structuredClone(content); invalid.projects[0].categories.push('typo');
  assert.throws(() => validateContent(invalid), /Unknown category/);
});
test('rejects executable external links', () => {
  const next = structuredClone(content); next.projects[0].links.push({ label:'bad', url:'javascript:alert(1)' });
  assert.throws(() => validateContent(next), /Expected HTTPS/);
});
test('filter counts are derived from project membership', () => {
  const html = renderPage(content);
  for (const category of content.site.categories) {
    const count = content.projects.filter((p) => category.id === 'all' || p.categories.includes(category.id)).length;
    const button = html.match(new RegExp(`data-filter="${category.id}"[^>]*>(.*?)</button>`))[1];
    assert.ok(button.includes(`<span>${count}</span>`));
  }
});
test('home page has complete content without JavaScript or remote libraries', () => {
  const html = renderPage(content);
  assert.ok(html.includes(content.profile.about));
  assert.ok(!/<script[^>]+src="https?:/.test(html));
  assert.ok(!html.includes('href="#"'));
  assert.ok(!/TPS 300|794ms|211ms|hello wanted|hello_wanted|3,000/.test(html));
});
