/* ==========================================================
   leonthn.github.io – Interaktionen
   Jede Funktion prüft selbst, ob ihre Elemente da sind,
   deshalb läuft die Datei auf allen Seiten.
   ========================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const T = window.I18N || { en: {}, roller: { de: [], en: [] }, meta: { de: {}, en: {} } };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const store = {
    get(k, s = localStorage) { try { return s.getItem(k); } catch (e) { return null; } },
    set(k, v, s = localStorage) { try { s.setItem(k, v); } catch (e) { /* privater Modus */ } }
};

let lang = root.dataset.lang === 'en' ? 'en' : 'de';
let lenis = null;
const frameHooks = [];
const scroll = { y: window.scrollY, v: 0, vh: window.innerHeight };

// Positionen werden nur bei Größenänderungen gemessen, nie im laufenden Frame
const measurers = [];
let measureQueued = false;
const docTop = el => el.getBoundingClientRect().top + window.scrollY;
function remeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
        measureQueued = false;
        scroll.vh = window.innerHeight;
        measurers.forEach(fn => fn());
    });
}

/* ---------- Text in Wörter / Buchstaben zerlegen ---------- */
function wrapWords(el, make) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let i = 0;
    nodes.forEach(node => {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(part) : make(part, i++));
        });
        node.replaceWith(frag);
    });
}

function splitWords(el) {
    wrapWords(el, (word, i) => {
        const w = document.createElement('span');
        w.className = 'w';
        const wi = document.createElement('span');
        wi.className = 'wi';
        wi.style.setProperty('--i', i);
        wi.textContent = word;
        w.appendChild(wi);
        return w;
    });
}

function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
        const outer = document.createElement('span');
        outer.className = ch === ' ' ? 'ch space' : 'ch';
        const inner = document.createElement('span');
        inner.textContent = ch === ' ' ? ' ' : ch;
        outer.style.setProperty('--i', i);
        inner.style.setProperty('--i', i);
        outer.appendChild(inner);
        el.appendChild(outer);
    });
}

/* ---------- Zählwerk (Odometer) ---------- */
function formatNumber(el) {
    const v = Number(el.dataset.odo);
    return 'plain' in el.dataset ? String(v) : v.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
}

function buildOdo(el) {
    const str = formatNumber(el);
    el.innerHTML = '';
    let d = 0;
    [...str].forEach(ch => {
        if (/\d/.test(ch)) {
            const col = document.createElement('span');
            col.className = 'odo-col';
            const strip = document.createElement('span');
            strip.className = 'odo-strip';
            strip.style.setProperty('--i', d++);
            for (let n = 0; n <= 9; n++) {
                const b = document.createElement('b');
                b.textContent = n;
                strip.appendChild(b);
            }
            col.appendChild(strip);
            el.appendChild(col);
        } else {
            const sep = document.createElement('span');
            sep.className = 'odo-sep';
            sep.textContent = ch;
            el.appendChild(sep);
        }
    });
    el.setAttribute('aria-label', str);
    if (el.classList.contains('rolled') || 'instant' in el.dataset) rollOdo(el, true);
}

function rollOdo(el, instant) {
    el.classList.add('rolled');
    const digits = formatNumber(el).replace(/\D/g, '');
    $$('.odo-strip', el).forEach((s, i) => {
        if (instant) s.style.transition = 'none';
        s.style.transform = `translateY(${-Number(digits[i] || 0)}em)`;
        if (instant) requestAnimationFrame(() => { s.style.transition = ''; });
    });
}

function setOdo(el, value) {
    if (el.dataset.odo === String(value)) return;
    const oldLen = formatNumber(el).length;
    el.dataset.odo = value;
    if (formatNumber(el).length !== oldLen) buildOdo(el);
    el.setAttribute('aria-label', formatNumber(el));
    rollOdo(el);
}

/* ---------- Sprache ---------- */
function t(key) { return (T.meta[lang] || {})[key] || ''; }

