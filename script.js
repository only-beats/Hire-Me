(() => {
  const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));

  /* ---------- eyes ---------- */
  const eyes = [...document.querySelectorAll('.eye')].map(g => ({
    pupil: g.querySelector('.pupil'),
    white: g.querySelector('.white'),
    cx: +g.dataset.cx, cy: +g.dataset.cy,
    mx: +g.dataset.mx, my: +g.dataset.my,
    x: 0, y: 0
  }));

  let mode = 'mouse';
  const mouse = { x: null, y: null };
  const joy = { x: 0, y: 0 };

  /* mouse (laptop) */
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mode = 'mouse';
    mouse.x = e.clientX; mouse.y = e.clientY;
  });
  document.addEventListener('mouseleave', () => { mouse.x = null; });

  /* joystick (mobile) */
  const base = document.getElementById('joyBase');
  const knob = document.getElementById('joyKnob');
  let dragging = false;

  function moveKnob(e) {
    const r = base.getBoundingClientRect();
    if (!r.width) return;
    const max = (r.width - knob.offsetWidth) / 2;
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    joy.x = dx / max; joy.y = dy / max;
    mode = 'joy';
  }
  base.addEventListener('pointerdown', e => {
    e.preventDefault();
    dragging = true; base.setPointerCapture(e.pointerId);
    knob.classList.add('drag'); moveKnob(e);
  });
  base.addEventListener('pointermove', e => { if (dragging) { e.preventDefault(); moveKnob(e); } });
  const release = () => {
    if (!dragging) return;
    dragging = false; knob.classList.remove('drag');
    knob.style.transform = 'translate(0,0)'; joy.x = 0; joy.y = 0;
  };
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);

  /* hide joystick once the portrait is off screen */
  const joyWrap = document.getElementById('joyWrap');
  const art = document.getElementById('me');
  new IntersectionObserver(([en]) => {
    joyWrap.classList.toggle('away', !en.isIntersecting);
  }, { threshold: 0.15 }).observe(art);

  /* lips: the lower lip drops in thin strips, so the opening is lens-shaped */
  const NS = 'http://www.w3.org/2000/svg';
  const lowerLip = document.getElementById('mLower');
  const inner = document.getElementById('mInner');
  const teeth = document.getElementById('mTeeth');
  const X0 = 498, X1 = 607, N = 22, MAXD = 10;
  const seamPts = [[498, 437], [515, 441], [535, 442.3], [555, 442], [575, 441.3], [595, 440.5], [607, 439.5]];
  const seamY = x => {
    for (let i = 1; i < seamPts.length; i++) {
      if (x <= seamPts[i][0]) { const [xa, ya] = seamPts[i - 1], [xb, yb] = seamPts[i]; return ya + (yb - ya) * (x - xa) / (xb - xa); }
    }
    return seamPts[seamPts.length - 1][1];
  };
  const bulge = x => Math.sin(Math.PI * (x - X0) / (X1 - X0));
  const strips = [];
  if (lowerLip) {
    const defs = lowerLip.ownerSVGElement.querySelector('defs');
    const w = (X1 - X0) / N;
    for (let i = 0; i < N; i++) {
      const cp = document.createElementNS(NS, 'clipPath'); cp.id = 'strip' + i;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', X0 + i * w - 0.4); r.setAttribute('y', 400);
      r.setAttribute('width', w + 0.8); r.setAttribute('height', 90);
      cp.appendChild(r); defs.appendChild(cp);
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = '<g clip-path="url(#lipClip)"><g clip-path="url(#strip' + i + ')"><image href="svg/Img2.png" width="1086" height="1448"/></g></g>';
      lowerLip.appendChild(g);
      strips.push({ g, b: bulge(X0 + (i + 0.5) * w) });
    }
  }
  const lens = (xa, xb, k, d) => {
    const xs = []; for (let i = 0; i <= 24; i++) xs.push(xa + (xb - xa) * i / 24);
    const top = xs.map(x => `${x.toFixed(1)} ${seamY(x).toFixed(2)}`);
    const bot = xs.slice().reverse().map(x => `${x.toFixed(1)} ${(seamY(x) + d * k * Math.sin(Math.PI * (x - xa) / (xb - xa))).toFixed(2)}`);
    return 'M' + top.join(' L') + ' L' + bot.join(' L') + ' Z';
  };
  let mouth = 0, lastD = -1;
  function updateMouth() {
    mouth += ((window.__mouthTarget || 0) - mouth) * 0.35;
    const d = mouth * MAXD;
    if (!strips.length || Math.abs(d - lastD) < 0.05) return;
    lastD = d;
    for (const s of strips) s.g.setAttribute('transform', `translate(0 ${(d * s.b).toFixed(2)})`);
    inner.setAttribute('d', d < 0.15 ? '' : lens(X0 + 1, X1 - 1, 1, d));
    teeth.setAttribute('d', d < 4 ? '' : lens(516, 590, 0.28, d));
  }

  /* animation loop */
  function frame() {
    updateMouth();
    for (const eye of eyes) {
      let tx = 0, ty = 0;
      if (mode === 'joy') {
        tx = joy.x; ty = joy.y;
      } else if (mouse.x !== null) {
        const r = eye.white.getBoundingClientRect();
        tx = clamp((mouse.x - (r.left + r.width / 2)) / (innerWidth * 0.3));
        ty = clamp((mouse.y - (r.top + r.height / 2)) / (innerHeight * 0.3));
      }
      const len = Math.hypot(tx, ty);
      if (len > 1) { tx /= len; ty /= len; }
      eye.x += (tx - eye.x) * 0.16;
      eye.y += (ty - eye.y) * 0.16;
      eye.pupil.setAttribute('transform',
        `translate(${(eye.cx + eye.x * eye.mx).toFixed(2)} ${(eye.cy + eye.y * eye.my).toFixed(2)})`);
    }
    requestAnimationFrame(frame);
  }
  frame();

  /* ---------- typing roles ---------- */
  const roles = ['web apps people enjoy', 'clean, scalable backends', 'tools that solve real problems'];
  const out = document.getElementById('typed');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    out.textContent = roles[0];
  } else {
    let i = 0, n = 0, del = false;
    (function tick() {
      const word = roles[i];
      n += del ? -1 : 1;
      out.textContent = word.slice(0, n);
      let wait = del ? 35 : 70;
      if (!del && n === word.length) { del = true; wait = 1600; }
      else if (del && n === 0) { del = false; i = (i + 1) % roles.length; wait = 350; }
      setTimeout(tick, wait);
    })();
  }
})();