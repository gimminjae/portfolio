import { readFile, access } from 'node:fs/promises';
export async function loadContent(root = new URL('../', import.meta.url)) {
  const names = ['profile', 'projects', 'notes', 'site'];
  const values = await Promise.all(names.map(async (name) => JSON.parse(await readFile(new URL(`content/${name}.json`, root), 'utf8'))));
  const content = Object.fromEntries(names.map((name, index) => [name, values[index]]));
  validateContent(content);
  for (const path of [content.profile.photo.src, content.profile.meta.image, ...content.notes.map((note) => note.path)]) {
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error(`Expected a project-relative asset: ${path}`);
    await access(new URL(path, root));
  }
  return content;
}
export function validateContent({ profile, projects, notes, site }) {
  const required = (value, path) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing text: ${path}`); };
  const uniqueIds = (items, label) => {
    const ids = items.map((item) => item.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} ID`);
    ids.forEach((id) => { if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`Invalid ${label} ID: ${id}`); });
  };
  const safeLink = (link) => { if (!/^https:\/\//.test(link.url)) throw new Error(`Expected HTTPS link: ${link.url}`); required(link.label, 'link.label'); };
  ['name', 'englishName', 'role', 'intro', 'about', 'email', 'phone'].forEach((key) => required(profile[key], `profile.${key}`));
  ['title', 'description', 'url', 'image'].forEach((key) => required(profile.meta[key], `profile.meta.${key}`));
  if (!/^https:\/\//.test(profile.meta.url)) throw new Error('Expected HTTPS canonical URL');
  if (!profile.links.length) throw new Error('Add a profile link');
  profile.links.forEach(safeLink);
  uniqueIds(projects, 'project'); uniqueIds(site.categories, 'category'); uniqueIds(site.navigation, 'navigation');
  uniqueIds([...projects, ...projects.flatMap((project) => project.caseStudies)], 'project/case');
  const projectIds = new Set(projects.map((project) => project.id));
  const experiences = [...profile.experience, ...profile.otherExperience];
  uniqueIds(experiences, 'experience');
  const assignedProjects = new Set();
  for (const job of experiences) {
    if (!Array.isArray(job.projectIds)) throw new Error(`Missing experience projectIds: ${job.id}`);
    for (const id of job.projectIds) {
      if (!projectIds.has(id)) throw new Error(`Unknown experience project: ${id}`);
      if (assignedProjects.has(id)) throw new Error(`Project assigned more than once: ${id}`);
      assignedProjects.add(id);
    }
    ['organization', 'role', 'period', 'description'].forEach((key) => required(job[key], `experience.${key}`));
    for (const item of job.highlights) if (!projectIds.has(item.projectId)) throw new Error(`Unknown experience project: ${item.projectId}`);
  }
  for (const id of projectIds) if (!assignedProjects.has(id)) throw new Error(`Unassigned project: ${id}`);
  const categories = new Set(site.categories.map((category) => category.id));
  if (!categories.has('all')) throw new Error('Missing all category');
  projects.forEach((project) => {
    ['title', 'summary', 'organization', 'kind', 'period', 'role', 'context', 'outcome'].forEach((key) => required(project[key], `${project.id}.${key}`));
    if (!project.categories.length || project.categories.some((category) => !categories.has(category) || category === 'all')) throw new Error(`Unknown category in ${project.id}`);
    if (!Array.isArray(project.stack) || !project.contributions.length) throw new Error(`Missing project details: ${project.id}`);
    project.links.forEach(safeLink);
    project.caseStudies.forEach((item) => {
      ['title', 'summary', 'outcome'].forEach((key) => required(item[key], `${item.id}.${key}`));
      if (!item.contributions.length) throw new Error(`Missing case contributions: ${item.id}`);
    });
  });
  notes.forEach((note) => { required(note.title, 'note.title'); if (!note.path.startsWith('articles/') || !note.path.endsWith('.md')) throw new Error(`Invalid article path: ${note.path}`); });
  Object.entries(site.labels).forEach(([key, value]) => required(value, `labels.${key}`));
}
