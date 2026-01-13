const yearSpan = document.querySelector("#currentYear");
const currentYear = new Date();
yearSpan.innerHTML = currentYear.getFullYear();

const startCounting = () => {
  const counters = document.querySelectorAll(".counter");
  const duration = 2500;

  counters.forEach((counter) => {
    const target = +counter.getAttribute("data-target");
    const startTime = performance.now();
    let lastValue = -1;

    const updateCount = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const easedProgress = progress * (2 - progress); 
      const currentValue = Math.floor(easedProgress * target);

      if (currentValue !== lastValue) {
        counter.innerText = currentValue;
        lastValue = currentValue;
      }

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        counter.innerText = target; 
      }
    };

    requestAnimationFrame(updateCount);
  });
};

const observerOptions = { threshold: 0.5 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      startCounting();
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

const statsSection = document.querySelector("#stats");
if (statsSection) observer.observe(statsSection);

const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close");

if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show-menu");
  });
}

if (navClose) {
  navClose.addEventListener("click", () => {
    navMenu.classList.remove("show-menu");
  });
}

function showTab(evt, tabId) {
  const panels = document.querySelectorAll(".service-panel");
  const navItems = document.querySelectorAll(".nav-item");

  panels.forEach((p) => p.classList.remove("active"));
  navItems.forEach((n) => n.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  evt.currentTarget.classList.add("active");
}
