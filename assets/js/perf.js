/* =====================================================================
   Keeps animation work to what is on screen. Every animated block is
   watched; while it is out of view it gets .is-offscreen, which pauses
   all of its CSS animations (components.css). Spinning fans, propellers,
   marquees and drifting outlines then cost nothing until they come back.
   ===================================================================== */
(() => {
  if (!("IntersectionObserver" in window)) return;
  const watched = document.querySelectorAll(
    ".hexorbit, .scene, .m3d, .mq, .logos-slide, .orb, .scroll-cue, .iso, .vm, .cta__panel, .promo, .why-grid, .service-bar"
  );
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle("is-offscreen", !entry.isIntersecting)),
    { rootMargin: "120px 0px" }
  );
  watched.forEach((el) => observer.observe(el));

  // a background tab runs nothing at all
  document.addEventListener("visibilitychange", () =>
    document.documentElement.classList.toggle("is-hidden-tab", document.hidden)
  );
})();
