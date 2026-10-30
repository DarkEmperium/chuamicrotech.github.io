/* =====================================================================
   Loader: a honeycomb covers the screen; its cells lift off as small
   hexagons and slide in from every corner to build the three parts of the
   brand mark, cell by cell (the finished mark is still clearly made of
   hexagons). The empty honeycomb fades away, the parts lock together
   while a counter runs to 100. Each cell that lands swells and merges with
   its neighbours, filling the logo in, until it is the complete, solid
   logo. At the exit the whole picture, field and logo together, is cut into
   hexagon tiles that shrink away in a wave from the centre, so the logo
   breaks up with the background, and the page eases to its own size
   behind it.
   The solid logo is cut from the real logo image (assets/images/logo-mark.png),
   one piece per part of assets/js/mark.js, so its shape is exactly the logo's.
   ===================================================================== */
(function () {
    const preloader = document.getElementById("preloader");
    if (!preloader) return;

    const root = document.documentElement;
    const done = () => {
        if (root.classList.contains("is-loaded")) return;
        root.classList.add("is-loaded");
        window.dispatchEvent(new Event("preloader:done"));
    };
    const remove = () => {
        preloader.style.display = "none";
        document.body.style.overflow = "";
    };

    const canvas = preloader.querySelector(".ld-canvas");
    const mark = window.CMT_MARK;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canvas || !mark || reduceMotion) {
        window.addEventListener("load", () => { done(); remove(); });
        return;
    }

    // Later pages in the same visit get a shorter run
    const isReturn = root.classList.contains("is-return");
    try { sessionStorage.setItem("cmt-loaded", "1"); } catch (e) {}
    const BUILD = isReturn ? 1300 : 2600; // ms for the cells to arrive and the counter to fill
    const HOLD = 650; // ms the complete logo is shown before the exit
    const EXIT = 2200; // ms for the exit: the logo breaks up with the background in a hexagon wave
    const PAGE_AT = 0.08; // share of the exit after which the page starts its entrance behind the tiles

    document.body.style.overflow = "hidden";

    const ctx = canvas.getContext("2d");
    const numEl = preloader.querySelector(".ld-num");
    const msgEl = preloader.querySelector(".ld-msg");
    const lineEl = preloader.querySelector(".ld-line i");
    const MESSAGES = ["Powering up the bench", "Running diagnostics", "Aligning components", "Bench ready"];

    const NAVY = "#011937";
    const GRID = "#8db6ff";
    const COLORS = ["#eaf0fa", "#eaf0fa", "#4d8dff"]; // the M arrives in signal blue
    // the three parts arrive a little apart, lock together, and split along the same lines at the end
    const SPLIT = [[-0.2, -0.05], [0.2, -0.08], [0, 0.22]];

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = preloader.clientWidth || window.innerWidth;
    const height = preloader.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    const size = Math.min(width * 0.62, height * 0.44, 360);
    const scale = size / mark.size;
    const left = width / 2 - size / 2;
    const top = height / 2 - size / 2 - height * 0.06;
    const cx = width / 2, cy = top + size / 2;
    // cells sit on a honeycomb grid; drawn a little smaller than a full tile so every hexagon stays visible
    const pitch = Math.max(7, size / 30);
    const step = pitch / scale;
    const CELL_R = pitch * 0.43;

    /* ---- cells of the mark ---- */
    const parts = mark.parts.map((d) => new Path2D(d));
    const dots = [];
    let row = 0;
    for (let y = step * 0.5; y < mark.size; y += step * 0.866, row++) {
        for (let x = step * 0.5 + (row % 2 ? step / 2 : 0); x < mark.size; x += step) {
            const part = parts.findIndex((path) => ctx.isPointInPath(path, x, y));
            if (part < 0) continue;
            dots.push({ tx: left + x * scale, ty: top + y * scale, part });
        }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* ---- the solid logo, one canvas per part, cut from the logo image and recoloured ---- */
    // Drawing an image and compositing are fine on a page opened from disk; only reading
    // pixels back is refused, and nothing here does that.
    const pieces = [];
    const logo = new Image();
    logo.onload = () => {
        const px = Math.round(size * dpr);
        mark.parts.forEach((d, part) => {
            const c = document.createElement("canvas");
            c.width = c.height = px;
            const g = c.getContext("2d");
            g.setTransform(px / mark.size, 0, 0, px / mark.size, 0, 0);
            // the part's own area, grown a little so the image's soft edge is kept whole
            const path = new Path2D(d);
            g.fillStyle = "#000";
            g.strokeStyle = "#000";
            g.lineWidth = 10;
            g.lineJoin = "round";
            g.fill(path);
            g.stroke(path);
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalCompositeOperation = "source-in";
            g.drawImage(logo, 0, 0, px, px);
            g.fillStyle = COLORS[part];
            g.fillRect(0, 0, px, px);
            pieces[part] = c;
        });
    };
    logo.src = "assets/images/logo-mark.png";

    /* ---- the honeycomb the cells start from ---- */
    const cell = Math.max(16, Math.sqrt((width * height) / (dots.length * 1.25)));
    const cells = [];
    row = 0;
    for (let y = cell * 0.5; y < height; y += cell * 0.866, row++) {
        for (let x = (row % 2 ? cell : cell * 0.5); x < width; x += cell) cells.push({ x, y, used: false });
    }

    // Pair cells by direction from the centre, so every one slides straight inward
    const angle = (x, y) => Math.atan2(y - cy, x - cx);
    const byAngle = (a, b) => a.a - b.a;
    dots.forEach((dot) => (dot.a = angle(dot.tx, dot.ty)));
    cells.forEach((c) => (c.a = angle(c.x, c.y)));
    dots.sort(byAngle);
    cells.sort(byAngle);
    const reach = Math.hypot(width, height) / 2;
    dots.forEach((dot, i) => {
        const home = cells[Math.floor((i * cells.length) / dots.length)];
        home.used = true;
        dot.sx = home.x;
        dot.sy = home.y;
        // far cells set off first, so the whole field arrives together
        const far = Math.min(1, Math.hypot(home.x - cx, home.y - cy) / reach);
        dot.delay = 0.04 + (1 - far) * 0.24 + Math.random() * 0.06;
        dot.curl = (Math.random() < 0.5 ? -1 : 1) * (0.06 + Math.random() * 0.08);
    });
    const spare = cells.filter((c) => !c.used);

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t) => t * t * t;
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const clamp01 = (t) => Math.min(1, Math.max(0, t));

    // a pointy-topped hexagon of radius r, the same orientation as the mark itself
    const HEX = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(-Math.PI / 2 + (k * Math.PI) / 3), Math.sin(-Math.PI / 2 + (k * Math.PI) / 3)]);
    const hex = (x, y, r) => {
        ctx.moveTo(x + HEX[0][0] * r, y + HEX[0][1] * r);
        for (let k = 1; k < 6; k++) ctx.lineTo(x + HEX[k][0] * r, y + HEX[k][1] * r);
        ctx.closePath();
    };

    // The navy field at the end is a honeycomb of tiles (the same grid the cells started from),
    // each just big enough to overlap its neighbours. They shrink away from the centre outward.
    const TILE_R = cell * 0.7; // generous overlap: tiles only part once they have clearly started to shrink
    const tiles = [];
    const reachTiles = Math.hypot(width, height) / 2 + cell;
    // one ring beyond every edge, so the corners are covered too
    for (let y = -cell, r = 0; y < height + cell; y += cell * 0.866, r++) {
        for (let x = -cell + (r % 2 ? cell / 2 : 0); x < width + cell; x += cell) {
            // the wave lingers near the middle, where the logo is, then speeds up towards the edges
            tiles.push({ x, y, d: Math.pow(Math.min(1, Math.hypot(x - cx, y - cy) / reachTiles), 0.45) });
        }
    }

    const state = { build: 0, join: 0, solid: 0, exit: 0 };

    // A landed cell swells well past its tile, so neighbours merge with no seams; reaching past the
    // logo's edge is harmless, because each piece holds only its own part of the logo image.
    const FILL_R = pitch * 1.15;

    const draw = () => {
        ctx.clearRect(0, 0, width, height);

        const t = state.exit;
        const ready = pieces.length === 3;
        // The exit: the whole picture, navy field and solid logo together, is cut into a honeycomb
        // of tiles. A wave runs out from the centre; each tile shrinks away as it passes, taking
        // its piece of the logo with it, while the picture pushes in a little towards the viewer.
        const out = t > 0 ? clamp01((t - 0.04) / 0.96) : 0;
        if (out > 0) {
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < tiles.length; i++) {
                const c = tiles[i];
                const shrink = easeInOut(clamp01((out - c.d * 0.78) / 0.22)); // a narrow, crisp wave front
                if (shrink < 1) hex(c.x, c.y, TILE_R * (1 - shrink));
            }
            ctx.clip(); // overlapping tiles merge into one shape, so whole tiles show no seams
            ctx.fillStyle = NAVY;
            ctx.globalAlpha = 1;
            ctx.fillRect(0, 0, width, height);
            if (ready) {
                const push = 1 + easeIn(out) * 0.18;
                const s = size * push;
                const px = cx - (cx - left) * push, py = cy - (cy - top) * push;
                for (let part = 0; part < 3; part++) ctx.drawImage(pieces[part], px, py, s, s);
            }
            ctx.restore();
            return;
        }
        const zoom = 1;
        const cellFade = 1;

        // navy field: one sheet while loading, a honeycomb of shrinking tiles during the exit
        ctx.globalAlpha = 1;
        ctx.fillStyle = NAVY;
        ctx.beginPath();
        ctx.rect(0, 0, width, height);
        ctx.fill();

        // The honeycomb: empty cells fade out early, each occupied cell disappears as its
        // hexagon lifts out. Nothing of the grid is left once the mark is built.
        ctx.strokeStyle = GRID;
        ctx.lineWidth = 1;
        const spareAlpha = 0.14 * (1 - clamp01(state.build / 0.35));
        if (spareAlpha > 0.005) {
            ctx.globalAlpha = spareAlpha;
            ctx.beginPath();
            for (let i = 0; i < spare.length; i++) hex(spare[i].x, spare[i].y, cell * 0.38);
            ctx.stroke();
        }
        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            const gone = clamp01((state.build - dot.delay) / 0.12);
            if (gone >= 1) continue;
            ctx.globalAlpha = 0.16 * (1 - gone);
            ctx.beginPath();
            hex(dot.sx, dot.sy, cell * 0.38);
            ctx.stroke();
        }

        // where each part of the logo sits right now
        const apart = 1 - easeInOut(state.join);
        const place = (part, x, y) => {
            x += SPLIT[part][0] * size * apart;
            y += SPLIT[part][1] * size * apart;
            return [cx + (x - cx) * zoom, cy + (y - cy) * zoom];
        };

        // Flying cells, and the fill they leave behind: as a cell lands it swells and merges with
        // its neighbours, and inside the swollen cells the real logo shows through. Once every
        // cell is in, the logo is solid, with no pattern left.
        const fills = [new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            const p = clamp01((state.build - dot.delay) / 0.5);
            if (p <= 0) continue;
            const e = easeOut(p);
            const land = ready ? clamp01((p - 0.82) / 0.18) : 0;
            if (land > 0) {
                const [fx, fy] = place(dot.part, dot.tx, dot.ty);
                const fr = FILL_R * easeOut(land) * zoom;
                const path = fills[dot.part];
                path.moveTo(fx + HEX[0][0] * fr, fy + HEX[0][1] * fr);
                for (let k = 1; k < 6; k++) path.lineTo(fx + HEX[k][0] * fr, fy + HEX[k][1] * fr);
                path.closePath();
            }
            if (land >= 1) continue;
            const [gx, gy] = place(dot.part, dot.tx, dot.ty);
            const dx = gx - dot.sx, dy = gy - dot.sy;
            // straight in, bowed slightly to one side on the way
            const bow = Math.sin(p * Math.PI) * dot.curl;
            const x = dot.sx + dx * e - dy * bow;
            const y = dot.sy + dy * e + dx * bow;
            const r = CELL_R + (cell * 0.38 - CELL_R) * (1 - e);
            if (x < -r || y < -r || x > width + r || y > height + r) continue;
            ctx.globalAlpha = Math.min(1, p * 5) * (0.45 + 0.55 * e) * (1 - land);
            if (ctx.globalAlpha < 0.01) continue;
            ctx.fillStyle = e < 0.35 ? GRID : COLORS[dot.part];
            ctx.beginPath();
            hex(x, y, r);
            ctx.fill();
        }

        const logoAlpha = cellFade;
        if (ready && logoAlpha > 0) {
            for (let part = 0; part < 3; part++) {
                const [px, py] = place(part, left, top);
                const s = size * zoom;
                // the filled-in cells reveal the logo (until the whole logo is shown as one layer,
                // so a fading logo never shows the cell pattern through itself)
                if (state.solid < 1) {
                    ctx.globalAlpha = logoAlpha;
                    ctx.save();
                    ctx.clip(fills[part]);
                    ctx.drawImage(pieces[part], px, py, s, s);
                    ctx.restore();
                }
                // ...and the last slivers along the edges are closed once everything has landed
                if (state.solid > 0) {
                    ctx.globalAlpha = state.solid * logoAlpha;
                    ctx.drawImage(pieces[part], px, py, s, s);
                }
            }
        }

        ctx.globalAlpha = 1;
    };

    let messageIndex = -1;
    const setCounter = (value) => {
        const n = Math.round(value);
        numEl.textContent = (n < 10 ? "00" : n < 100 ? "0" : "") + n;
        lineEl.style.transform = "scaleX(" + n / 100 + ")";
        const index = n >= 100 ? 3 : Math.floor((n / 100) * 3);
        if (index !== messageIndex) {
            messageIndex = index;
            msgEl.textContent = MESSAGES[index];
            msgEl.classList.remove("is-in");
            void msgEl.offsetWidth;
            msgEl.classList.add("is-in");
        }
    };

    let pageLoaded = document.readyState === "complete";
    window.addEventListener("load", () => (pageLoaded = true));

    preloader.classList.add("is-canvas");
    // the page waits slightly enlarged behind the loader, and zooms to its own size as the window opens
    root.classList.add("ld-zoom-in", "ld-zooming");
    const startTime = performance.now();
    let exitStart = 0;
    let exitClock = 0;
    let lastNow = 0;
    let finished = false;

    const finish = () => {
        if (finished) return;
        finished = true;
        done();
        remove();
        if (root.classList.contains("ld-zoom-in")) root.classList.remove("ld-zoom-in", "ld-zooming");
    };

    const frame = (now) => {
        if (finished) return;
        const p = clamp01((now - startTime) / BUILD);
        state.build = p;
        state.join = clamp01((p - 0.62) / 0.32);
        // once the cells have locked together they settle into the solid logo
        state.solid = exitStart ? clamp01((now - (exitStart - HOLD * 0.4)) / 260) : 0;

        if (!exitStart) {
            // the counter holds at 99 until the page itself has finished loading
            setCounter(Math.min(pageLoaded ? 100 : 99, easeInOut(p) * 100));
            if (p >= 1 && pageLoaded) exitStart = now + HOLD;
        } else if (now >= exitStart) {
            // The exit clock advances at most one ordinary frame per frame, so a slow frame
            // slows the exit down instead of skipping it: the split and zoom are always seen.
            exitClock += Math.min(now - (lastNow || now), 20);
            const t = clamp01(exitClock / EXIT);
            preloader.classList.add("is-leaving");
            if (t >= PAGE_AT && root.classList.contains("ld-zoom-in")) {
                // the page eases back to its own size and starts its entrance as the window opens
                root.classList.remove("ld-zoom-in");
                done();
                setTimeout(() => root.classList.remove("ld-zooming"), 1200);
            }
            state.exit = t;
            if (t >= 1) return finish();
        }
        lastNow = now;

        draw();
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // Frames stop while a tab is in the background: never leave the page covered
    setTimeout(finish, 12000);
})();
