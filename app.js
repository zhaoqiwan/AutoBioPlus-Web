const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.top-nav');

menuToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const tocLinks = [...document.querySelectorAll('.toc-link')];
const sections = tocLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    tocLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}` && !link.classList.contains('toc-subitem')));
  });
}, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });

sections.forEach((section) => sectionObserver.observe(section));

document.querySelectorAll('[data-panzoom]').forEach((viewer) => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  const grid = viewer.querySelector('.scene-grid-lines');

  const render = () => {
    grid.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(-9deg) scale(${scale})`;
  };

  viewer.addEventListener('pointerdown', (event) => {
    isDragging = true;
    startX = event.clientX - offsetX;
    startY = event.clientY - offsetY;
    viewer.setPointerCapture(event.pointerId);
  });
  viewer.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    offsetX = event.clientX - startX;
    offsetY = event.clientY - startY;
    render();
  });
  viewer.addEventListener('pointerup', () => { isDragging = false; });
  viewer.addEventListener('pointercancel', () => { isDragging = false; });
  viewer.addEventListener('wheel', (event) => {
    event.preventDefault();
    scale = Math.min(1.8, Math.max(.7, scale + (event.deltaY > 0 ? -.08 : .08)));
    render();
  }, { passive: false });
});
