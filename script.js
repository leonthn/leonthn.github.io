/* =========================================================
   Leon Thein – Interaktionen
   Jede Funktion prüft selbst, ob ihre Elemente auf der Seite existieren,
   deshalb läuft dieselbe Datei auf allen Unterseiten.
   ========================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function safeStorage(type, action, key, value) {
    try {
        const s = window[type];
        if (action === 'get') return s.getItem(key);
        s.setItem(key, value);
    } catch (e) { return null; }
}

/* ---------- Intro ---------- */
function initIntro() {
    const intro = $('#intro');
    const start = () => root.classList.add('loaded');
    if (!intro || root.classList.contains('no-intro') || reducedMotion) {
        if (intro) intro.remove();
        requestAnimationFrame(start);
        return;
    }
    document.body.style.overflow = 'hidden';
    const count = $('#intro-count');
    const bar = $('.intro-bar i');
    const duration = 1300;
    const t0 = performance.now();
    function step(now) {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(eased * 100);
        count.textContent = val;
        bar.style.width = val + '%';
        if (p < 1) return requestAnimationFrame(step);
        setTimeout(() => {
            intro.classList.add('done');
            document.body.style.overflow = '';
            start();
            safeStorage('sessionStorage', 'set', 'intro-seen', '1');
            setTimeout(() => intro.remove(), 1100);
        }, 150);
    }
    requestAnimationFrame(step);
}

/* ---------- Theme ---------- */
function initTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        const apply = () => {
            root.setAttribute('data-theme', next);
            safeStorage('localStorage', 'set', 'theme', next);
            window.dispatchEvent(new Event('themechange'));
        };
        if (!document.startViewTransition || reducedMotion) return apply();
        const r = btn.getBoundingClientRect();
        root.style.setProperty('--vt-x', (r.left + r.width / 2) + 'px');
        root.style.setProperty('--vt-y', (r.top + r.height / 2) + 'px');
        document.startViewTransition(apply);
    });
}

/* ---------- Navigation ---------- */
function initNav() {
    const nav = $('#nav');
    if (!nav) return;
    let lastY = window.scrollY;
    const progress = $('#scroll-progress');
    function onScroll() {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 30);
        const menuOpen = root.classList.contains('menu-open');
        nav.classList.toggle('hidden', !menuOpen && y > 400 && y > lastY + 4);
        if (y < lastY - 4 || y < 400) nav.classList.remove('hidden');
        lastY = y;
        if (progress) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobiles Menü
    const menuBtn = $('#menu-btn');
    const menu = $('#mobile-menu');
    if (menuBtn && menu) {
        const toggle = (open) => {
            root.classList.toggle('menu-open', open);
            menuBtn.setAttribute('aria-expanded', String(open));
            document.body.style.overflow = open ? 'hidden' : '';
        };
        menuBtn.addEventListener('click', () => toggle(!root.classList.contains('menu-open')));
        $$('a', menu).forEach(a => a.addEventListener('click', () => toggle(false)));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
    }

    // Aktiven Abschnitt markieren
    const links = $$('.nav-links a[href^="#"]');
    const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
    // Im Hero ist noch kein Abschnitt aktiv
    window.addEventListener('scroll', () => {
        if (window.scrollY < window.innerHeight * 0.5) links.forEach(a => a.classList.remove('active'));
    }, { passive: true });
}

/* ---------- Eigener Cursor ---------- */
function initCursor() {
    if (!finePointer || reducedMotion) return;
    const dot = $('#cursor-dot');
    const ring = $('#cursor-ring');
    if (!dot || !ring) return;
    let mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        root.classList.add('has-cursor');
    }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
    (function loop() {
        rx += (mx - rx) * 0.18;
        ry += (my - ry) * 0.18;
        dot.style.transform = `translate(${mx}px, ${my}px)`;
        ring.style.transform = `translate(${rx}px, ${ry}px)`;
        requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', e => {
        ring.classList.toggle('hover', !!e.target.closest('a, button, .tool, .day, input, textarea, [data-cursor]'));
    });
}

