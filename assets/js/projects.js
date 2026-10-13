const grid = document.getElementById('projectsGrid');
const featuredSlot = document.getElementById('featuredProject');

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
        featured: !!p.featured,
      });
    }

    const featured = resolved.find((p) => p.featured);
    const rest = resolved.filter((p) => !p.featured);

    if (featured && featuredSlot) renderFeatured(featured);
    rest.forEach(renderCard);
  } catch (e) {
    console.error(e);
    showError(String(e));
  }
})();

function renderFeatured({ title, desc, tags, file, repo }) {
  const el = document.createElement('div');
  el.className = 'featured-card';

  let actions = '';
  if (file) actions += `<a class="btn" href="project.html?file=${encodeURIComponent(file)}">${ICONS.externalLink} Read Case Study</a>`;
  if (repo) actions += `<a class="btn btn-ghost-light" href="${repo}" target="_blank" rel="noopener">${ICONS.github} GitHub</a>`;

  el.innerHTML = `
    <span class="featured-badge">Featured Project</span>
    <h3>${escapeHtml(title || 'Untitled Project')}</h3>
    <p>${escapeHtml(desc || '')}</p>
    ${Array.isArray(tags) && tags.length ? `<div class="featured-tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${actions ? `<div class="featured-actions">${actions}</div>` : ''}
    <div class="featured-illustration">${cnnIllustrationSvg()}</div>
  `;
  featuredSlot.appendChild(el);
}

function renderCard({ title, desc, tags, file, repo, icon }) {
  const el = document.createElement('div');
  el.className = 'card';

  const href = file ? `project.html?file=${encodeURIComponent(file)}` : (repo || '#');
  const target = file ? '' : ' target="_blank" rel="noopener"';

  el.innerHTML = `
    <div class="card-head">
      <div class="card-head-left">
        <span class="card-icon" data-icon="${icon}"></span>
        <div class="card-title-group">
          <h3>${escapeHtml(title || 'Untitled Project')}</h3>
          ${Array.isArray(tags) && tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      <a class="card-view-link" href="${href}"${target}>View Project ${ICONS.arrowRight}</a>
    </div>
    <p class="desc">${escapeHtml(desc || '')}</p>
  `;
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

function cnnIllustrationSvg() {
  return `
  <svg viewBox="0 0 300 160" width="260" height="140" fill="none">
    <defs>
      <linearGradient id="fmGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5b8def"/>
        <stop offset="1" stop-color="#2f52c6"/>
      </linearGradient>
    </defs>
    <line x1="92" y1="78" x2="140" y2="78" stroke="#7ea2ef" stroke-width="1.5" stroke-dasharray="3 4"/>
    <polygon points="140,78 132,74 132,82" fill="#7ea2ef"/>
    <line x1="190" y1="82" x2="222" y2="82" stroke="#7ea2ef" stroke-width="1.5" stroke-dasharray="3 4"/>
    <polygon points="222,82 214,78 214,86" fill="#7ea2ef"/>

    <g>
      <rect x="28" y="24" width="64" height="64" rx="4" fill="url(#fmGrad)" opacity=".55"/>
      <rect x="20" y="32" width="64" height="64" rx="4" fill="url(#fmGrad)" opacity=".8"/>
      <rect x="12" y="40" width="64" height="64" rx="4" fill="url(#fmGrad)"/>
      <g stroke="rgba(255,255,255,.35)" stroke-width="1">
        <line x1="12" y1="56" x2="76" y2="56"/>
        <line x1="12" y1="72" x2="76" y2="72"/>
        <line x1="12" y1="88" x2="76" y2="88"/>
        <line x1="28" y1="40" x2="28" y2="104"/>
        <line x1="44" y1="40" x2="44" y2="104"/>
        <line x1="60" y1="40" x2="60" y2="104"/>
      </g>
    </g>

    <g>
      <rect x="150" y="38" width="42" height="42" rx="4" fill="url(#fmGrad)" opacity=".6"/>
      <rect x="144" y="44" width="42" height="42" rx="4" fill="url(#fmGrad)" opacity=".85"/>
      <rect x="138" y="50" width="42" height="42" rx="4" fill="url(#fmGrad)"/>
      <g stroke="rgba(255,255,255,.35)" stroke-width="1">
        <line x1="138" y1="64" x2="180" y2="64"/>
        <line x1="138" y1="78" x2="180" y2="78"/>
        <line x1="152" y1="50" x2="152" y2="92"/>
        <line x1="166" y1="50" x2="166" y2="92"/>
      </g>
    </g>

    <g>
      <rect x="236" y="48" width="26" height="26" rx="3" fill="url(#fmGrad)" opacity=".7"/>
      <rect x="232" y="52" width="26" height="26" rx="3" fill="url(#fmGrad)" opacity=".9"/>
      <rect x="228" y="56" width="26" height="26" rx="3" fill="url(#fmGrad)"/>
      <g stroke="rgba(255,255,255,.35)" stroke-width="1">
        <line x1="228" y1="69" x2="254" y2="69"/>
        <line x1="241" y1="56" x2="241" y2="82"/>
      </g>
    </g>
  </svg>`;
}
