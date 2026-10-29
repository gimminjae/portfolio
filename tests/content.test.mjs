import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadContent, validateContent } from '../scripts/content.mjs';
import { renderPage, escapeHtml } from '../src/render.js';
const content = await loadContent();
const original = JSON.parse(await readFile(new URL('./fixtures/original-projects.json', import.meta.url), 'utf8'));
test('preserves seven retained contributions after the owner removed ecommerce', () => {
  const cases = content.projects.flatMap((project) => project.caseStudies);
  // Owner commit 294419b removed ecommerce and its backoffice contribution.
  const retained = original.filter(({ title }) => title !== '백오피스 React 마이그레이션');
  // The resume qualifies the original 80% claim as approximate.
  assert.deepEqual(cases.map(({ title, summary }) => ({ title: title.replace('약 80%', '80%'), summary })), retained);
});
test('uses resume dates and distinguishes employment, other experience and education', () => {
  assert.equal(content.profile.experience.length, 1);
  assert.equal(content.profile.experience[0].organization, '아이디알시스템');
  assert.equal(content.profile.experience[0].period, '2022.12 — 2026.04');
  assert.equal(content.profile.otherExperience[0].organization, 'We Bible (위 바이블)');
  assert.equal(content.profile.otherExperience[0].period, '2026.02 — 현재');
  const seegene = content.projects.find((p) => p.id === 'seegene');
  assert.equal(seegene.organization, '아이디알시스템');
  assert.equal(seegene.period, '2023.08 — 2024.02');
  assert.ok(content.profile.background.some((item) => item.title === '정보처리산업기사' && item.detail === '2026.09'));
  assert.ok(content.profile.background.some((item) => item.title === '구리남자고등학교' && item.detail === '2019 · 졸업'));
});
test('includes the four selected projects and their responsibilities', () => {
  assert.deepEqual(content.projects.map((p) => p.id), ['we-bible', 'life-check', 'pinat', 'seegene']);
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
test('all navigation and preserved project anchors resolve in the generated page', () => {
  const html = renderPage(content);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
  for (const p of content.projects) assert.ok(html.includes(`id="project-${p.id}"`));
  for (const id of ['life-check-ui', 'capa', 'architecture', 'frontend-shared', 'api-performance', 'reservation-network', 'pinat']) {
    assert.ok(ids.includes(`project-${id}`), `Missing earlier project anchor: ${id}`);
  }
});
test('uses Experience as the only work section and retains earlier section edits', () => {
  const html = renderPage(content);
  assert.deepEqual(content.site.navigation.map(({ id }) => id), ['home', 'experience', 'skills', 'background', 'contact']);
  assert.ok(!html.includes('id="notes"'));
  assert.ok(!html.includes('href="#notes"'));
  assert.ok(!html.includes('<section id="work"'));
  const experience = html.slice(html.indexOf('<section id="experience"'), html.indexOf('<section id="skills"'));
  assert.ok(experience.includes('아이디알시스템'));
  assert.ok(experience.includes('<h2>경력</h2>'));
  assert.ok(!html.includes('ALL PROJECTS'));
  assert.ok(!html.includes('project-filters'));
  assert.ok(!html.includes('경력 및 프로젝트'));
  assert.ok(experience.includes('id="work"'));
  for (const project of content.projects) assert.ok(experience.includes(`id="project-${project.id}"`));
  assert.ok(html.includes('<h2>학력 및 자격증</h2>'));
  assert.ok(!html.includes('배움의 발자취'));
  assert.ok(content.notes.length > 0, 'Keep the original article data archived');
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
test('renders every project once beneath its assigned employer or activity', () => {
  const html = renderPage(content);
  const companyStart = html.indexOf('id="experience-idr-system"');
  const activityStart = html.indexOf('id="experience-we-bible"');
  const company = html.slice(companyStart, activityStart);
  const activity = html.slice(activityStart, html.indexOf('<section id="skills"'));
  for (const id of ['life-check', 'pinat', 'seegene']) assert.ok(company.includes(`id="project-${id}"`));
  assert.ok(!company.includes('id="project-we-bible"'));
  assert.ok(activity.includes('id="project-we-bible"'));
  for (const project of content.projects) assert.equal(html.split(`id="project-${project.id}"`).length - 1, 1);
  // Moving a contribution requires only changing the JSON relationship.
  const moved = structuredClone(content);
  moved.profile.experience[0].projectIds = moved.profile.experience[0].projectIds.filter((id) => id !== 'pinat');
  moved.profile.otherExperience[0].projectIds.push('pinat');
  validateContent(moved);
  const next = renderPage(moved);
  assert.ok(next.indexOf('id="project-pinat"') > next.indexOf('id="experience-we-bible"'));
});
test('rejects missing, duplicate and unknown experience project assignments', () => {
  const missing = structuredClone(content); missing.profile.experience[0].projectIds.pop();
  assert.throws(() => validateContent(missing), /Unassigned project/);
  const duplicate = structuredClone(content); duplicate.profile.otherExperience[0].projectIds.push('pinat');
  assert.throws(() => validateContent(duplicate), /Project assigned more than once/);
  const unknown = structuredClone(content); unknown.profile.experience[0].projectIds.push('missing');
  assert.throws(() => validateContent(unknown), /Unknown experience project/);
});
test('keeps the owner-removed ecommerce content out of data and rendered output', () => {
  const html = renderPage(content);
  const jobs = [...content.profile.experience, ...content.profile.otherExperience];
  assert.ok(!content.projects.some(({ id }) => id === 'ecommerce'));
  assert.ok(jobs.every((job) => !job.projectIds.includes('ecommerce')));
  for (const text of ['id="project-ecommerce"', 'id="project-backoffice"', '자사 이커머스 솔루션', '백오피스 React 마이그레이션']) {
    assert.ok(!html.includes(text), text);
  }
});
test('home page has complete content without JavaScript or remote libraries', () => {
  const html = renderPage(content);
  assert.ok(html.includes(escapeHtml(content.profile.about)));
  assert.ok(!/<script[^>]+src="https?:/.test(html));
  assert.ok(!html.includes('href="#"'));
  assert.ok(!/TPS 300|794ms|211ms|hello wanted|hello_wanted|3,000/.test(html));
});