/* ---------- Neuronales Netz im Hero ---------- */
function initNeural() {
    const canvas = $('#neural');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, points = [], running = true, colors;
    const mouse = { x: -9999, y: -9999 };

    function readColors() {
        const cs = getComputedStyle(root);
        colors = {
            a: cs.getPropertyValue('--accent').trim(),
            b: cs.getPropertyValue('--accent-2').trim(),
            line: root.getAttribute('data-theme') === 'light' ? '20,20,60' : '180,190,255'
        };
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.offsetWidth; h = canvas.offsetHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.min(110, Math.round((w * h) / 14000));
        points = Array.from({ length: count }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            r: Math.random() * 1.6 + 0.6,
            c: Math.random() > 0.5 ? 'a' : 'b'
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        const maxDist = 130;
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (!reducedMotion) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                // Punkte weichen der Maus leicht aus
                const dx = p.x - mouse.x, dy = p.y - mouse.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 22000) {
                    const f = (22000 - d2) / 22000 * 0.6;
                    p.x += dx * f * 0.03; p.y += dy * f * 0.03;
                }
            }
            for (let j = i + 1; j < points.length; j++) {
                const q = points[j];
                const dx = p.x - q.x, dy = p.y - q.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < maxDist) {
                    ctx.strokeStyle = `rgba(${colors.line},${(1 - d / maxDist) * 0.18})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
                }
            }
            // Verbindungen zur Maus
            const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
            const md = Math.sqrt(mdx * mdx + mdy * mdy);
            if (md < 200) {
                ctx.strokeStyle = colors[p.c];
                ctx.globalAlpha = (1 - md / 200) * 0.6;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = colors[p.c];
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
    }

    function loop() {
        if (!running) return;
        draw();
        requestAnimationFrame(loop);
    }

    readColors(); resize();
    window.addEventListener('resize', () => { resize(); if (reducedMotion) draw(); });
    window.addEventListener('themechange', () => { readColors(); if (reducedMotion) draw(); });
    canvas.parentElement.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });

    if (reducedMotion) { draw(); return; }
    new IntersectionObserver(([entry]) => {
        const was = running;
        running = entry.isIntersecting && !document.hidden;
        if (running && !was) loop();
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => {
        const was = running;
        running = !document.hidden;
        if (running && !was) loop();
    });
    loop();
}

/* ---------- Wechselnde Rolle mit Scramble-Effekt ---------- */
function initRoles() {
    const el = $('#role-word');
    if (!el) return;
    const roles = ['baue Websites', 'lerne mit KI', 'organisiere Projekte', 'trainiere für Hyrox', 'investiere langfristig', 'schreibe Python'];
    const glyphs = '!<>-_\\/[]{}—=+*^?#abcdefghijklmnopqrstuvwxyz';
    let index = 0;

    function scrambleTo(text) {
        const from = el.textContent;
        const len = Math.max(from.length, text.length);
        const queue = [];
        for (let i = 0; i < len; i++) {
            const start = Math.floor(Math.random() * 14);
            queue.push({ from: from[i] || '', to: text[i] || '', start, end: start + Math.floor(Math.random() * 14) + 6 });
        }
        let frame = 0;
        (function update() {
            let out = '', done = 0;
            for (const q of queue) {
                if (frame >= q.end) { done++; out += q.to; }
                else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
                else out += q.from;
            }
            el.textContent = out;
            if (done < queue.length) { frame++; requestAnimationFrame(update); }
        })();
    }

    if (reducedMotion) return;
    setInterval(() => {
        if (document.hidden) return;
        index = (index + 1) % roles.length;
        scrambleTo(roles[index]);
    }, 2800);
}

/* ---------- Uhrzeit Dresden ---------- */
function initClock() {
    const digital = $('#local-time');
    const hEl = $('#clock-h'), mEl = $('#clock-m'), sEl = $('#clock-s');
    if (!digital && !hEl) return;
    function dresdenNow() {
        const parts = new Intl.DateTimeFormat('de-DE', {
            timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).formatToParts(new Date());
        const get = t => parseInt(parts.find(p => p.type === t).value, 10);
        return { h: get('hour') % 24, m: get('minute'), s: get('second') };
    }
    function tick() {
        const { h, m, s } = dresdenNow();
        if (digital) digital.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        if (hEl) {
            hEl.style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
            mEl.style.transform = `rotate(${m * 6 + s * 0.1}deg)`;
            sEl.style.transform = `rotate(${s * 6}deg)`;
        }
    }
    tick();
    setInterval(tick, 1000);
}

/* ---------- Zahlen hochzählen ---------- */
function countUp(el) {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const sep = el.dataset.sep;
    const format = v => {
        let s = v.toFixed(dec).replace('.', ',');
        if (sep) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
        return s;
    };
    if (reducedMotion) { el.textContent = format(to); return; }
    const duration = 1800;
    const t0 = performance.now();
    (function step(now) {
        const p = Math.min(1, (now - t0) / duration);
        el.textContent = format(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
    })(t0);
}

/* ---------- Einblenden beim Scrollen ---------- */
function initReveal() {
    $$('.reveal-stagger').forEach(group => {
        Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
    });
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('in');
            $$('.count', el).forEach(countUp);
            const week = $('.week', el);
            if (week) week.classList.add('in');
            io.unobserve(el);
        });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    $$('.reveal, .reveal-stagger').forEach(el => io.observe(el));
}

/* ---------- Statement Wort für Wort ---------- */
function initStatement() {
    const el = $('#statement');
    if (!el) return;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
    const spans = $$('.w', el);
    if (reducedMotion) { spans.forEach(s => s.classList.add('on')); return; }
    let ticking = false;
    function update() {
        ticking = false;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        const n = Math.round(p * spans.length);
        spans.forEach((s, i) => s.classList.toggle('on', i < n));
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
}

/* ---------- Spotlight, Tilt & magnetische Buttons ---------- */
function initPointerEffects() {
    if (!finePointer) return;
    $$('.spotlight').forEach(el => {
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--x', (e.clientX - r.left) + 'px');
            el.style.setProperty('--y', (e.clientY - r.top) + 'px');
        });
    });
    if (reducedMotion) return;
    $$('.tilt').forEach(el => {
        const shine = $('.cert-shine', el);
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            el.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-4px)`;
            if (shine) shine.style.setProperty('--shine', (100 - (px + 0.5) * 100) + '%');
        });
        el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    $$('.magnetic').forEach(el => {
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.25) + 'px');
            el.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.35) + 'px');
        });
        el.addEventListener('mouseleave', () => {
            el.style.setProperty('--mx', '0px');
            el.style.setProperty('--my', '0px');
        });
    });
}

