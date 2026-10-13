const grid = document.getElementById('projectsGrid');
const featuredSlot = document.getElementById('featuredProject');

const ILLUSTRATIONS = { cnn: cnnIllustrationSvg };

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

  const illustrationFn = illustration && ILLUSTRATIONS[illustration];

  el.innerHTML = `
    <span class="featured-badge">Featured Project</span>
    <h3>${escapeHtml(title || 'Untitled Project')}</h3>
    <p>${escapeHtml(desc || '')}</p>
    ${Array.isArray(tags) && tags.length ? `<div class="featured-tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${actions ? `<div class="featured-actions">${actions}</div>` : ''}
    ${illustrationFn ? `<div class="featured-illustration">${illustrationFn()}</div>` : ''}
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
      <div class="card-head-left">
        <span class="card-icon" data-icon="${icon}"></span>
        <div class="card-title-group">
          <h3>${escapeHtml(title || 'Untitled Project')}</h3>
          ${Array.isArray(tags) && tags.length ? `<div class="tags-inline">${tags.map(t => escapeHtml(t)).join('<span class="sep">|</span>')}</div>` : ''}
        </div>
      </div>
      <span class="card-view-link">View Project ${ICONS.arrowRight}</span>
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

function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
function pts(arr) { return arr.map(p => p.join(',')).join(' '); }

function isoBox(cx, cy, w, h, depth, grid) {
  const N = [cx, cy - h], E = [cx + w, cy], S = [cx, cy + h], W = [cx - w, cy];
  const Sd = [S[0], S[1] + depth], Ed = [E[0], E[1] + depth], Wd = [W[0], W[1] + depth];

  let gridLines = '';
  for (let i = 1; i < grid; i++) {
    const t = i / grid;
    const a = lerp(N, W, t), b = lerp(E, S, t);
    const c = lerp(N, E, t), d = lerp(W, S, t);
    gridLines += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="rgba(255,255,255,.32)" stroke-width=".75"/>`;
    gridLines += `<line x1="${c[0]}" y1="${c[1]}" x2="${d[0]}" y2="${d[1]}" stroke="rgba(255,255,255,.32)" stroke-width=".75"/>`;
  }
  for (let i = 1; i < 3; i++) {
    const t = i / 3;
    const l1 = lerp(W, Wd, t), l2 = lerp(S, Sd, t), r1 = lerp(S, Sd, t), r2 = lerp(E, Ed, t);
    gridLines += `<line x1="${l1[0]}" y1="${l1[1]}" x2="${l2[0]}" y2="${l2[1]}" stroke="rgba(255,255,255,.18)" stroke-width=".75"/>`;
    gridLines += `<line x1="${r1[0]}" y1="${r1[1]}" x2="${r2[0]}" y2="${r2[1]}" stroke="rgba(255,255,255,.18)" stroke-width=".75"/>`;
  }

  return `
    <polygon points="${pts([W, S, Sd, Wd])}" fill="#3f63d1"/>
    <polygon points="${pts([S, E, Ed, Sd])}" fill="#2a4bb8"/>
    <polygon points="${pts([N, E, S, W])}" fill="#7ea2f2"/>
    ${gridLines}
  `;
}

function cnnIllustrationSvg() {
  const b1 = isoBox(58, 56, 34, 17, 46, 4);
  const b2 = isoBox(168, 66, 22, 11, 32, 3);
  const b3 = isoBox(252, 72, 13, 6.5, 20, 2);
  return `
  <svg viewBox="0 0 300 160" width="260" height="140" fill="none">
    <line x1="100" y1="80" x2="140" y2="80" stroke="#9db8f3" stroke-width="1.5" stroke-dasharray="3 4"/>
    <polygon points="140,80 132,76 132,84" fill="#9db8f3"/>
    <line x1="196" y1="86" x2="228" y2="86" stroke="#9db8f3" stroke-width="1.5" stroke-dasharray="3 4"/>
    <polygon points="228,86 220,82 220,90" fill="#9db8f3"/>
    <g>${b1}</g>
    <g>${b2}</g>
    <g>${b3}</g>
  </svg>`;
}
