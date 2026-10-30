/* =====================================================================
   Dot art outside the hero.

   canvas[data-dotart="drone|pc|laptop"]  draws one of the sampled figures
       from figures.js as hex-packed dots. The dots shimmer slowly and
       give way to the pointer. data-tone="dark" switches to the palette
       for navy backgrounds, data-tone="mute" to a greyed one.
   canvas[data-dotfield]  fills its section with a quiet grid of dots that
       swell and turn blue around the pointer.

   Each canvas only animates while it is on screen.
   ===================================================================== */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PALETTES = {
    light: ["#011937", "#1568ff", "#8db6ff", "#5d6b84", "#aab4c6", "#123f9c", "#c9cfdb"],
    dark: ["#ffffff", "#5b97ff", "#8db6ff", "#aebbd2", "#7385a3", "#3f7dff", "#2b426b"],
    mute: ["#66738a", "#8a96ab", "#aab4c6", "#8a96ab", "#b6bfce", "#7a879d", "#ccd2dd"],
  };

  // Runs `frame` on every animation frame while `canvas` is visible
  const whileVisible = (canvas, frame) => {
    let id = 0, on = false;
    const loop = (now) => {
      if (!on) return;
      frame(now);
      id = requestAnimationFrame(loop);
    };
    const set = (value) => {
      if (value === on) return;
      on = value;
      cancelAnimationFrame(id);
      if (on) id = requestAnimationFrame(loop);
    };
    let seen = false;
    new IntersectionObserver((entries) => {
      seen = entries[0].isIntersecting;
      set(seen && !document.hidden);
    }).observe(canvas);
    document.addEventListener("visibilitychange", () => set(seen && !document.hidden));
  };

  const fit = (canvas, ctx) => {
    const rect = canvas.getBoundingClientRect();
    // the canvas may sit inside a tilted or scaled card; its own layout size is what counts
    const width = canvas.offsetWidth || rect.width, height = canvas.offsetHeight || rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [width, height];
  };

  /* ---------- figures ---------- */
  const figures = window.CMT_FIGURES;
  if (figures) {
    document.querySelectorAll("canvas[data-dotart]").forEach((canvas) => {
      const rows = figures[canvas.dataset.dotart];
      if (!rows) return;
      const G = figures.size;
      const tones = PALETTES[canvas.dataset.tone] || PALETTES.light;
      const ctx = canvas.getContext("2d");

      // the canvas takes the proportions of the figure itself, not of the square it was sampled in
      let x0 = G, y0 = G, x1 = 0, y1 = 0;
      rows.forEach((row, y) => {
        for (let x = 0; x < G; x++) {
          if (row[x] === ".") continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      });
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      canvas.style.aspectRatio = bw + " / " + bh;

      let width = 0, height = 0, radius = 0, dots = [];
      const pointer = { x: -9999, y: -9999 };

      const layout = () => {
        [width, height] = fit(canvas, ctx);
        if (!width) return;
        // the figure is fitted inside the box and centred, whatever shape the box is
        const scale = Math.min(width / bw, height / bh);
        const left = (width - bw * scale) / 2, top = (height - bh * scale) / 2;
        const across = Math.min(+canvas.dataset.density || 54, Math.max(18, Math.floor((bw * scale) / 3.4)));
        const pitch = (bw * scale) / across;
        const step = pitch / scale;
        radius = pitch * 0.37;
        dots = [];
        let line = 0;
        for (let y = 0.5; y < bh; y += step * 0.866, line++) {
          for (let x = 0.5 + (line % 2 ? step / 2 : 0); x < bw; x += step) {
            const tone = rows[y0 + Math.floor(y)][x0 + Math.floor(x)];
            if (!tone || tone === ".") continue;
            const tx = left + x * scale, ty = top + y * scale;
            dots.push({ tx, ty, x: tx, y: ty, vx: 0, vy: 0, c: tones[tone] });
          }
        }
        draw(0);
      };

      const draw = (now) => {
        ctx.clearRect(0, 0, width, height);
        const reach = Math.max(26, width * 0.16);
        for (let i = 0; i < dots.length; i++) {
          const dot = dots[i];
          let swell = 1;
          if (!reduceMotion) {
            dot.vx += (dot.tx - dot.x) * 0.06;
            dot.vy += (dot.ty - dot.y) * 0.06;
            const px = dot.x - pointer.x, py = dot.y - pointer.y;
            const d2 = px * px + py * py;
            if (d2 < reach * reach) {
              const d = Math.sqrt(d2) + 0.01, near = 1 - d / reach;
              dot.vx += (px / d) * near * 1.8;
              dot.vy += (py / d) * near * 1.8;
              swell += near * 0.5;
            }
            dot.vx *= 0.8;
            dot.vy *= 0.8;
            dot.x += dot.vx;
            dot.y += dot.vy;
            // a slow wave crosses the figure
            swell += Math.sin(now / 620 - (dot.tx + dot.ty * 0.6) / (width * 0.16)) * 0.13;
          }
          ctx.fillStyle = dot.c;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, radius * swell, 0, 6.2832);
          ctx.fill();
        }
      };

      layout();
      new ResizeObserver(() => {
        if (Math.abs(canvas.offsetWidth - width) > 1) layout();
      }).observe(canvas);
      if (reduceMotion) return;

      canvas.addEventListener("pointermove", (e) => {
        pointer.x = e.offsetX;
        pointer.y = e.offsetY;
      });
      canvas.addEventListener("pointerleave", () => {
        pointer.x = pointer.y = -9999;
      });
      whileVisible(canvas, draw);
    });
  }

  /* ---------- interactive dot field behind a section ---------- */
  document.querySelectorAll("canvas[data-dotfield]").forEach((canvas) => {
    const host = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    const GAP = 30;
    let width = 0, height = 0, cols = 0, rowsCount = 0, heat = new Float32Array(0);
    const pointer = { x: -9999, y: -9999 };

    const layout = () => {
      [width, height] = fit(canvas, ctx);
      cols = Math.ceil(width / GAP) + 1;
      rowsCount = Math.ceil(height / GAP) + 1;
      heat = new Float32Array(cols * rowsCount);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const reach = 190;
      let warm = 0;
      for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = c * GAP + (r % 2 ? GAP / 2 : 0), y = r * GAP;
          const d = Math.hypot(x - pointer.x, y - pointer.y);
          const goal = d < reach ? 1 - d / reach : 0;
          // warms up quickly under the pointer, cools down slowly behind it
          heat[i] += (goal - heat[i]) * (goal > heat[i] ? 0.22 : 0.035);
          const h = heat[i];
          ctx.globalAlpha = 0.13 + h * 0.8;
          ctx.fillStyle = h > 0.04 ? "#1568ff" : "#011937";
          ctx.beginPath();
          ctx.arc(x, y, 1.5 + h * 3.6, 0, 6.2832);
          ctx.fill();
          if (h > warm) warm = h;
        }
      }
      ctx.globalAlpha = 1;
      return warm > 0.01; // still glowing somewhere: keep drawing
    };

    layout();
    new ResizeObserver(() => {
      if (Math.abs(canvas.offsetWidth - width) > 1 || Math.abs(canvas.offsetHeight - height) > 1) layout();
    }).observe(canvas);
    if (reduceMotion) return;

    // Drawn only while there is something to show: the field sits still (one frame) until the
    // pointer comes near, and stops again once the glow behind it has cooled.
    let running = false;
    const loop = () => {
      const busy = draw();
      if (busy || pointer.x > -9999) requestAnimationFrame(loop);
      else running = false;
    };
    const wake = () => {
      if (running) return;
      running = true;
      requestAnimationFrame(loop);
    };
    host.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      wake();
    });
    host.addEventListener("pointerleave", () => {
      pointer.x = pointer.y = -9999;
    });
  });
})();
