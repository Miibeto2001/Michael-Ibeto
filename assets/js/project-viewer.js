(function () {
  const titleEl = document.getElementById('projTitle');
  const metaEl  = document.getElementById('projMeta');
  const contentEl = document.getElementById('projContent');
  const params = new URLSearchParams(location.search);
  const file = params.get('file'); // e.g. projects/Digital-Design.md

  // Show current year in footer (same as home)
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  if (!file) return fail('Missing ?file= parameter.');

  // Only allow same-origin files (no GitHub/CORS)
  let u;
  try { u = new URL(file, document.baseURI); }
  catch { return fail('Invalid file path.'); }
  if (u.origin !== location.origin) {
    return fail(`Cross-origin blocked: ${u.href}`);
  }

  (async () => {
    try {
      const res = await fetch(u.href, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const md = await res.text();

      // Title from first H1
      const h1 = md.match(/^\s*#\s+(.+?)\s*$/m);
      const pageTitle = h1 ? h1[1].trim() : (u.pathname.split('/').pop() || 'Project');
      document.title = pageTitle + ' – Project';
      titleEl.textContent = pageTitle;

      // Optional: show file path under title
      metaEl.textContent = u.pathname;

      // Render markdown into site-styled HTML
      contentEl.innerHTML = mdToHtml(md);
      window.scrollTo(0, 0);
    } catch (e) {
      fail(`Could not open ${u.pathname}. ${String(e.message || e)}`);
    }
  })();

  // --- Minimal Markdown → HTML ---
  function mdToHtml(md){
    // fenced code ```lang
    md = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_,lang,code)=>{
      const esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const cls = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${cls}>${esc}</code></pre>`;
    });
    // inline code `x`
    md = md.replace(/`([^`]+?)`/g, (_,c)=>`<code>${c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>`);
    // headings ######
    for (let i=6;i>=1;i--){
      const re = new RegExp(`^\\s*${'#'.repeat(i)}\\s+(.+)$`,'gm');
      md = md.replace(re, `<h${i}>$1</h${i}>`);
    }
    // links [t](url)
    md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(m,t,href)=>`<a href="${href}" target="_blank" rel="noopener">${t}</a>`);
    // unordered lists
    md = md.replace(/^(?:\s*[-*+]\s.+\n?)+/gm, block=>{
      const items = block.trim().split(/\n/).map(l=>l.replace(/^\s*[-*+]\s+/,'').trim());
      return `<ul>${items.map(li=>`<li>${li}</li>`).join('')}</ul>`;
    });
    // ordered lists
    md = md.replace(/^(?:\s*\d+\.\s.+\n?)+/gm, block=>{
      const items = block.trim().split(/\n/).map(l=>l.replace(/^\s*\d+\.\s+/,'').trim());
      return `<ol>${items.map(li=>`<li>${li}</li>`).join('')}</ol>`;
    });
    // paragraphs
    return md.split(/\n{2,}/).map(chunk =>
      /<\/?(h\d|ul|ol|pre)/.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g,' ').trim()}</p>`
    ).join('\n');
  }

  function fail(msg){
    console.error(msg);
    document.title = 'Project unavailable';
    titleEl.textContent = 'Project unavailable';
    metaEl.textContent = '';
    contentEl.innerHTML = `<p>${msg}</p>
      <ol>
        <li>Use a local <code>.md</code> path like <code>projects/YourFile.md</code>.</li>
        <li>External links should open as “Repo” from the card, not via this viewer.</li>
        <li>Serve over http:// (VS Code Live Server or <code>python -m http.server</code>).</li>
      </ol>`;
  }
})();