/* ---------- Timeline füllt sich beim Scrollen ---------- */
function initTimeline() {
    const tl = $('#timeline');
    const fill = $('#tl-fill');
    if (!tl || !fill) return;
    const items = $$('.tl-item', tl);
    let ticking = false;
    function update() {
        ticking = false;
        const r = tl.getBoundingClientRect();
        const mid = window.innerHeight * 0.6;
        const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
        fill.style.height = (p * 100) + '%';
        items.forEach(item => {
            const dot = $('.tl-dot', item).getBoundingClientRect();
            item.classList.toggle('passed', dot.top < mid);
        });
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
}

/* ---------- Fortschritt im Abi-Jahr ---------- */
function initAbiProgress() {
    const bar = $('#abi-bar');
    const label = $('#abi-pct');
    if (!bar) return;
    const start = new Date('2026-08-17').getTime();
    const end = new Date('2027-06-30').getTime();
    const p = Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
    const pct = Math.round(p * 100);
    new IntersectionObserver(([entry], obs) => {
        if (!entry.isIntersecting) return;
        bar.style.width = Math.max(pct, 2) + '%';
        label.textContent = pct + ' %';
        obs.disconnect();
    }).observe(bar);
}

/* ---------- Kontaktformular (Formspree, ohne Seitenwechsel) ---------- */
function initForm() {
    const form = $('#contact-form');
    if (!form) return;
    const status = $('#form-status');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        status.textContent = '';
        form.classList.add('sending');
        try {
            const res = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) throw new Error('Serverfehler');
            form.reset();
            form.classList.add('sent');
            burst(60);
        } catch (err) {
            status.textContent = 'Das hat leider nicht geklappt. Versuch es bitte später noch einmal.';
        } finally {
            form.classList.remove('sending');
        }
    });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------- Konfetti aus kleinen Sammelkarten ---------- */