function initI18n() {
    $$('[data-i18n]').forEach(el => { el.dataset.de = el.innerHTML; });
    const btn = $('#lang-btn');
    if (btn) btn.addEventListener('click', () => switchLang(lang === 'de' ? 'en' : 'de'));
}

function applyLang(next) {
    lang = next;
    root.dataset.lang = next;
    root.lang = next;
    $$('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const html = next === 'de' ? el.dataset.de : (T.en[key] ?? el.dataset.de);
        el.innerHTML = html;
        if (el.hasAttribute('data-split')) splitWords(el);
    });
    const btn = $('#lang-btn');
    if (btn) btn.innerHTML = next === 'de' ? '<b>DE</b><span>/</span><span>EN</span>' : '<span>DE</span><span>/</span><b>EN</b>';
    if (document.body.dataset.page === 'home') document.title = t('title');
    $$('[data-planned]').forEach(el => { el.dataset.planned = t('planned'); });
    $$('.odo').forEach(el => { if (!('plain' in el.dataset)) buildOdo(el); });
    const input = $('#palette-input');
    if (input) input.placeholder = t('search');
    document.dispatchEvent(new Event('langchange'));
}

function switchLang(next) {
    store.set('lang', next);
    if (reduced) return applyLang(next);
    document.body.classList.add('lang-switching');
    setTimeout(() => {
        applyLang(next);
        requestAnimationFrame(() => document.body.classList.remove('lang-switching'));
    }, 260);
}

/* ---------- Smooth Scrolling ---------- */
function initScroll() {
    if (window.Lenis && !reduced) {
        lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
        lenis.on('scroll', e => { scroll.v = e.velocity; });
    }
    let lastY = window.scrollY;
    function frame(time) {
        if (lenis) lenis.raf(time);
        scroll.y = window.scrollY;
        if (!lenis) scroll.v = scroll.y - lastY;
        lastY = scroll.y;
        for (const fn of frameHooks) fn(time);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    addEventListener('resize', remeasure);
    addEventListener('load', remeasure);
    document.addEventListener('langchange', remeasure);
    if (window.ResizeObserver) new ResizeObserver(remeasure).observe(document.body);
    if (document.fonts) document.fonts.ready.then(remeasure);

    document.addEventListener('click', e => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        const target = id === '#top' || id === '#' ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        closeMenu();
        scrollToTarget(target);
        if (id !== '#top') history.replaceState(null, '', id);
    });
}

function scrollToTarget(target, immediate) {
    if (lenis) return lenis.scrollTo(target, { duration: 1.6, immediate: !!immediate, offset: 0 });
    if (target === 0) return window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
    target.scrollIntoView({ behavior: immediate || reduced ? 'auto' : 'smooth' });
}

/* ---------- Loader & Seitenwechsel ---------- */
function initLoader(done) {
    const loader = $('#loader');
    if (!loader || root.classList.contains('no-loader') || reduced) {
        if (loader) loader.remove();
        done();
        return;
    }
    const name = $('#loader-name');
    splitChars(name);
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    const count = $('#loader-count');
    const line = $('#loader-line');
    const t0 = performance.now();
    const duration = 1700;
    (function tick(now) {
        const p = clamp((now - t0) / duration);
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        const v = Math.round(e * 100);
        count.textContent = v;
        line.style.width = v + '%';
        if (p < 1) return requestAnimationFrame(tick);
        setTimeout(() => {
            loader.classList.add('done');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
            store.set('seen', '1', sessionStorage);
            setTimeout(done, 350);
            setTimeout(() => loader.remove(), 1400);
        }, 200);
    })(t0);
}

function initCurtain() {
    const curtain = $('#curtain');
    if (!curtain) return;
    if (root.classList.contains('curtain-in')) {
        store.set('curtain', '', sessionStorage);
        requestAnimationFrame(() => {
            curtain.classList.add('leave');
            root.classList.remove('curtain-in');
            setTimeout(() => {
                curtain.classList.add('instant');
                curtain.classList.remove('leave');
                requestAnimationFrame(() => curtain.classList.remove('instant'));
            }, 900);
        });
    }
    document.addEventListener('click', e => {
        const a = e.target.closest('a[data-transition], a[href$=".html"], a[href*=".html#"], a[href="/"]');
        if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;
        e.preventDefault();
        if (reduced) { location.href = url.href; return; }
        store.set('curtain', '1', sessionStorage);
        curtain.classList.add('cover');
        setTimeout(() => { location.href = url.href; }, 800);
    });
    window.addEventListener('pageshow', e => {
        if (e.persisted) curtain.classList.remove('cover');
    });
}

