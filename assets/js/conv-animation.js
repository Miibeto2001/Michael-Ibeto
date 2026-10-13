(function () {
  const IMG_SIZE = 1024;
  const KERNEL = 4;
  const MAX_POS = IMG_SIZE - KERNEL + 1; // 1021 valid window positions per axis
  const GRID = 48; // visual sampling resolution
  const TICK_MS = 35;

  function findAndInit() {
    const root = document.getElementById('convAnim');
    if (root && !root.dataset.initialized) {
      root.dataset.initialized = '1';
      initConvAnimation(root);
      return true;
    }
    return false;
  }

  if (!findAndInit()) {
    const target = document.getElementById('projContent');
    if (target) {
      const observer = new MutationObserver(() => {
        if (findAndInit()) observer.disconnect();
      });
      observer.observe(target, { childList: true, subtree: true });
    }
  }

  function initConvAnimation(root) {
    root.innerHTML = `
      <div class="conv-anim-canvas-wrap">
        <canvas class="conv-anim-canvas" width="${GRID * 7}" height="${GRID * 7}" aria-hidden="true"></canvas>
      </div>
      <div class="conv-anim-readout">
        <div class="conv-anim-field"><span class="conv-anim-label">Window position</span><span class="conv-anim-value" data-field="pos">row 0, col 0</span></div>
        <div class="conv-anim-field"><span class="conv-anim-label">dram_addr_input</span><span class="conv-anim-value conv-anim-mono" data-field="addr">0x00000010</span></div>
      </div>
      <div class="conv-anim-controls">
        <button type="button" class="btn btn-outline conv-anim-toggle">Pause</button>
      </div>
      <p class="conv-anim-caption">Live demo: 4&times;4 window raster-scanning a stylized 1024&times;1024 input, address computed with the formula above.</p>
    `;

    const canvas = root.querySelector('.conv-anim-canvas');
    const ctx = canvas.getContext('2d');
    const posEl = root.querySelector('[data-field="pos"]');
    const addrEl = root.querySelector('[data-field="addr"]');
    const toggleBtn = root.querySelector('.conv-anim-toggle');

    const dpr = window.devicePixelRatio || 1;
    const cssSize = 260;
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    const cell = (cssSize * dpr) / GRID;

    const bg = document.createElement('canvas');
    bg.width = canvas.width;
    bg.height = canvas.height;
    const bgCtx = bg.getContext('2d');
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const n = Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1;
        const lightness = 14 + n * 22;
        bgCtx.fillStyle = `hsl(222, 55%, ${lightness}%)`;
        bgCtx.fillRect(c * cell, r * cell, cell + 0.5, cell + 0.5);
      }
    }
    bgCtx.strokeStyle = 'rgba(255,255,255,0.05)';
    bgCtx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      bgCtx.beginPath();
      bgCtx.moveTo(i * cell, 0);
      bgCtx.lineTo(i * cell, bg.height);
      bgCtx.stroke();
      bgCtx.beginPath();
      bgCtx.moveTo(0, i * cell);
      bgCtx.lineTo(bg.width, i * cell);
      bgCtx.stroke();
    }

    let visRow = 0;
    let visCol = 0;
    let running = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = null;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bg, 0, 0);

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4da3ff';
      const winCells = 3; // visual window size (schematic, not to scale)
      const x = visCol * cell;
      const y = visRow * cell;
      const w = winCells * cell;

      ctx.fillStyle = accent + '33';
      ctx.fillRect(x, y, w, w);
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1.5, cell * 0.12);
      ctx.strokeRect(x, y, w, w);

      const realRow = Math.round((visRow / (GRID - 1)) * (MAX_POS - 1));
      const realCol = Math.round((visCol / (GRID - 1)) * (MAX_POS - 1));
      const addr = (0x10 + realRow * 1024 + realCol * 8) >>> 0;

      posEl.textContent = `row ${realRow}, col ${realCol}`;
      addrEl.textContent = '0x' + addr.toString(16).padStart(8, '0');
    }

    function step() {
      visCol++;
      if (visCol >= GRID) {
        visCol = 0;
        visRow++;
        if (visRow >= GRID) visRow = 0;
      }
      draw();
    }

    function start() {
      if (timer) return;
      timer = setInterval(step, TICK_MS);
      running = true;
      toggleBtn.textContent = 'Pause';
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      running = false;
      toggleBtn.textContent = 'Play';
    }

    let pausedByUser = false;

    toggleBtn.addEventListener('click', () => {
      if (running) { stop(); pausedByUser = true; }
      else { start(); pausedByUser = false; }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (running) stop();
      } else if (!pausedByUser) {
        start();
      }
    });

    draw();
    if (running) start();
    else toggleBtn.textContent = 'Play';
  }
})();
