const grid = document.getElementById('projectsGrid');

(async () => {
  try {
    const url = new URL('projects.json', document.baseURI);
    url.searchParams.set('v', Date.now());
    const res = await fetch(url.href);
    if (!res.ok) throw new Error(`projects.json HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.projects)) throw new Error('Invalid projects.json');

    for (const p of data.projects) {
      // Load md to get title/excerpt (optional)
      let md = '';
      if (p.file) {
        try {
          const mdRes = await fetch(new URL(p.file, document.baseURI));
          if (mdRes.ok) md = await mdRes.text();
        } catch {}
      }
      const { title, excerpt } = parseMarkdown(md, p.title);
      renderCard({ title, excerpt, tags: p.tags, file: p.file || null, repo: p.link || null });
    }
  } catch (e) {
    console.error(e);
    showError(String(e));
  }
})();

function renderCard({ title, excerpt, tags, file, repo }) {
  const el = document.createElement('div');
  el.className = 'card';

  let actions = '';
  if (file) actions += `<a class="btn" href="project.html?file=${encodeURIComponent(file)}">Read</a>`;
  if (repo) actions += ` <a class="btn" href="${repo}" target="_blank" rel="noopener">Repo</a>`;

  el.innerHTML = `
    <h3>${escapeHtml(title || 'Untitled Project')}</h3>
    <p>${escapeHtml(excerpt || '')}</p>
    ${Array.isArray(tags) && tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    ${actions ? `<div class="actions" style="margin-top:.75rem">${actions}</div>` : ''}
  `;
  grid.appendChild(el);
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