function burst(amount = 140) {
    const canvas = $('#confetti');
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = ['#7aa2ff', '#b48cff', '#ff8fd0', '#ffb86b', '#38e1c4', '#facc15'];
    const parts = Array.from({ length: amount }, () => ({
        x: innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: innerHeight + 20,
        vx: (Math.random() - 0.5) * 16,
        vy: -(Math.random() * 18 + 12),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        w: 10 + Math.random() * 8,
        h: 14 + Math.random() * 10,
        c: palette[Math.floor(Math.random() * palette.length)]
    }));
    const t0 = performance.now();
    (function frame(now) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        let alive = 0;
        for (const p of parts) {
            p.vy += 0.45; p.vx *= 0.99;
            p.x += p.vx; p.y += p.vy; p.rot += p.vr;
            if (p.y < innerHeight + 60) alive++;
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.fillStyle = 'rgba(255,255,255,.55)';
            ctx.fillRect(-p.w / 2 + 2, -p.h / 2 + 2, p.w - 4, p.h * 0.45);
            ctx.restore();
        }
        if (alive && now - t0 < 6000) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(t0);
}

function initKonami() {
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let pos = 0;
    document.addEventListener('keydown', e => {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        pos = key === code[pos] ? pos + 1 : (key === code[0] ? 1 : 0);
        if (pos === code.length) {
            pos = 0;
            burst(180);
            toast('🃏 15.000 Karten später … Danke fürs Vorbeischauen!');
        }
    });
}

/* ---------- Command Palette (⌘K / Strg+K) ---------- */
function initPalette() {
    const palette = $('#palette');
    if (!palette) return;
    const input = $('#palette-input');
    const list = $('#palette-list');
    const hint = $('#kbd-hint');
    if (hint && !isMac) hint.textContent = 'Strg K';
    $$('.hero-meta kbd').forEach(k => { if (!isMac) k.textContent = 'Strg K'; });

    const go = hash => () => { const t = $(hash); if (t) t.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); };
    const open = url => () => window.open(url, '_blank', 'noopener');
    const actions = [
        { group: 'Navigation', icon: '👋', label: 'Über mich', hint: '01', run: go('#about') },
        { group: 'Navigation', icon: '🚀', label: 'Projekte', hint: '02', run: go('#projekte') },
        { group: 'Navigation', icon: '🧭', label: 'Werdegang', hint: '03', run: go('#werdegang') },
        { group: 'Navigation', icon: '🎓', label: 'Zertifikate', hint: '04', run: go('#zertifikate') },
        { group: 'Navigation', icon: '⏱️', label: 'Gerade jetzt', hint: '05', run: go('#jetzt') },
        { group: 'Navigation', icon: '✉️', label: 'Kontakt', hint: '06', run: go('#kontakt') },
        { group: 'Projekte', icon: '🃏', label: 'Case Study: Lehrerkarten', hint: 'Seite', run: () => { location.href = 'projekt-lehrerkarten.html'; } },
        { group: 'Projekte', icon: '🥋', label: 'Judo-Website ansehen', hint: '↗', run: open('https://leonthn.github.io/gw-dd-judo/') },
        { group: 'Projekte', icon: '🐙', label: 'GitHub-Profil', hint: '↗', run: open('https://github.com/leonthn') },
        { group: 'Aktionen', icon: '🌓', label: 'Hell/Dunkel umschalten', hint: 'T', run: () => $('#theme-toggle').click() },
        { group: 'Aktionen', icon: '🔗', label: 'Link zur Seite kopieren', hint: '', run: () => {
            navigator.clipboard?.writeText('https://leonthn.github.io/').then(() => toast('Link kopiert ✓'), () => toast('Kopieren nicht möglich'));
        } },
        { group: 'Aktionen', icon: '🎉', label: 'Konfetti!', hint: '', run: () => burst(160) }
    ];
    let filtered = actions;
    let sel = 0;

    function render() {
        const q = input.value.trim().toLowerCase();
        filtered = actions.filter(a => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q));
        if (sel >= filtered.length) sel = Math.max(0, filtered.length - 1);
        list.innerHTML = '';
        if (!filtered.length) {
            list.innerHTML = '<li class="p-empty">Nichts gefunden – versuch „Projekte“</li>';
            return;
        }
        let group = '';
        filtered.forEach((a, i) => {
            if (a.group !== group) {
                group = a.group;
                const g = document.createElement('li');
                g.className = 'p-group';
                g.textContent = group;
                list.appendChild(g);
            }
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            li.className = i === sel ? 'sel' : '';
            li.innerHTML = `<span class="p-ico">${a.icon}</span><span></span><span class="p-hint">${a.hint}</span>`;
            li.children[1].textContent = a.label;
            li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; render(); } });
            li.addEventListener('click', () => execute(i));
            list.appendChild(li);
        });
        const active = $('.sel', list);
        if (active) active.scrollIntoView({ block: 'nearest' });
    }
    function show() {
        palette.hidden = false;
        input.value = '';
        sel = 0;
        render();
        requestAnimationFrame(() => input.focus());
    }
    function hide() { palette.hidden = true; }
    function execute(i) {
        const a = filtered[i];
        if (!a) return;
        hide();
        a.run();
    }

    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            palette.hidden ? show() : hide();
            return;
        }
        if (palette.hidden) return;
        if (e.key === 'Escape') hide();
        else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % filtered.length; render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; render(); }
        else if (e.key === 'Enter') { e.preventDefault(); execute(sel); }
    });
    input.addEventListener('input', () => { sel = 0; render(); });
    $('[data-close]', palette).addEventListener('click', hide);
    const openBtn = $('#open-palette');
    if (openBtn) openBtn.addEventListener('click', show);
}

/* ---------- Case Study: Parallax-Bild & Inhaltsverzeichnis ---------- */
function initCaseStudy() {
    const img = $('.case-image img');
    if (img && !reducedMotion) {
        window.addEventListener('scroll', () => {
            const r = img.parentElement.getBoundingClientRect();
            const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
            img.style.transform = `translateY(${(-10 + p * 12).toFixed(2)}%)`;
        }, { passive: true });
    }
    const toc = $$('.case-toc a');
    if (!toc.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) toc.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    toc.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
}

/* ---------- Start ---------- */
initIntro();
initTheme();
initNav();
initCursor();
initNeural();
initRoles();
initClock();
initStatement();
initReveal();
initPointerEffects();
initTimeline();
initAbiProgress();
initForm();
initKonami();
initPalette();
initCaseStudy();

const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

console.log('%cHi! 👋', 'font-size:28px;font-weight:800;');
console.log('%cSchön, dass du dir den Code anschaust. Alles handgebaut, ohne Framework: github.com/leonthn/leonthn.github.io', 'font-size:13px;');