/* ---------- Cursor ---------- */
function initCursor() {
    const cursor = $('#cursor');
    if (!cursor || !finePointer || reduced) return;
    const label = $('#cursor-label');
    let mx = -100, my = -100, x = -100, y = -100;
    addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        root.classList.add('has-cursor');
    }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
    addEventListener('mousedown', () => cursor.classList.add('down'));
    addEventListener('mouseup', () => cursor.classList.remove('down'));
    frameHooks.push(() => {
        if (Math.abs(mx - x) < 0.1 && Math.abs(my - y) < 0.1) return;
        x = lerp(x, mx, 0.22);
        y = lerp(y, my, 0.22);
        cursor.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    document.addEventListener('mouseover', e => {
        const labelled = e.target.closest('[data-cursor]');
        const hover = e.target.closest('a, button, input, textarea, [data-cursor-hover], #globe');
        cursor.classList.toggle('label', !!labelled);
        cursor.classList.toggle('hover', !labelled && !!hover);
        if (labelled) label.textContent = labelled.dataset.cursor;
    });
}

/* ---------- Navigation & Menü ---------- */
function closeMenu() {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    const btn = $('#menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
}

function initNav() {
    const nav = $('#nav');
    if (!nav) return;
    let last = 0;
    frameHooks.push(() => {
        const y = scroll.y;
        if (y === last) return;
        nav.classList.toggle('scrolled', y > 40);
        const down = y > last;
        if (!root.classList.contains('menu-open')) nav.classList.toggle('hide', down && y > 300);
        last = y;
    });

    const btn = $('#menu-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            const open = !root.classList.contains('menu-open');
            root.classList.toggle('menu-open', open);
            btn.setAttribute('aria-expanded', String(open));
            if (lenis) open ? lenis.stop() : lenis.start();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    }

    const links = $$('.nav-links a[href^="#"]');
    const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
    if (!sections.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => io.observe(s));
    frameHooks.push(() => {
        if (scroll.y < innerHeight * 0.6) links.forEach(a => a.classList.remove('active'));
    });
}

/* ---------- Theme ---------- */
function initTheme() {
    const btn = $('#theme-btn');
    if (!btn) return;
    btn.addEventListener('click', () => toggleTheme(btn));
}

function toggleTheme(origin) {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => {
        root.dataset.theme = next;
        store.set('theme', next);
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.content = next === 'light' ? '#f4f3ef' : '#0a0a0a';
        document.dispatchEvent(new Event('themechange'));
    };
    if (!document.startViewTransition || reduced) return apply();
    const r = (origin || $('#theme-btn')).getBoundingClientRect();
    root.style.setProperty('--vt-x', r.left + r.width / 2 + 'px');
    root.style.setProperty('--vt-y', r.top + r.height / 2 + 'px');
    document.startViewTransition(apply);
}

/* ---------- Globus ---------- */
function initGlobe() {
    const canvas = $('#globe');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const N = 1100;
    const BUCKETS = 8;
    const buckets = Array.from({ length: BUCKETS }, () => []);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const pts = [];
    for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    const lat = 51.05 * Math.PI / 180, lon = 13.74 * Math.PI / 180;
    const home = [Math.cos(lat) * Math.sin(lon), -Math.sin(lat), Math.cos(lat) * Math.cos(lon)];

    let w = 0, h = 0, dpr = 1, colors = {};
    let rotY = -lon + 1.1, tilt = -0.32, targetTilt = -0.32, spin = 0.0016, dragV = 0;
    let dragging = false, lastX = 0, visible = true, appear = 0;
    const start = performance.now();

    function readColors() {
        const cs = getComputedStyle(root);
        colors.text = cs.getPropertyValue('--text').trim();
        colors.accent = cs.getPropertyValue('--accent').trim();
    }
    function resize() {
        dpr = Math.min(devicePixelRatio || 1, 1.5);
        w = canvas.clientWidth; h = canvas.clientHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function project(p) {
        const cy = Math.cos(rotY), sy = Math.sin(rotY), ct = Math.cos(tilt), st = Math.sin(tilt);
        const x1 = p[0] * cy + p[2] * sy;
        const z1 = -p[0] * sy + p[2] * cy;
        return [x1, p[1] * ct - z1 * st, p[1] * st + z1 * ct];
    }

    function draw(time) {
        ctx.clearRect(0, 0, w, h);
        appear = reduced ? 1 : clamp((time - start - (root.classList.contains('ready') ? 0 : 99999)) / 1800);
        const ease = 1 - Math.pow(1 - appear, 3);
        const R = Math.min(w, h) * 0.38 * (0.86 + 0.14 * ease);
        const cx = w / 2, cy = h / 2;

        // Punkte nach Tiefe in wenige Gruppen sortieren und je Gruppe einmal füllen
        for (const b of buckets) b.length = 0;
        const cY = Math.cos(rotY), sY = Math.sin(rotY), cT = Math.cos(tilt), sT = Math.sin(tilt);
        for (let i = 0; i < N; i++) {
            const p = pts[i];
            const x1 = p[0] * cY + p[2] * sY;
            const z1 = -p[0] * sY + p[2] * cY;
            const y = p[1] * cT - z1 * sT;
            const z = p[1] * sT + z1 * cT;
            const k = z <= 0 ? 0 : Math.min(BUCKETS - 1, 1 + Math.floor(z * (BUCKETS - 1)));
            buckets[k].push(cx + x1 * R, cy + y * R);
        }
        ctx.fillStyle = colors.text;
        for (let k = 0; k < BUCKETS; k++) {
            const list = buckets[k];
            if (!list.length) continue;
            const z = k === 0 ? 0 : k / (BUCKETS - 1);
            const s = k === 0 ? 0.6 : 0.8 + 1.4 * z;
            ctx.globalAlpha = (k === 0 ? 0.07 : 0.16 + 0.78 * z) * ease;
            ctx.beginPath();
            for (let j = 0; j < list.length; j += 2) ctx.rect(list[j] - s / 2, list[j + 1] - s / 2, s, s);
            ctx.fill();
        }

        // Umlaufbahn mit Satellit
        const rot = -0.38, A = R * 1.28, B = R * 0.3;
        ctx.globalAlpha = 0.16 * ease;
        ctx.strokeStyle = colors.text;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, A, B, rot, 0, Math.PI * 2);
        ctx.stroke();
        const ang = time * 0.00035;
        const sx = cx + A * Math.cos(ang) * Math.cos(rot) - B * Math.sin(ang) * Math.sin(rot);
        const sy = cy + A * Math.cos(ang) * Math.sin(rot) + B * Math.sin(ang) * Math.cos(rot);
        ctx.globalAlpha = (Math.sin(ang) > 0 ? 1 : 0.25) * ease;
        ctx.fillStyle = colors.accent;
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();

        // Dresden
        const [hx, hy, hz] = project(home);
        if (hz > 0) {
            const px = cx + hx * R, py = cy + hy * R;
            const pulse = (time % 2400) / 2400;
            ctx.globalAlpha = (1 - pulse) * hz * ease;
            ctx.strokeStyle = colors.accent;
            ctx.beginPath(); ctx.arc(px, py, 4 + pulse * 22, 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = hz * ease;
            ctx.fillStyle = colors.accent;
            ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = colors.text;
            ctx.globalAlpha = 0.5 * hz * ease;
            ctx.beginPath(); ctx.moveTo(px + 8, py - 8); ctx.lineTo(px + 40, py - 40); ctx.lineTo(px + 110, py - 40); ctx.stroke();
            ctx.globalAlpha = hz * ease;
            ctx.fillStyle = colors.text;
            ctx.font = '11px "Geist Mono", monospace';
            ctx.fillText('DRESDEN', px + 44, py - 47);
        }
        ctx.globalAlpha = 1;
    }

    function loop(time) {
        if (!visible) return;
        if (!dragging) {
            rotY += spin + dragV;
            dragV *= 0.95;
        }
        tilt = lerp(tilt, targetTilt, 0.05);
        draw(time);
        requestAnimationFrame(loop);
    }

    readColors();
    resize();
    new ResizeObserver(resize).observe(canvas);
    document.addEventListener('themechange', readColors);

    canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        rotY += dx * 0.006;
        dragV = dx * 0.0008;
    });
    const stop = () => { dragging = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    addEventListener('mousemove', e => {
        targetTilt = -0.32 + (e.clientY / innerHeight - 0.5) * 0.3;
    }, { passive: true });

    if (reduced) {
        root.classList.add('ready');
        draw(performance.now());
        document.addEventListener('themechange', () => draw(performance.now()));
        return;
    }
    new IntersectionObserver(([entry]) => {
        const was = visible;
        visible = entry.isIntersecting;
        if (visible && !was) requestAnimationFrame(loop);
    }).observe(canvas);
    requestAnimationFrame(loop);
}

/* ---------- Hero ---------- */
function initHero() {
    const name = $('#hero-name');
    if (name) splitChars(name);

    const roller = $('#roller');
    if (!roller) return;
    let i = 0, timer;
    function setWord(text, animate) {
        const old = roller.querySelector('span:not(.out)');
        const span = document.createElement('span');
        span.textContent = text;
        if (!animate || !old) {
            roller.innerHTML = '';
            roller.appendChild(span);
            return;
        }
        span.className = 'prep';
        old.style.position = 'absolute';
        old.style.top = '0';
        old.style.left = '0';
        roller.appendChild(span);
        void span.offsetWidth;
        old.classList.add('out');
        span.classList.remove('prep');
        setTimeout(() => old.remove(), 800);
    }
    function restart() {
        clearInterval(timer);
        i = 0;
        setWord(T.roller[lang][0], false);
        if (reduced) return;
        timer = setInterval(() => {
            if (document.hidden) return;
            i = (i + 1) % T.roller[lang].length;
            setWord(T.roller[lang][i], true);
        }, 3000);
    }
    restart();
    document.addEventListener('langchange', restart);
}

/* ---------- Uhrzeit ---------- */
function initClock() {
    const els = $$('.js-time');
    $$('.js-year').forEach(el => { el.textContent = new Date().getFullYear(); });
    if (!els.length) return;
    const fmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    function tick() {
        const s = fmt.format(new Date());
        els.forEach(el => { el.textContent = s; });
    }
    tick();
    setInterval(tick, 1000);
}

/* ---------- Einblenden beim Scrollen ---------- */
function initReveal() {
    $$('[data-split]:not([data-i18n])').forEach(splitWords);
    $$('.odo').forEach(buildOdo);
    const foot = $('#footer-name');
    if (foot) splitChars(foot);

    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('in');
            $$('.odo:not([data-instant])', el).forEach(o => rollOdo(o));
            io.unobserve(el);
        });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    $$('.reveal, [data-split], .footer-name, .pack').forEach(el => io.observe(el));
}

