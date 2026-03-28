'use strict';

// project filtering logic
const categories = document.querySelector('.categories');
const projects = document.querySelectorAll('.project');
const projectsContainer = document.querySelector('.projects');
categories.addEventListener('click', (event) => {
    const button = event.target.closest('.category');
    if(button == null) {
        return;
    }
    const filter = button.dataset.category;
    if(filter == null) {
        return;
    }
    handleActiveSelection(button);
    filterProjects(filter);
});

function handleActiveSelection(target) {
    const active = document.querySelector('.category--selected');
    active.classList.remove('category--selected');
    target.classList.add('category--selected');
}
function filterProjects(filter) {
    // project filtering
    projectsContainer.classList.add('anim-out');
    projects.forEach(project => {
        const typeTokens = project.dataset.type.split(' ');
        if(filter === 'all' || typeTokens.includes(filter)) {
            project.style.display = 'block';
        } else {
            project.style.display = 'none';
        }
    });
    setTimeout(() => {
        projectsContainer.classList.remove('anim-out');
    }, 250);
}
