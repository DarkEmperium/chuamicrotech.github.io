/* =====================================================================
   Motion layer: split headlines, scroll-driven text, lazy video,
   3D tilt cards, expanding cards, accordions and the hero's dot figure.
   ===================================================================== */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // Runs once the loader starts opening (or straight away without one)
  const whenReady = (fn) => {
    if (!document.getElementById("preloader") || document.documentElement.classList.contains("is-loaded")) fn();
    else window.addEventListener("preloader:done", fn, { once: true });
  };

  /* ---------- Text splitting ---------- */
  // Wraps every word of `el` (keeping inline children like <em> or <br>) using `wrap(word)`.
  const splitWords = (el, wrap) => {
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(" ") : wrap(part));
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "BR") {
        splitWords(node, wrap);
      }
    });
  };

  // Headlines: each word rises out of its own mask
  document.querySelectorAll("[data-split]").forEach((el) => {
    let i = 0;
    splitWords(el, (word) => {
      const mask = document.createElement("span");
      mask.className = "sw";
      const inner = document.createElement("span");
      inner.textContent = word;
      inner.style.setProperty("--i", i++);
      mask.appendChild(inner);
      return mask;
    });
    el.classList.add("reveal", "is-split");
  });

  // Statements: words ink in as the block travels up the viewport
  const scrubBlocks = Array.from(document.querySelectorAll("[data-scrub]")).map((el) => {
    splitWords(el, (word) => {
      const span = document.createElement("span");
      span.className = "w";
      span.textContent = word;
      return span;
    });
    return { el, words: el.querySelectorAll(".w"), on: -1 };
  });

  const updateScrub = () => {
    const vh = window.innerHeight;
    scrubBlocks.forEach((block) => {
      const rect = block.el.getBoundingClientRect();
      // starts as the block enters the screen, complete once its middle reaches the middle of the screen
      const start = vh * 0.96;
      const end = (vh - rect.height) / 2;
      const progress = reduceMotion ? 1 : clamp((start - rect.top) / Math.max(1, start - end), 0, 1);
      const on = Math.round(progress * block.words.length);
      if (on === block.on) return;
      block.words.forEach((word, i) => word.classList.toggle("on", i < on));
      block.on = on;
    });
  };

  /* ---------- Scroll progress + back to top ---------- */
  const toTop = document.getElementById("to-top");
  const ring = toTop && toTop.querySelector(".to-top__ring circle");
  const RING_LENGTH = 119.4; // 2πr for r = 19

  const updateProgress = () => {
    if (!toTop) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    ring.style.strokeDashoffset = RING_LENGTH * (1 - progress);
    toTop.classList.toggle("is-visible", window.scrollY > 500);
  };

  if (toTop) {
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  }

  let scrollQueued = false;
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      updateScrub();
      updateProgress();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- Marquees ---------- */
  // One set of items is repeated until it is wider than any screen it can meet, then the whole
  // run is doubled so a -50% translate loops with no gap. Speed stays the same however long it gets.
  const fillMarquee = (track) => {
    const set = Array.from(track.children);
    const append = (nodes) =>
      nodes.forEach((node) => {
        const clone = node.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
    const setWidth = track.scrollWidth;
    if (!setWidth) return;
    const need = Math.max(window.innerWidth, window.screen ? window.screen.width : 0) + 200;
    const repeats = Math.min(12, Math.ceil(need / setWidth));
    for (let i = 1; i < repeats; i++) append(set);
    append(Array.from(track.children));
    track.style.animationDuration = (parseFloat(getComputedStyle(track).animationDuration) || 40) * repeats + "s";
  };
  // Logo widths are only known once the track's own images have loaded. The page's load event is
  // not waited for: the embedded reviews can hold it up for a long time.
  document.querySelectorAll(".mq__track, .logos-track").forEach((track) => {
    const waiting = Array.from(track.querySelectorAll("img")).filter((img) => !img.complete);
    if (!waiting.length) return fillMarquee(track);
    let left = waiting.length;
    const done = () => {
      if (--left === 0) fillMarquee(track);
    };
    waiting.forEach((img) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  });

  /* ---------- Heavy video ---------- */
  // The product trailer only downloads and plays once it is scrolled into view
  const lazyVideos = document.querySelectorAll("video[data-play-in-view]");
  if (lazyVideos.length && "IntersectionObserver" in window && !reduceMotion) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.play().catch(() => {});
          else entry.target.pause();
        });
      },
      { threshold: 0.25 }
    );
    lazyVideos.forEach((video) => videoObserver.observe(video));
  }

  /* ---------- Page curtain (exit transition) ---------- */
  const curtain = document.getElementById("curtain");
  if (curtain && !reduceMotion) {
    document.addEventListener("click", (e) => {
      const link = e.target instanceof Element && e.target.closest("a[href]");
      if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      const samePage = url.pathname === location.pathname && url.search === location.search;
      if (url.origin !== location.origin || samePage || !/\.html?$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      curtain.classList.add("is-closing");
      setTimeout(() => (location.href = link.href), 520);
    });
    // Coming back through the bfcache must not leave the curtain down
    window.addEventListener("pageshow", () => curtain.classList.remove("is-closing"));
  }

  /* ---------- In-view flags (progress lines, staged visuals) ---------- */
  if ("IntersectionObserver" in window) {
    const inView = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-inview", entry.isIntersecting)),
      { threshold: 0.35 }
    );
    document.querySelectorAll("[data-inview]").forEach((el) => inView.observe(el));
  } else {
    document.querySelectorAll("[data-inview]").forEach((el) => el.classList.add("is-inview"));
  }

  /* ---------- 3D tilt ---------- */
  // Publishes the pointer position over an element as --tx / --ty (-0.5 … 0.5);
  // the stylesheet turns those into rotations, depth offsets and glare.
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      let queued = 0;
      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(queued);
        queued = requestAnimationFrame(() => {
          el.style.setProperty("--tx", x.toFixed(3));
          el.style.setProperty("--ty", y.toFixed(3));
        });
        el.classList.add("is-tilting");
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(queued);
        el.classList.remove("is-tilting");
        el.style.setProperty("--tx", 0);
        el.style.setProperty("--ty", 0);
      });
    });
  }

  /* ---------- Expanding cards ---------- */
  document.querySelectorAll("[data-accordion]").forEach((group) => {
    const items = Array.from(group.querySelectorAll(".xp__item"));
    items.forEach((item) => {
      item.querySelector(".xp__tab").addEventListener("click", () => {
        items.forEach((other) => {
          const open = other === item;
          other.classList.toggle("is-open", open);
          other.querySelector(".xp__tab").setAttribute("aria-expanded", String(open));
        });
      });
    });
  });

  /* ---------- Accordions ---------- */
  document.querySelectorAll(".faq__item").forEach((item) => {
    const button = item.querySelector(".faq__q");
    button.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      item.parentElement.querySelectorAll(".faq__item").forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector(".faq__q").setAttribute("aria-expanded", "false");
      });
      item.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
    });
  });

  /* =====================================================================
     HERO DOT FIGURE
     Hex-packed dots drawn on a flat plane: no camera, no depth. The figure
     is something to play with: dots shy away from the pointer and spring
     back, pressing pushes harder, and a click on the figure moves on to the
     next one. Shapes also change on a timer: every dot travels to its new
     place on a short curved path, swept left to right across the figure.
     ===================================================================== */
  const canvas = document.getElementById("hero-canvas");
  const stage = document.getElementById("hero-stage");
  const mark = window.CMT_MARK;
  if (!canvas || !stage) return;

  const hero = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const chip = stage.querySelector(".stage-rail");
  const labelEl = document.getElementById("stage-label");
  const dotsEl = document.getElementById("stage-dots");
  const figEl = document.getElementById("stage-fig");
  const numEl = document.getElementById("stage-num");

  const NAVY = "#011937", BLUE = "#1568ff", SKY = "#8db6ff", STONE = "#b9b4a8";
  // tones used by the photo-sampled figures in figures.js, by digit
  const TONES = [NAVY, BLUE, SKY, "#5d6b84", "#aab4c6", "#123f9c", "#c9cfdb"];
  const sampled = window.CMT_FIGURES;
  const BOX = 240; // every figure is described inside a BOX × BOX square
  const MORPH = 0.55; // seconds one dot takes to travel
  const SWEEP = 0.6; // seconds for the change to cross the figure

  /* --- figures: stacked layers, topmost last; a dot takes the colour of the top layer it falls in --- */
  const rounded = (x, y, w, h, r) =>
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
  const fill = (d, color) => ({ path: new Path2D(d), color });
  const stroke = (d, width, color) => ({ path: new Path2D(d), color, width });
  const cut = (d) => ({ path: new Path2D(d), color: null });

  const rotors = [[62, 62], [178, 62], [62, 178], [178, 178]];
  const pins = [0, 1, 2, 3, 4]
    .map((i) => 72 + i * 24)
    .map((o) => `M${o - 5} 26h10v28h-10ZM${o - 5} 186h10v28h-10ZM26 ${o - 5}h28v10h-28ZM186 ${o - 5}h28v10h-28Z`)
    .join("");

  const figures = [
    sampled && sampled.laptop ? { name: "PC & Laptop Repair", grid: sampled.laptop } : { name: "PC & Laptop Repair", layers: [
      stroke(rounded(40, 44, 160, 108, 12), 13, NAVY),
      fill("M16 172H224L206 194H34Z", NAVY),
      stroke("M60 102H88L102 74L122 128L136 92L150 102H180", 9, BLUE),
    ] },
    // a long, low figure: it may spread sideways past the square the others fit in
    sampled ? { name: "Drone Maintenance", grid: sampled.drone, wide: 1.22 } : { name: "Drone Maintenance", layers: [
      stroke("M62 62L178 178M178 62L62 178", 12, NAVY),
      ...rotors.map(([x, y]) => cut(circle(x, y, 30))),
      ...rotors.map(([x, y]) => stroke(circle(x, y, 34), 10, NAVY)),
      ...rotors.map(([x, y]) => fill(circle(x, y, 9), SKY)),
      fill(rounded(90, 82, 60, 76, 16), NAVY),
      fill(circle(120, 106, 13), BLUE),
    ] },
    sampled ? { name: "Custom PC Builds", grid: sampled.pc } : { name: "Custom PC Builds", layers: [
      fill(pins, NAVY),
      stroke(rounded(58, 58, 124, 124, 14), 13, NAVY),
      fill(rounded(92, 92, 56, 56, 8), BLUE),
    ] },
    { name: "Software Development", layers: [
      stroke(rounded(30, 44, 180, 152, 14), 12, NAVY),
      fill("M30 58a14 14 0 0 1 14-14h152a14 14 0 0 1 14 14v7H30Z", NAVY),
      fill(circle(50, 54, 5), SKY),
      fill(circle(66, 54, 5), SKY),
      stroke("M98 118L74 140L98 162", 11, BLUE),
      stroke("M142 118L166 140L142 162", 11, BLUE),
      stroke("M128 108L112 172", 10, NAVY),
    ] },
  ];

  if (mark) {
    // the brand mark leads the sequence, scaled from its 512 box into ours
    const k = 216 / mark.size;
    figures.unshift({
      name: "Chua Micro Tech",
      layers: mark.parts.map((d) => {
        const path = new Path2D();
        path.addPath(new Path2D(d), new DOMMatrix([k, 0, 0, k, 12, 12]));
        return { path, color: NAVY };
      }),
      // a pinch of blue keeps the mark from reading as flat ink
      tint: () => (Math.random() < 0.09 ? BLUE : Math.random() < 0.07 ? SKY : NAVY),
    });
  }

  const probe = document.createElement("canvas").getContext("2d");
  probe.lineJoin = probe.lineCap = "round";

  const colorAt = (figure, x, y) => {
    if (figure.grid) {
      const row = figure.grid[Math.floor((y / BOX) * sampled.size)];
      const tone = row && row[Math.floor((x / BOX) * sampled.size)];
      return tone && tone !== "." ? TONES[tone] : null;
    }
    for (let i = figure.layers.length - 1; i >= 0; i--) {
      const layer = figure.layers[i];
      let hit;
      if (layer.width) {
        probe.lineWidth = layer.width;
        hit = probe.isPointInStroke(layer.path, x, y);
      } else {
        hit = probe.isPointInPath(layer.path, x, y);
      }
      if (hit) return layer.color && figure.tint ? figure.tint() : layer.color;
    }
    return null;
  };

  /* --- state --- */
  let width = 0, height = 0, dpr = 1;
  let view = { cx: 0, cy: 0, size: 0, radius: 0 };
  let dots = [];
  let ambient = [];
  let ripples = [];
  let current = 0, next = 0;
  let phase = "wait"; // wait → intro → idle ⇄ morph
  let phaseAt = 0;
  let switchedAt = 0;
  let scatter = 0;
  let running = false, onScreen = true, frameId = 0;
  // pointer position in canvas space; `down` while a button or finger is held
  const pointer = { x: -9999, y: -9999, down: false };

  const layout = () => {
    width = hero.clientWidth;
    height = hero.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width * height * dpr * dpr > 5e6) dpr = Math.max(1, Math.sqrt(5e6 / (width * height)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const heroRect = hero.getBoundingClientRect();
    const rect = stage.getBoundingClientRect();
    const rail = 64; // the figure index runs down the right edge of the stage
    const room = rect.height;
    const span = rect.width - rail;
    const size = Math.min(span, room, 580) * 0.96;
    const pitch = Math.max(width > 900 ? 7 : 5.6, size / 60);
    view = {
      cx: rect.left - heroRect.left + span / 2,
      cy: rect.top - heroRect.top + room / 2,
      // stage position on the page, so scrolling is measured against the figure itself
      top: rect.top + window.scrollY,
      room,
      size,
      radius: pitch * 0.36,
    };

    // hex-packed sample of every figure, centred on the stage
    const step = (pitch / size) * BOX;
    figures.forEach((figure) => {
      figure.points = [];
      // a wide figure is drawn larger, sampled finer so its dots stay the same size as the rest
      const grow = figure.wide ? Math.max(1, Math.min(figure.wide, span / size)) : 1;
      const own = step / grow;
      let row = 0;
      for (let y = 5; y < BOX - 4; y += own * 0.866, row++) {
        for (let x = 5 + (row % 2 ? own / 2 : 0); x < BOX - 4; x += own) {
          const color = colorAt(figure, x, y);
          if (color) figure.points.push({ x: (x / BOX - 0.5) * size * grow, y: (y / BOX - 0.5) * size * grow, c: color });
        }
      }
    });

    const count = Math.max(...figures.map((figure) => figure.points.length));
    const previous = dots;
    dots = Array.from({ length: count }, (_, i) => {
      const old = previous[i];
      const turn = Math.random() * Math.PI * 2;
      return {
        x: old ? old.x : 0, y: old ? old.y : 0, vx: 0, vy: 0,
        tx: 0, ty: 0, c: NAVY, a: old ? old.a : 0, ta: 1,
        landed: old ? old.landed : false, ease: old ? old.ease : 0,
        // where it drifts to as the page scrolls away
        sx: Math.cos(turn) * (200 + Math.random() * 500),
        sy: Math.sin(turn) * (200 + Math.random() * 500) - 120,
        r: view.radius * (0.86 + Math.random() * 0.28),
        // entrance: starts swung out and scattered around its place
        swing: 0.8 + Math.random() * 0.35,
        spread: 1.35 + Math.random() * 0.55,
        jx: (Math.random() - 0.5) * size * 0.3,
        jy: (Math.random() - 0.5) * size * 0.3,
        delay: 0,
      };
    });
    assign(current);
    dots.forEach((dot) => {
      dot.delay = Math.min(1, Math.hypot(dot.tx, dot.ty) / (size * 0.62)) * 0.5 + Math.random() * 0.12;
    });

    if (!ambient.length) {
      const tones = [NAVY, BLUE, SKY, STONE, "#8f9bb0"];
      ambient = Array.from({ length: width > 900 ? 46 : 22 }, (_, i) => ({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: 1.5 + Math.random() * 3.5, c: tones[i % tones.length], a: 0.2 + Math.random() * 0.35,
      }));
    }
  };

  // Points dots at a figure. Dots the figure has no room for hide on top of others.
  const assign = (index) => {
    const points = figures[index].points;
    dots.forEach((dot, i) => {
      const point = points[i] || points[(i * 7919) % points.length];
      dot.tx = point.x;
      dot.ty = point.y;
      dot.c = point.c;
      dot.ta = points[i] ? 1 : 0;
    });
  };

  const caption = (index) => {
    if (labelEl) labelEl.textContent = figures[index].name;
    if (figEl) figEl.textContent = "FIG. 0" + (index + 1) + " / 0" + figures.length;
    if (numEl) numEl.textContent = "0" + (index + 1);
    if (dotsEl) Array.from(dotsEl.children).forEach((dot, i) => dot.classList.toggle("is-on", i === index));
  };

  const morphTo = (index, now) => {
    index = (index + figures.length) % figures.length;
    if (phase !== "idle" || index === current) return;
    const points = figures[index].points;
    next = index;
    phase = "morph";
    phaseAt = now;
    dots.forEach((dot, i) => {
      const point = points[i] || points[(i * 7919) % points.length];
      dot.fx = dot.tx; dot.fy = dot.ty; dot.fc = dot.c; dot.fa = dot.ta;
      dot.nx = point.x; dot.ny = point.y; dot.nc = point.c; dot.na = points[i] ? 1 : 0;
      dot.wait = clamp(dot.fx / view.size + 0.5, 0, 1) * SWEEP + Math.random() * 0.1;
    });
    caption(index);
  };

  const render = (now) => {
    ctx.clearRect(0, 0, width, height);
    const fade = 1 - scatter * 0.85;

    // loose background dots
    const settle = readyAt ? Math.min(1, (now - readyAt) / 1400) : 0;
    for (let i = 0; i < ambient.length; i++) {
      const dot = ambient[i];
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < -10) dot.x = width + 10;
      if (dot.x > width + 10) dot.x = -10;
      if (dot.y < -10) dot.y = height + 10;
      if (dot.y > height + 10) dot.y = -10;
      if (settle <= 0) continue;
      ctx.globalAlpha = dot.a * settle;
      ctx.fillStyle = dot.c;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, 6.2832);
      ctx.fill();
    }
    if (phase === "wait") {
      ctx.globalAlpha = 1;
      return;
    }

    // how far the pointer reaches, and how hard it pushes (more while pressed)
    const reach = (pointer.down ? 0.34 : 0.2) * view.size;
    const force = pointer.down ? 5.2 : 2.8;

    const morphing = phase === "morph";
    const morphTime = (now - phaseAt) / 1000;
    const introTime = (now - introAt) / 1000;
    ctx.lineCap = "round";

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      let mx = dot.tx, my = dot.ty;
      let travelling = false;
      let pop = 1; // dots swell a little mid-flight and beside the pointer

      if (morphing) {
        const t = (morphTime - dot.wait) / MORPH;
        if (t >= 1) {
          dot.tx = mx = dot.nx; dot.ty = my = dot.ny; dot.c = dot.nc; dot.ta = dot.na;
        } else if (t > 0) {
          // smooth step along the line, bowed sideways
          travelling = true;
          const s = t * t * (3 - 2 * t);
          const arc = Math.sin(t * Math.PI);
          const dx = dot.nx - dot.fx, dy = dot.ny - dot.fy;
          mx = dot.fx + dx * s - dy * 0.3 * arc;
          my = dot.fy + dy * s + dx * 0.3 * arc;
          pop = 1 + 0.35 * arc;
          dot.c = t < 0.5 ? dot.fc : dot.nc;
          dot.ta = t < 0.5 ? dot.fa : dot.na;
          dot.tx = mx; dot.ty = my;
        }
      }

      // where the dot belongs on screen
      const sxp = view.cx + mx + dot.sx * scatter;
      const syp = view.cy + my + dot.sy * scatter;

      if (travelling) {
        dot.vx = sxp - dot.x; dot.vy = syp - dot.y;
        dot.x = sxp; dot.y = syp;
        dot.ease = 1;
        dot.a += (dot.ta - dot.a) * 0.18;
      } else if (dot.landed) {
        // settled: a soft spring holds it in place, the pointer shoves it aside
        dot.vx += (sxp - dot.x) * 0.045;
        dot.vy += (syp - dot.y) * 0.045;
        const px = dot.x - pointer.x, py = dot.y - pointer.y;
        const d2 = px * px + py * py;
        if (d2 < reach * reach) {
          const d = Math.sqrt(d2) + 0.01;
          const near = 1 - d / reach;
          dot.vx += (px / d) * near * force;
          dot.vy += (py / d) * near * force;
          pop = 1 + near * 0.5;
        }
        dot.vx *= 0.82; dot.vy *= 0.82;
        dot.x += dot.vx; dot.y += dot.vy;
        dot.a += (dot.ta - dot.a) * 0.08;
        dot.ease = 1;
      } else {
        // entrance: unwinds and tightens into place
        const t = clamp((introTime - dot.delay) / 0.95, 0, 1);
        const e = 1 - Math.pow(1 - t, 4);
        const out = 1 - e;
        const ox = sxp - view.cx, oy = syp - view.cy;
        const angle = dot.swing * out, grow = 1 + (dot.spread - 1) * out;
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const ix = view.cx + (ox * cosA - oy * sinA) * grow + dot.jx * out + Math.sin(now / 1300 + i) * 4 * out;
        const iy = view.cy + (ox * sinA + oy * cosA) * grow + dot.jy * out + Math.cos(now / 1100 + i * 0.7) * 4 * out;
        dot.vx = ix - dot.x; dot.vy = iy - dot.y;
        dot.x = ix; dot.y = iy;
        dot.ease = e;
        dot.a = dot.ta * (0.3 + 0.7 * e);
        if (t >= 1) {
          dot.landed = true;
          dot.vx = dot.vy = 0;
        }
      }

      if (dot.a < 0.02) continue;
      const scale = (0.6 + 0.4 * dot.ease) * pop;
      ctx.globalAlpha = fade * dot.a;
      const speed = dot.vx * dot.vx + dot.vy * dot.vy;
      if (speed > 9) {
        // fast dots leave a short streak instead of a disc
        const tail = travelling ? 0.8 : dot.landed ? 2.4 : 1.1;
        ctx.strokeStyle = dot.c;
        ctx.lineWidth = dot.r * 2 * scale;
        ctx.beginPath();
        ctx.moveTo(dot.x - dot.vx * tail, dot.y - dot.vy * tail);
        ctx.lineTo(dot.x, dot.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = dot.c;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r * scale, 0, 6.2832);
        ctx.fill();
      }
    }

    // a ring pulses out each time a figure lands
    for (let i = ripples.length - 1; i >= 0; i--) {
      const t = (now - ripples[i]) / 900;
      if (t > 1) {
        ripples.splice(i, 1);
        continue;
      }
      if (t < 0) continue;
      const e = 1 - Math.pow(1 - t, 3);
      ctx.globalAlpha = (1 - t) * 0.5 * fade;
      ctx.strokeStyle = i % 2 ? SKY : BLUE;
      ctx.lineWidth = 1 + 2.5 * (1 - t);
      ctx.beginPath();
      ctx.arc(view.cx, view.cy, view.size * (0.12 + e * 0.75), 0, 6.2832);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  let introAt = 0;
  let readyAt = 0;
  const HEADER = 96;

  const tick = (now) => {
    if (!running) return;
    // dots drift apart as the figure slides under the header, wherever it sits in the layout
    const stageTop = view.top - window.scrollY;
    const scrolled = clamp((HEADER - stageTop) / (view.room * 0.9), 0, 1);
    if (scrolled !== scatter) {
      scatter = scrolled;
      // the caption fades out as the figure drifts apart
      if (chip) chip.style.opacity = scatter > 0 ? String(1 - Math.min(1, scatter * 3)) : "";
    }

    if (phase === "wait" && readyAt && stageTop + view.room * 0.4 < window.innerHeight) {
      // hold the assembly until enough of the figure is on screen to watch it
      phase = "intro";
      introAt = now;
    } else if (phase === "intro" && now - introAt > 1750) {
      phase = "idle";
      switchedAt = now;
      ripples.push(now);
    } else if (phase === "morph" && now - phaseAt > (SWEEP + 0.1 + MORPH) * 1000 + 60) {
      current = next;
      phase = "idle";
      assign(current);
      switchedAt = now;
      ripples.push(now);
    } else if (phase === "idle" && scatter < 0.15) {
      const hold = current === 0 ? 4600 : 3800;
      const progress = clamp((now - switchedAt) / hold, 0, 1);
      if (dotsEl) dotsEl.style.setProperty("--p", progress.toFixed(3));
      if (progress >= 1) morphTo(current + 1, now);
    }

    render(now);
    frameId = requestAnimationFrame(tick);
  };

  const setRunning = (value) => {
    if (value === running) return;
    running = value;
    cancelAnimationFrame(frameId);
    if (running) frameId = requestAnimationFrame(tick);
  };

  /* --- boot --- */
  layout();
  if (dotsEl) {
    dotsEl.innerHTML = figures.map(() => '<button type="button" tabindex="-1"></button>').join("");
    Array.from(dotsEl.children).forEach((button, i) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        morphTo(i, performance.now());
      });
    });
  }
  caption(0);

  if (reduceMotion) {
    // one settled frame, no loop
    phase = "idle";
    dots.forEach((dot) => {
      dot.landed = true;
      dot.ease = 1;
      dot.a = dot.ta;
      dot.x = view.cx + dot.tx;
      dot.y = view.cy + dot.ty;
    });
    render(0);
    return;
  }

  whenReady(() => {
    readyAt = performance.now();
  });

  /* --- pointer: push the dots around, click the figure to move on --- */
  const toCanvas = (e) => {
    const rect = hero.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onFigure = (x, y) => Math.hypot(x - view.cx, y - view.cy) < view.size * 0.6;

  hero.addEventListener("pointermove", (e) => {
    [pointer.x, pointer.y] = toCanvas(e);
    if (stage) stage.classList.toggle("is-hot", onFigure(pointer.x, pointer.y));
  });
  hero.addEventListener("pointerdown", (e) => {
    [pointer.x, pointer.y] = toCanvas(e);
    pointer.down = true;
  });
  const release = (e) => {
    pointer.down = false;
    // a finger leaves no hover behind
    if (e.pointerType !== "mouse") pointer.x = pointer.y = -9999;
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  hero.addEventListener("pointerleave", () => {
    pointer.x = pointer.y = -9999;
    pointer.down = false;
    if (stage) stage.classList.remove("is-hot");
  });
  hero.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest("a, button, .stage-rail")) return;
    const [x, y] = toCanvas(e);
    if (onFigure(x, y)) morphTo(current + 1, performance.now());
  });

  let resizeTimer = 0;
  new ResizeObserver(() => {
    if (Math.abs(hero.clientWidth - width) < 2 && Math.abs(hero.clientHeight - height) < 2) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  }).observe(hero);

  document.addEventListener("visibilitychange", () => setRunning(onScreen && !document.hidden));
  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    setRunning(onScreen && !document.hidden);
  }).observe(hero);
})();
