/* ==========================================================
   Stack – ein kleines Spiel
   Blöcke gleiten abwechselnd entlang x und z. Was beim Absetzen
   übersteht, wird abgeschnitten und fällt herunter.
   ========================================================== */
(() => {
    const canvas = document.getElementById('game');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const root = document.documentElement;
    const stage = document.getElementById('stage');
    const scoreEl = document.getElementById('hud-score');
    const perfectEl = document.getElementById('hud-perfect');
    const overlay = document.getElementById('overlay');
    const ovTitle = document.getElementById('ov-title');
    const ovText = document.getElementById('ov-text');
    const ovBtn = document.getElementById('ov-btn');
    const ovLabel = document.getElementById('ov-btn-label');
    const bestEl = document.getElementById('best');
    const lastEl = document.getElementById('last');

    const TXT = {
        de: { start: 'Spiel starten', again: 'Nochmal', hint: 'Klicken, tippen oder Leertaste drücken', over: 'Vorbei<em>.</em>', record: 'Neuer <em>Rekord!</em>', perfect: 'Perfekt', result: (s, b) => `Höhe ${s} · Rekord ${b}` },
        en: { start: 'Start game', again: 'Play again', hint: 'Click, tap or press space', over: 'Game <em>over.</em>', record: 'New <em>record!</em>', perfect: 'Perfect', result: (s, b) => `Height ${s} · Best ${b}` }
    };
    const txt = () => (root.dataset.lang === 'en' ? TXT.en : TXT.de);

    const SIZE = 10;        // Kantenlänge des Startblocks
    const BH = 1.6;         // Höhe eines Blocks
    const RANGE = 14;       // wie weit ein Block ausschwingt
    const PERFECT = 0.35;   // Toleranz für einen perfekten Treffer

    let W = 0, H = 0, S = 1;
    let blocks, current, debris, axis, dir, speed;
    let state = 'ready', score = 0, combo = 0, camY = 0, camTarget = 0;
    let flash = 0, lastTime = 0, overAt = 0, running = false, visible = false;
    let best = 0;
    try { best = Number(localStorage.getItem('stack-best')) || 0; } catch (e) { best = 0; }
    bestEl.textContent = best;

    let theme = {};
    function readTheme() {
        const cs = getComputedStyle(root);
        theme.light = root.dataset.theme === 'light';
        theme.accent = cs.getPropertyValue('--accent').trim();
        theme.text = cs.getPropertyValue('--text').trim();
    }

    function resize() {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        S = Math.min(W / 38, H / 32);
    }

    /* ---------- Spielablauf ---------- */
    function reset() {
        blocks = [{ x: -SIZE / 2, z: -SIZE / 2, w: SIZE, d: SIZE, y: -BH * 6, h: BH * 6, lvl: 0 }];
        debris = [];
        score = 0;
        combo = 0;
        camTarget = 0;
        speed = 0.12;
        spawn();
    }

    function spawn() {
        const top = blocks[blocks.length - 1];
        axis = blocks.length % 2 ? 'x' : 'z';
        current = { x: top.x, z: top.z, w: top.w, d: top.d, y: top.y + top.h, h: BH, lvl: blocks.length };
        current[axis] = top[axis] - RANGE;
        dir = 1;
    }

    function place() {
        const top = blocks[blocks.length - 1];
        const size = axis === 'x' ? 'w' : 'd';
        const delta = current[axis] - top[axis];
        const overlap = current[size] - Math.abs(delta);

        if (overlap <= 0) {
            debris.push({ ...current, vy: 0, back: delta < 0 });
            current = null;
            return gameOver();
        }

        if (Math.abs(delta) < PERFECT) {
            current[axis] = top[axis];
            combo++;
            flash = 1;
            showPerfect();
            // Drei perfekte Treffer am Stück: Block wächst wieder
            if (combo % 3 === 0 && current[size] < SIZE) {
                const grow = Math.min(1, SIZE - current[size]);
                current[size] += grow;
                current[axis] -= grow / 2;
            }
        } else {
            combo = 0;
            const piece = { ...current, vy: 0, back: delta < 0 };
            if (delta > 0) {
                piece[axis] = current[axis] + overlap;
                piece[size] = delta;
            } else {
                piece[axis] = current[axis];
                piece[size] = -delta;
                current[axis] = top[axis];
            }
            current[size] = overlap;
            debris.push(piece);
        }

        blocks.push(current);
        score++;
        scoreEl.textContent = score;
        scoreEl.classList.remove('bump');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('bump');
        camTarget = score * BH;
        speed = Math.min(0.12 + score * 0.004, 0.34);
        spawn();
    }

    function start() {
        reset();
        state = 'play';
        scoreEl.textContent = '0';
        overlay.classList.add('hide');
        wake();
    }

    function gameOver() {
        state = 'over';
        overAt = performance.now();
        const record = score > best;
        if (record) {
            best = score;
            try { localStorage.setItem('stack-best', best); } catch (e) { /* egal */ }
            bestEl.textContent = best;
            if (score >= 5 && window.burst) window.burst();
        }
        lastEl.textContent = score;
        const t = txt();
        ovTitle.innerHTML = record && score > 0 ? t.record : t.over;
        ovText.textContent = t.result(score, best);
        ovLabel.textContent = t.again;
        setTimeout(() => overlay.classList.remove('hide'), 500);
    }

    let perfectTimer;
    function showPerfect() {
        perfectEl.textContent = combo > 1 ? `${txt().perfect} ×${combo}` : txt().perfect;
        perfectEl.classList.add('show');
        clearTimeout(perfectTimer);
        perfectTimer = setTimeout(() => perfectEl.classList.remove('show'), 900);
    }

    function input() {
        if (state === 'play') place();
        else if (state === 'ready') start();
        else if (state === 'over' && performance.now() - overAt > 600) start();
    }

    /* ---------- Zeichnen (isometrisch) ---------- */
    function iso(x, y, z) {
        return [W / 2 + (x - z) * S * 0.866, H * 0.62 + (x + z) * S * 0.5 - (y - camY) * S];
    }

    function shade(lvl) {
        // ruhiger Verlauf zwischen hellen und dunklen Grautönen, leicht warm
        const k = (Math.sin(lvl * 0.32) + 1) / 2;
        const base = theme.light ? 34 + k * 46 : 22 + k * 58;
        return base;
    }

    function poly(points, fill) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
    }

    function box(b, alpha = 1, outline = 0) {
        const x0 = b.x, x1 = b.x + b.w, z0 = b.z, z1 = b.z + b.d, y0 = b.y, y1 = b.y + b.h;
        const L = shade(b.lvl);
        ctx.globalAlpha = alpha;
        const top = [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)];
        poly([iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y0, z1), iso(x0, y0, z1)], `hsl(38 8% ${L}%)`);
        poly([iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1), iso(x1, y0, z0)], `hsl(38 8% ${L - 11}%)`);
        poly(top, `hsl(38 10% ${Math.min(L + 9, 96)}%)`);
        if (outline > 0) {
            ctx.globalAlpha = outline;
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
            ctx.closePath();
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    function ring(b, k) {
        // sich ausbreitender Rahmen nach einem perfekten Treffer
        const grow = (1 - k) * 2.2;
        const y = b.y + b.h;
        const pts = [iso(b.x - grow, y, b.z - grow), iso(b.x + b.w + grow, y, b.z - grow), iso(b.x + b.w + grow, y, b.z + b.d + grow), iso(b.x - grow, y, b.z + b.d + grow)];
        ctx.globalAlpha = k * 0.9;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        debris.forEach(d => { if (d.back) box(d, d.alpha ?? 1); });
        const from = Math.max(0, blocks.length - 40);
        for (let i = from; i < blocks.length; i++) {
            const isTop = i === blocks.length - 1 && i > 0;
            box(blocks[i], 1, isTop ? flash : 0);
        }
        if (flash > 0 && blocks.length > 1) ring(blocks[blocks.length - 1], flash);
        if (current) box(current);
        debris.forEach(d => { if (!d.back) box(d, d.alpha ?? 1); });
    }

    function update(dt) {
        if (current && state !== 'over') {
            const top = blocks[blocks.length - 1];
            current[axis] += speed * dir * dt * (state === 'ready' ? 0.6 : 1);
            if (current[axis] > top[axis] + RANGE) { current[axis] = top[axis] + RANGE; dir = -1; }
            if (current[axis] < top[axis] - RANGE) { current[axis] = top[axis] - RANGE; dir = 1; }
        }
        debris.forEach(d => {
            d.vy += 0.03 * dt;
            d.y -= d.vy * dt;
            d.alpha = Math.max(0, Math.min(1, 1 - (camY - d.y - 6) / 14));
        });
        debris = debris.filter(d => d.alpha > 0.01);
        camY += (camTarget - camY) * Math.min(1, 0.08 * dt);
        if (flash > 0) flash = Math.max(0, flash - 0.03 * dt);
    }

    function loop(time) {
        if (!visible || document.hidden) { running = false; return; }
        const dt = lastTime ? Math.min(3, (time - lastTime) / 16.667) : 1;
        lastTime = time;
        update(dt);
        render();
        requestAnimationFrame(loop);
    }

    function wake() {
        if (running || !visible || document.hidden) return;
        running = true;
        lastTime = 0;
        requestAnimationFrame(loop);
    }

    /* ---------- Eingabe ---------- */
    stage.addEventListener('pointerdown', e => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        input();
    });
    ovBtn.addEventListener('click', e => { e.stopPropagation(); input(); });
    document.addEventListener('keydown', e => {
        if (e.code !== 'Space' && e.key !== 'Enter') return;
        const palette = document.getElementById('palette');
        if (palette && !palette.hidden) return;
        if (/input|textarea|button/i.test(document.activeElement.tagName) && e.key === 'Enter') return;
        if (!visible) return;
        e.preventDefault();
        input();
    });

    function setTexts() {
        const t = txt();
        if (state === 'over') {
            ovText.textContent = t.result(score, best);
            ovLabel.textContent = t.again;
        } else {
            ovText.textContent = t.hint;
            ovLabel.textContent = t.start;
        }
    }

    readTheme();
    resize();
    reset();
    setTexts();
    new ResizeObserver(resize).observe(canvas);
    document.addEventListener('themechange', readTheme);
    document.addEventListener('langchange', setTexts);
    document.addEventListener('visibilitychange', wake);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(stage);
})();