/* ---------- Statement Wort für Wort ---------- */
function initStatement() {
    const el = $('#statement');
    if (!el) return;
    let words = [];
    function prepare() {
        wrapWords(el, word => {
            const s = document.createElement('span');
            s.className = 'sw';
            s.textContent = word;
            return s;
        });
        words = $$('.sw', el);
        if (reduced) words.forEach(w => w.classList.add('on'));
    }
    prepare();
    document.addEventListener('langchange', prepare);
    if (reduced) return;
    let lastN = -1, top = 0, height = 0;
    measurers.push(() => { top = docTop(el); height = el.offsetHeight; });
    frameHooks.push(() => {
        const vh = scroll.vh;
        const rTop = top - scroll.y;
        if (rTop > vh || rTop + height < 0) return;
        const p = clamp((vh * 0.8 - rTop) / (height + vh * 0.25));
        const n = Math.round(p * words.length);
        if (n === lastN) return;
        lastN = n;
        words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
    document.addEventListener('langchange', () => { lastN = -1; });
}

/* ---------- Laufband reagiert auf Scrollgeschwindigkeit ---------- */
function initTicker() {
    const track = $('#ticker');
    if (!track) return;
    const original = Array.from(track.children);
    let half = 0, x = 0, skew = 0, dir = 1;
    function fill() {
        $$('[data-clone]', track).forEach(c => c.remove());
        const base = original.reduce((s, el) => s + el.offsetWidth, 0) || 1;
        const copies = Math.ceil((innerWidth * 2) / base);
        for (let c = 0; c < copies; c++) {
            original.forEach(el => {
                const clone = el.cloneNode(true);
                clone.dataset.clone = '';
                track.appendChild(clone);
            });
        }
        half = base;
    }
    fill();
    addEventListener('resize', fill);
    document.addEventListener('langchange', () => requestAnimationFrame(fill));
    if (reduced) return;
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(track.parentElement);
    frameHooks.push(() => {
        if (!visible) return;
        const v = scroll.v || 0;
        if (Math.abs(v) > 0.5) dir = v > 0 ? 1 : -1;
        x -= (0.6 + Math.min(Math.abs(v) * 0.5, 30)) * dir;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        skew = lerp(skew, clamp(v * -0.25, -8, 8), 0.1);
        track.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`;
    });
}

/* ---------- Leistungen (Akkordeon) ---------- */
function initServices() {
    $$('.service-head').forEach(head => {
        head.addEventListener('click', () => {
            const item = head.parentElement;
            const open = !item.classList.contains('open');
            $$('.service.open').forEach(s => {
                s.classList.remove('open');
                $('.service-head', s).setAttribute('aria-expanded', 'false');
            });
            item.classList.toggle('open', open);
            head.setAttribute('aria-expanded', String(open));
        });
    });
}

/* ---------- Projekte horizontal scrollen ---------- */
function initWork() {
    const section = $('#projekte');
    const track = $('#work-track');
    if (!section || !track) return;
    const bar = $('#work-bar');
    const index = $('#work-index');
    const sticky = $('.work-sticky', section);
    let dist = 0, enabled = false, last = -1;

    let secTop = 0;
    function measure() {
        enabled = innerWidth > 900;
        if (!enabled) {
            section.style.height = '';
            track.style.transform = '';
            return;
        }
        dist = Math.max(0, track.scrollWidth - innerWidth);
        const h = (dist + sticky.offsetHeight) + 'px';
        if (section.style.height !== h) section.style.height = h;
        secTop = docTop(section);
        last = -1;
    }
    measure();
    measurers.push(measure);

    const seen = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); seen.unobserve(e.target); } });
    }, { threshold: 0.45 });
    $$('.project', track).forEach(p => seen.observe(p));

    frameHooks.push(() => {
        if (!enabled) return;
        const p = dist ? clamp((scroll.y - secTop) / dist) : 0;
        if (p === last) return;
        last = p;
        track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
        if (bar) bar.style.transform = `scaleX(${p})`;
        if (index) index.textContent = String(Math.min(5, Math.floor(p * 5.99) + 1)).padStart(2, '0');
    });
}

/* ---------- Werdegang: Jahreszahl folgt dem Scrollen ---------- */
function initJourney() {
    const steps = $$('#steps .step');
    const odo = $('#year-odo');
    const label = $('#year-label');
    if (!steps.length || !odo) return;
    let current = null, tops = [];
    measurers.push(() => { tops = steps.map(docTop); });
    function update() {
        let active = steps[0];
        const line = scroll.y + scroll.vh * 0.55;
        for (let i = 0; i < steps.length; i++) {
            if (tops[i] < line) active = steps[i];
        }
        if (active === current) return;
        current = active;
        steps.forEach(s => s.classList.toggle('current', s === active));
        setOdo(odo, active.dataset.year);
        if (label) label.textContent = $('h3', active).textContent;
    }
    frameHooks.push(update);
    document.addEventListener('langchange', () => { current = null; });
}

/* ---------- Magnet-Buttons & Zertifikat-Tilt ---------- */
function initPointer() {
    if (!finePointer || reduced) return;
    $$('.magnetic').forEach(el => {
        el.addEventListener('mousemove', e => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - r.left - r.width / 2) * 0.25 + 'px');
            el.style.setProperty('--my', (e.clientY - r.top - r.height / 2) * 0.35 + 'px');
        });
        el.addEventListener('mouseleave', () => {
            el.style.setProperty('--mx', '0px');
            el.style.setProperty('--my', '0px');
        });
    });
    const card = $('#cert-card');
    if (card) {
        const area = card.parentElement;
        area.addEventListener('mousemove', e => {
            const r = area.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `rotateX(${(-py * 14).toFixed(2)}deg) rotateY(${(px * 18).toFixed(2)}deg)`;
            card.style.setProperty('--sheen', (100 - (px + 0.5) * 100) + '%');
        });
        area.addEventListener('mouseleave', () => { card.style.transform = ''; });
    }
}

/* ---------- Kontaktformular ---------- */
function initForm() {
    const form = $('#form');
    if (!form) return;
    const status = $('#form-status');
    form.addEventListener('submit', async e => {
        e.preventDefault();
        status.textContent = '';
        form.classList.add('sending');
        try {
            const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(res.status);
            form.reset();
            form.classList.add('sent');
        } catch (err) {
            status.textContent = t('error');
        } finally {
            form.classList.remove('sending');
        }
    });
}

/* ---------- Toast & Kartenregen ---------- */
let toastTimer;
function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function burst() {
    const canvas = $('#burst');
    if (!canvas || reduced) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(root);
    const ink = cs.getPropertyValue('--text').trim();
    const gold = cs.getPropertyValue('--accent').trim();
    const bg = cs.getPropertyValue('--surface').trim();
    const cards = Array.from({ length: 70 }, () => ({
        x: Math.random() * innerWidth,
        y: -40 - Math.random() * innerHeight,
        vy: 2 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 1.5,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.05,
        s: 0.6 + Math.random() * 0.8,
        gold: Math.random() < 0.15
    }));
    const t0 = performance.now();
    (function frame(now) {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        let alive = 0;
        for (const c of cards) {
            c.y += c.vy; c.x += c.vx; c.r += c.vr;
            if (c.y < innerHeight + 60) alive++;
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.r);
            ctx.scale(c.s, c.s);
            ctx.fillStyle = bg;
            ctx.strokeStyle = c.gold ? gold : ink;
            ctx.lineWidth = 1;
            ctx.fillRect(-15, -21, 30, 42);
            ctx.strokeRect(-15, -21, 30, 42);
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI * 2); ctx.fillStyle = c.gold ? gold : ink; ctx.fill();
            ctx.fillRect(-9, 10, 18, 3);
            ctx.restore();
        }
        if (alive && now - t0 < 9000) requestAnimationFrame(frame);
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
            burst();
            toast(t('thanks'));
        }
    });
}

/* ---------- Command Palette ---------- */
function initPalette() {
    const palette = $('#palette');
    if (!palette) return;
    const input = $('#palette-input');
    const list = $('#palette-list');
    const kbd = $('#kbd-label');
    if (kbd && !isMac) kbd.textContent = 'Ctrl K';

    const L = (de, en) => () => (lang === 'de' ? de : en);
    const go = sel => () => { const el = $(sel); if (el) scrollToTarget(el); };
    const open = url => () => window.open(url, '_blank', 'noopener');
    const actions = [
        { g: L('Seiten', 'Pages'), label: L('Leistungen', 'Services'), hint: '01', run: go('#leistungen') },
        { g: L('Seiten', 'Pages'), label: L('Projekte', 'Work'), hint: '02', run: go('#projekte') },
        { g: L('Seiten', 'Pages'), label: L('Über mich', 'About'), hint: '03', run: go('#ueber-mich') },
        { g: L('Seiten', 'Pages'), label: L('Werdegang', 'Journey'), hint: '04', run: go('#werdegang') },
        { g: L('Seiten', 'Pages'), label: L('Zertifikate', 'Certificates'), hint: '05', run: go('#zertifikate') },
        { g: L('Seiten', 'Pages'), label: L('Kontakt', 'Contact'), hint: '06', run: go('#kontakt') },
        { g: L('Projekte', 'Work'), label: L('Case Study: Lehrerkarten', 'Case study: teacher cards'), hint: '→', run: () => { location.href = 'projekt-lehrerkarten.html'; } },
        { g: L('Projekte', 'Work'), label: L('Judo-Website ansehen', 'Visit judo website'), hint: '↗', run: open('https://leonthn.github.io/gw-dd-judo/') },
        { g: L('Projekte', 'Work'), label: 'GitHub', hint: '↗', run: open('https://github.com/leonthn') },
        { g: L('Einstellungen', 'Settings'), label: L('Hell / Dunkel', 'Light / dark'), hint: 'T', run: () => toggleTheme() },
        { g: L('Einstellungen', 'Settings'), label: L('Switch to English', 'Auf Deutsch wechseln'), hint: 'L', run: () => switchLang(lang === 'de' ? 'en' : 'de') },
        { g: L('Einstellungen', 'Settings'), label: L('Link kopieren', 'Copy link'), hint: '', run: () => {
            if (navigator.clipboard) navigator.clipboard.writeText('https://leonthn.github.io/').then(() => toast(t('copied')));
        } }
    ];
    const val = v => (typeof v === 'function' ? v() : v);
    let filtered = actions, sel = 0;

    function render() {
        const q = input.value.trim().toLowerCase();
        filtered = actions.filter(a => (val(a.label) + ' ' + val(a.g)).toLowerCase().includes(q));
        sel = Math.min(sel, Math.max(0, filtered.length - 1));
        list.innerHTML = '';
        if (!filtered.length) {
            const li = document.createElement('li');
            li.className = 'empty';
            li.textContent = '—';
            list.appendChild(li);
            return;
        }
        let group = '';
        filtered.forEach((a, i) => {
            if (val(a.g) !== group) {
                group = val(a.g);
                const g = document.createElement('li');
                g.className = 'grp';
                g.textContent = group;
                list.appendChild(g);
            }
            const li = document.createElement('li');
            li.setAttribute('role', 'option');
            if (i === sel) li.className = 'sel';
            const name = document.createElement('span');
            name.textContent = val(a.label);
            const hint = document.createElement('span');
            hint.className = 'mono';
            hint.textContent = a.hint;
            li.append(name, hint);
            li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; render(); } });
            li.addEventListener('click', () => run(i));
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
        if (lenis) lenis.stop();
        requestAnimationFrame(() => input.focus());
    }
    function hide() {
        palette.hidden = true;
        if (lenis && !root.classList.contains('menu-open')) lenis.start();
    }
    function run(i) {
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
        else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    input.addEventListener('input', () => { sel = 0; render(); });
    $('[data-close]', palette).addEventListener('click', hide);
    const btn = $('#palette-open');
    if (btn) btn.addEventListener('click', show);
}

/* ---------- Case Study: Inhaltsverzeichnis ---------- */
function initToc() {
    const links = $$('.toc a');
    if (!links.length) return;
    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
}

/* ---------- Start ---------- */
initI18n();
initScroll();
initHero();
applyLang(lang);
initReveal();
initStatement();
initTicker();
initServices();
initWork();
initJourney();
initNav();
initTheme();
initCursor();
initCurtain();
initGlobe();
initClock();
initPointer();
initForm();
initKonami();
initPalette();
initToc();

initLoader(() => {
    root.classList.add('ready');
    if (location.hash && location.hash.length > 1) {
        const target = $(location.hash);
        if (target) setTimeout(() => scrollToTarget(target, true), 50);
    }
});
