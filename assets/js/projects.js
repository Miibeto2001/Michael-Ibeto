const grid = document.getElementById('projectsGrid');
const featuredSlot = document.getElementById('featuredProject');

const ILLUSTRATIONS = {
  cnn: { src: 'assets/img/cnn-pipeline/featured-illustration.png', alt: 'Isometric diagram of feature maps flowing through the convolution pipeline' },
};

let projectsData = [];
let selectedIndex = 0;

(async () => {
  try {
    const url = new URL('projects.json', document.baseURI);
    url.searchParams.set('v', Date.now());
    const res = await fetch(url.href);
    if (!res.ok) throw new Error(`projects.json HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.projects)) throw new Error('Invalid projects.json');

    const resolved = [];
    for (const p of data.projects) {
      let md = '';
      if (p.file) {
        try {
          const mdRes = await fetch(new URL(p.file, document.baseURI));
          if (mdRes.ok) md = await mdRes.text();
        } catch {}
      }
      const { title, excerpt } = parseMarkdown(md, p.title);
      resolved.push({
        title,
        desc: p.summary || excerpt,
        tags: p.tags,
        file: p.file || null,
        repo: p.link || null,
        icon: p.icon || 'cpu',
        illustration: p.illustration || null,
        featured: !!p.featured,
      });
    }

    projectsData = resolved;
    selectedIndex = Math.max(0, resolved.findIndex((p) => p.featured));

    resolved.forEach((p, i) => renderCard(p, i));
    selectProject(selectedIndex, { scroll: false });
  } catch (e) {
    console.error(e);
    showError(String(e));
  }
})();

function selectProject(index, { scroll = true } = {}) {
  if (!projectsData[index] || !featuredSlot) return;
  selectedIndex = index;
  featuredSlot.innerHTML = '';
  renderFeatured(projectsData[index]);

  grid.querySelectorAll('.card').forEach((card) => {
    const isActive = Number(card.dataset.index) === index;
    card.classList.toggle('is-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });

  if (scroll) featuredSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderFeatured({ title, desc, tags, file, repo, illustration }) {
  const el = document.createElement('div');
  el.className = 'featured-card';

  let actions = '';
  if (file) actions += `<a class="btn" href="project.html?file=${encodeURIComponent(file)}">${ICONS.externalLink} Read Case Study</a>`;
  if (repo) actions += `<a class="btn btn-ghost-light" href="${repo}" target="_blank" rel="noopener">${ICONS.github} GitHub</a>`;

  const img = illustration && ILLUSTRATIONS[illustration];

  el.innerHTML = `
    <h3>${escapeHtml(title || 'Untitled Project')}</h3>
    <p>${escapeHtml(desc || '')}</p>
    ${Array.isArray(tags) && tags.length ? `<div class="featured-tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${actions ? `<div class="featured-actions">${actions}</div>` : ''}
    ${img ? `<div class="featured-illustration"><img src="${img.src}" alt="${escapeHtml(img.alt)}"></div>` : ''}
  `;
  featuredSlot.appendChild(el);
}

function renderCard({ title, desc, tags, icon }, index) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'card';
  el.dataset.index = String(index);
  el.setAttribute('aria-pressed', 'false');

  el.innerHTML = `
    <div class="card-head">
      <span class="card-icon" data-icon="${icon}"></span>
      <div class="card-title-group">
        <h3>${escapeHtml(title || 'Untitled Project')}</h3>
        ${Array.isArray(tags) && tags.length ? `<div class="tags-inline">${tags.map(t => escapeHtml(t)).join('<span class="sep">|</span>')}</div>` : ''}
      </div>
    </div>
    <p class="desc">${escapeHtml(desc || '')}</p>
  `;
  el.addEventListener('click', () => selectProject(index));
  grid.appendChild(el);
  hydrateIcons(el);
}

function showError(msg) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<h3>Projects unavailable</h3><p>${escapeHtml(msg)}</p>`;
  grid.appendChild(el);
}

function parseMarkdown(md, titleOverride) {
  if (!md) return { title: titleOverride || 'Untitled Project', excerpt: '' };
  const h1 = md.match(/^\s*#\s+(.+?)\s*$/m);
  const title = titleOverride || (h1 ? h1[1].trim() : 'Untitled Project');
  const lines = md.split('\n');
  let i = 0; while (i < lines.length && !lines[i].trim()) i++;
  while (i < lines.length && (/^\s*#/.test(lines[i]) || /^\s*[-*]\s+/.test(lines[i]))) i++;
  const para = [];
  for (; i < lines.length; i++) { const line = lines[i]; if (!line.trim() || /^\s*#/.test(line)) break; para.push(line); }
  let excerpt = para.join(' ').replace(/\s+/g, ' ').trim();
  if (excerpt.length > 220) excerpt = excerpt.slice(0, 217) + '…';
  return { title, excerpt };
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
