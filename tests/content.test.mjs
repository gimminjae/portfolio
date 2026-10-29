import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadContent, validateContent } from '../scripts/content.mjs';
import { renderPage, escapeHtml } from '../src/render.js';
const content = await loadContent();
const original = JSON.parse(await readFile(new URL('./fixtures/original-projects.json', import.meta.url), 'utf8'));
test('preserves all eight earlier contributions inside their service projects', () => {
  const cases = content.projects.flatMap((project) => project.caseStudies);
  // The resume qualifies the original 80% claim as approximate.
  assert.deepEqual(cases.map(({ title, summary }) => ({ title: title.replace('약 80%', '80%'), summary })), original);
});
test('uses resume dates and distinguishes employment, other experience and education', () => {
  assert.equal(content.profile.experience.length, 1);
  assert.equal(content.profile.experience[0].organization, '아이디알시스템');
  assert.equal(content.profile.experience[0].period, '2022.12 — 2026.04');
  assert.equal(content.profile.otherExperience[0].organization, 'We Bible (위 바이블)');
  assert.equal(content.profile.otherExperience[0].period, '2026.02 — 현재');
  const ecommerce = content.projects.find((p) => p.id === 'ecommerce');
  assert.equal(ecommerce.organization, '아이디알시스템');
  assert.equal(ecommerce.period, '2023.08 — 2024.02');
  assert.ok(content.profile.background.some((item) => item.title === '정보처리산업기사' && item.detail === '2026.09'));
  assert.ok(content.profile.background.some((item) => item.title === '구리남자고등학교' && item.detail === '2019 · 졸업'));
});
test('includes all five resume projects and the newly supplied responsibilities', () => {
  assert.deepEqual(content.projects.map((p) => p.id), ['we-bible', 'life-check', 'pinat', 'seegene', 'ecommerce']);
  const pinat = content.projects.find((p) => p.id === 'pinat');
  assert.equal(pinat.metric.value, '약 80%');
  assert.ok(pinat.contributions.some((text) => text.includes('엑셀 다운로드')));
  assert.ok(pinat.contributions.some((text) => text.includes('공지사항')));
  const bible = content.projects.find((p) => p.id === 'we-bible');
  assert.ok(bible.stack.includes('Expo'));
  assert.ok(bible.stack.includes('AWS S3'));
  assert.ok(bible.contributions.some((text) => text.includes('App Store') && text.includes('Google Play')));
  const seegene = content.projects.find((p) => p.id === 'seegene');
  assert.ok(seegene.contributions.some((text) => text.includes('로그 분석')));
});
test('all navigation, project and article links resolve in the generated page', () => {
  const html = renderPage(content);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
  for (const note of content.notes) assert.ok(html.includes(encodeURIComponent(note.path)));
  for (const p of content.projects) assert.ok(html.includes(`id="project-${p.id}"`));
  for (const id of ['life-check-ui', 'capa', 'architecture', 'frontend-shared', 'api-performance', 'reservation-network', 'pinat', 'backoffice']) {
    assert.ok(ids.includes(`project-${id}`), `Missing earlier project anchor: ${id}`);
  }
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
test('rejects broken experience links and duplicate nested contribution IDs', () => {
  const broken = structuredClone(content); broken.profile.experience[0].highlights[0].projectId = 'missing';
  assert.throws(() => validateContent(broken), /Unknown experience project/);
  const duplicate = structuredClone(content); duplicate.projects[1].caseStudies[0].id = duplicate.projects[0].id;
  assert.throws(() => validateContent(duplicate), /Duplicate project\/case/);
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
