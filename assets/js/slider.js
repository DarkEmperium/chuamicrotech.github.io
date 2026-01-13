var swiper = new Swiper(".home-slider", {
  speed: 1500,
  spaceBetween: 0,
  centeredSlides: true,
  autoplay: {
    delay: 7000,
    disableOnInteraction: false,
    stopOnLast: true,
  },
  loop: true,
});

for (let i = 0; i < 2; i++) {
  let duplicate = document.querySelector(".logos-container").cloneNode(true);
  document.querySelector(".logos-slide").appendChild(duplicate);
}

gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {

  gsap.set(".reveal-left", { x: -60, opacity: 0, visibility: "hidden" });
  gsap.set(".reveal-right", { x: 60, opacity: 0, visibility: "hidden" });
  gsap.set(".reveal-up", { y: 40, opacity: 0, visibility: "hidden" });
  gsap.set(".reveal-zoom", { scale: 0.8, opacity: 0, visibility: "hidden" });
  gsap.set(".reveal-item", {
    scale: 0.5,
    opacity: 0,
    y: 30,
    visibility: "hidden",
  });

  const experienceElements = document.querySelectorAll(
    ".reveal-left, .reveal-right"
  );
  experienceElements.forEach((el) => {
    gsap.to(el, {
      x: 0,
      opacity: 1,
      visibility: "visible",
      duration: 1,
      ease: "power3.out",
      force3D: true,
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });
  });

  const staggerWrappers = document.querySelectorAll(
    ".services-card-wrapper, .reveal-stagger-container"
  );

  staggerWrappers.forEach((wrapper) => {
    const items = wrapper.querySelectorAll(".reveal-item");

    if (items.length > 0) {
      gsap.to(items, {
        scale: 1,
        opacity: 1,
        y: 0,
        visibility: "visible",
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.7)",
        force3D: true,
        scrollTrigger: {
          trigger: wrapper,
          start: "top 85%",
          once: true,
        },
        onComplete: function () {
          gsap.set(items, { clearProps: "transform, scale" });
        },
      });
    }
  });

  gsap.to(".reveal-zoom", {
    scale: 1,
    opacity: 1,
    visibility: "visible",
    duration: 1.2,
    ease: "back.out(1.4)",
    scrollTrigger: {
      trigger: ".review-container",
      start: "top 80%",
      once: true,
    },
  });

  gsap.utils.toArray(".reveal-up").forEach((el) => {
    gsap.to(el, {
      y: 0,
      opacity: 1,
      visibility: "visible",
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });
  });
});
