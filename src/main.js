// All portfolio content is pre-rendered. JavaScript only enhances interactions.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#section-nav');
const navLinks = [...navigation.querySelectorAll('a')];
const mobile = window.matchMedia('(max-width: 760px)');
function closeMenu({ restoreFocus = false } = {}) {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = menuButton.dataset.openLabel;
  navigation.classList.remove('is-open');
  if (restoreFocus) menuButton.focus();
}
menuButton.hidden = false;
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? menuButton.dataset.closeLabel : menuButton.dataset.openLabel;
  navigation.classList.toggle('is-open', open);
});
navLinks.forEach((link) => link.addEventListener('click', () => {
  closeMenu();
  if (mobile.matches) {
    const target = document.querySelector(link.hash);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
}));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu({ restoreFocus: true });
});
document.addEventListener('click', (event) => {
  if (!navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
});
mobile.addEventListener('change', () => closeMenu());
document.documentElement.classList.add('enhanced');
const sections = navLinks.map((link) => document.querySelector(link.hash));
let scrollPending = false;
function updateActiveSection() {
  let current = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= 190) current = section;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 8) current = sections.at(-1);
  navLinks.forEach((link) => {
    if (link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollPending = false;
}
window.addEventListener('scroll', () => {
  if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateActiveSection); }
}, { passive: true });
window.addEventListener('resize', updateActiveSection);
updateActiveSection();
const filterGroup = document.querySelector('.project-filters');
const projects = [...document.querySelectorAll('.project')];
const filterStatus = document.querySelector('.filter-status');
filterGroup.hidden = false;
filterGroup.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  let visible = 0;
  projects.forEach((project) => {
    project.hidden = button.dataset.filter !== 'all' && !project.dataset.categories.split(' ').includes(button.dataset.filter);
    if (!project.hidden) visible += 1;
  });
  filterGroup.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  filterStatus.textContent = filterStatus.dataset.template.replace('{count}', String(visible));
  updateActiveSection();
});
function revealLinkedProject() {
  const project = document.getElementById(window.location.hash.slice(1));
  if (!project?.classList.contains('project')) return;
  filterGroup.querySelector('[data-filter="all"]').click();
  project.querySelector('details').open = true;
  project.scrollIntoView();
}
window.addEventListener('hashchange', revealLinkedProject);
revealLinkedProject();
const copyButton = document.querySelector('[data-copy-email]');
copyButton.hidden = false;
copyButton.addEventListener('click', async () => {
  const status = document.querySelector('.copy-status');
  try { await navigator.clipboard.writeText(copyButton.dataset.copyEmail); status.textContent = copyButton.dataset.success; }
  catch { status.textContent = copyButton.dataset.error; }
});
// Print all projects, then restore the visitor's filters and open/closed state.
let printState;
function preparePrint() {
  if (printState) return;
  printState = projects.map((project) => ({ project, hidden: project.hidden, open: project.querySelector('details').open }));
  printState.forEach(({ project }) => { project.hidden = false; project.querySelector('details').open = true; });
}
function restorePrint() {
  printState?.forEach(({ project, hidden, open }) => { project.hidden = hidden; project.querySelector('details').open = open; });
  printState = undefined;
}
window.addEventListener('beforeprint', preparePrint);
window.addEventListener('afterprint', restorePrint);
const printButton = document.querySelector('[data-print]');
printButton.hidden = false;
printButton.addEventListener('click', () => window.print());
