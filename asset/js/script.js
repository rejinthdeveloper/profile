const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

// ---------- Scroll reveal (children stagger via --i) ----------
document.querySelectorAll('.feature-list, .card-grid, .timeline').forEach((group) => {
  [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
});
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

// ---------- Active nav link ----------
const navLinks = document.querySelectorAll('.nav a');
const sections = [...navLinks].map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const navIo = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navIo.observe(s));
}

// ---------- Scroll effects: progress bar, sticky header, parallax ----------
const topbar = document.querySelector('.topbar');
const progress = document.getElementById('progress');
const heroInner = document.getElementById('heroInner');
const orbs = [...document.querySelectorAll('.orb-wrap')];
let mouseX = 0, mouseY = 0, ticking = false;

function onFrame() {
  ticking = false;
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  topbar.classList.toggle('scrolled', y > 10);
  if (reduceMotion) return;

  orbs.forEach((orb) => {
    const speed = parseFloat(orb.dataset.speed) || 0;
    const m = parseFloat(orb.dataset.mouse) || 0;
    orb.style.transform = `translate3d(${mouseX * m}px, ${y * speed + mouseY * m}px, 0)`;
  });
  const vh = window.innerHeight;
  if (y < vh * 1.2) {
    heroInner.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
    heroInner.style.opacity = Math.max(0, 1 - y / (vh * 0.75));
  }
}
const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
window.addEventListener('scroll', requestFrame, { passive: true });
window.addEventListener('resize', requestFrame);
window.addEventListener('pointermove', (e) => {
  mouseX = e.clientX / window.innerWidth - 0.5;
  mouseY = e.clientY / window.innerHeight - 0.5;
  requestFrame();
}, { passive: true });
onFrame();

// ---------- Cursor spotlight on cards ----------
document.querySelectorAll('.feature, .card').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

// ---------- Hero particle network ----------
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
const pointer = { x: -9999, y: -9999 };
let particles = [], w = 0, h = 0, colors = [], running = false, heroVisible = true;
const LINK = 130;

function readColors() { colors = [css('--accent'), css('--accent-2'), css('--accent-3')]; }

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = rect.width; h = rect.height;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.min(90, Math.floor((w * h) / 14000));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r: Math.random() * 1.6 + 0.8,
    c: Math.floor(Math.random() * 3),
  }));
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!reduceMotion) {
      // gentle push away from the cursor
      const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
      if (d2 < 14000) { p.x += dx * 0.012; p.y += dy * 0.012; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
      if (d < LINK) {
        ctx.globalAlpha = (1 - d / LINK) * 0.35;
        ctx.strokeStyle = colors[p.c];
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    const pd = Math.hypot(p.x - pointer.x, p.y - pointer.y);
    if (pd < 180) {
      ctx.globalAlpha = (1 - pd / 180) * 0.6;
      ctx.strokeStyle = colors[1];
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
    }
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colors[p.c];
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function loop() {
  if (!running) return;
  draw();
  requestAnimationFrame(loop);
}
function updateRunning() {
  const should = heroVisible && !document.hidden && !reduceMotion;
  if (should && !running) { running = true; requestAnimationFrame(loop); }
  if (!should) running = false;
}

readColors();
resize();
draw();
window.addEventListener('resize', () => { resize(); draw(); });
canvas.parentElement.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
});
canvas.parentElement.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });
document.addEventListener('visibilitychange', updateRunning);
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateRunning(); })
    .observe(canvas.parentElement);
}
updateRunning();

// ---------- Theme toggle (saved choice wins; otherwise follow the OS) ----------
const toggle = document.getElementById('themeToggle');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : darkQuery.matches);
const syncTheme = () => {
  toggle.innerHTML = isDark() ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
  readColors();
  draw();
};
toggle.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  syncTheme();
});
darkQuery.addEventListener('change', syncTheme);
syncTheme();

document.getElementById('year').textContent = new Date().getFullYear();
