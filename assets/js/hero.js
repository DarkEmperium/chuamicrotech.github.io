/* =====================================================================
   Home hero.

   canvas[data-hexfield]  loose hexagons drifting behind the hero; they
       ease aside from the pointer. Painted only while the hero is on
       screen and the tab is visible.
   .hexorbit  fades in once the loader is gone (the turning itself is CSS).
   [data-open-status]  says whether the bench is open right now, by the
       shop's own clock (Malaysia time), and marks today in [data-hours].
   ===================================================================== */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const afterLoader = (fn) => {
    if (!document.getElementById("preloader") || root.classList.contains("is-loaded")) fn();
    else window.addEventListener("preloader:done", fn, { once: true });
  };

  /* ---------- floating hexagons ---------- */
  const canvas = document.querySelector("canvas[data-hexfield]");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const host = canvas.parentElement;
    const TONES = ["#011937", "#1568ff", "#8db6ff", "#b9b4a8", "#8f9bb0"];
    const HEX = Array.from({ length: 6 }, (_, k) => [Math.sin((k * Math.PI) / 3), -Math.cos((k * Math.PI) / 3)]);
    const pointer = { x: -9999, y: -9999 };
    let width = 0, height = 0, cells = [], shown = 0, startAt = 0;
    let running = false, visible = true, frameId = 0;

    const layout = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(64, Math.max(18, (width * height) / 30000)));
      cells = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        ox: 0, oy: 0, // push from the pointer, eased back to nothing
        r: 2.5 + Math.random() * Math.random() * 9,
        c: TONES[i % TONES.length],
        a: 0.18 + Math.random() * 0.34,
        ring: Math.random() < 0.3, // some are outlines only
        spin: (Math.random() - 0.5) * 0.004,
        turn: Math.random() * Math.PI,
      }));
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, width, height);
      shown = Math.min(1, (now - startAt) / 1400);
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (!reduceMotion) {
          c.x += c.vx;
          c.y += c.vy;
          c.turn += c.spin;
        }
        if (c.x < -12) c.x = width + 12;
        if (c.x > width + 12) c.x = -12;
        if (c.y < -12) c.y = height + 12;
        if (c.y > height + 12) c.y = -12;
        // ease aside from the pointer
        const dx = c.x + c.ox - pointer.x, dy = c.y + c.oy - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 130 && d > 0.1) {
          const push = (1 - d / 130) * 2.4;
          c.ox += (dx / d) * push;
          c.oy += (dy / d) * push;
        }
        c.ox *= 0.94;
        c.oy *= 0.94;

        const x = c.x + c.ox, y = c.y + c.oy, r = c.r;
        const cos = Math.cos(c.turn), sin = Math.sin(c.turn);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const hx = HEX[k][0] * cos - HEX[k][1] * sin, hy = HEX[k][0] * sin + HEX[k][1] * cos;
          if (k) ctx.lineTo(x + hx * r, y + hy * r);
          else ctx.moveTo(x + hx * r, y + hy * r);
        }
        ctx.closePath();
        ctx.globalAlpha = c.a * shown;
        if (c.ring) {
          ctx.strokeStyle = c.c;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          ctx.fillStyle = c.c;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now) => {
      if (!running) return;
      draw(now);
      frameId = requestAnimationFrame(loop);
    };
    const setRunning = (on) => {
      on = on && visible && !document.hidden && startAt > 0;
      if (on === running) return;
      running = on;
      cancelAnimationFrame(frameId);
      if (on) frameId = requestAnimationFrame(loop);
    };

    layout();
    new ResizeObserver(() => {
      if (Math.abs(host.clientWidth - width) > 2 || Math.abs(host.clientHeight - height) > 2) layout();
    }).observe(host);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      setRunning(true);
    }).observe(host);
    document.addEventListener("visibilitychange", () => setRunning(true));
    host.addEventListener("pointermove", (e) => {
      const rect = host.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    });
    host.addEventListener("pointerleave", () => {
      pointer.x = pointer.y = -9999;
    });
    afterLoader(() => {
      startAt = performance.now();
      setRunning(true);
    });
  }

  /* ---------- the orbit: starts turning once the loader is gone ---------- */
  const hexorbit = document.querySelector(".hexorbit");
  if (hexorbit) afterLoader(() => hexorbit.classList.add("is-live"));

  /* ---------- open now ---------- */
  const status = document.querySelector("[data-open-status]");
  if (status) {
    // opening hours, Monday to Saturday, 9:00 to 22:00 Malaysia time; closed on Sunday
    const OPEN = 9, CLOSE = 22;
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const update = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kuala_Lumpur", weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
      }).formatToParts(new Date());
      const get = (type) => (parts.find((p) => p.type === type) || {}).value;
      const day = DAYS.indexOf(get("weekday"));
      const hour = +get("hour") + +get("minute") / 60;
      const open = day !== 0 && hour >= OPEN && hour < CLOSE;
      let next = "";
      if (!open) {
        // the next opening: later today, tomorrow, or Monday after a Sunday
        const today = day !== 0 && hour < OPEN;
        const nextDay = today ? day : day === 6 ? 1 : day === 0 ? 1 : day + 1;
        next = "opens " + (today ? "today" : nextDay === (day + 1) % 7 ? "tomorrow" : DAYS[nextDay]) + " 9:00 AM";
      }
      status.classList.toggle("is-open", open);
      document.querySelectorAll("[data-hours] [data-day]").forEach((row) => row.classList.toggle("is-today", +row.dataset.day === day));
      status.innerHTML = open
        ? "<i></i>Open now <span>· until 10:00 PM</span>"
        : "<i></i>Closed <span>· " + next + "</span>";
    };
    update();
    setInterval(update, 60000);
  }
})();
