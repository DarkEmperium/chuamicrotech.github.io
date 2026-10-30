document.documentElement.classList.add("js");

const yearSpan = document.querySelector("#currentYear");
if (yearSpan) yearSpan.innerHTML = new Date().getFullYear();

/* ---------- Scroll reveal ---------- */
// Starts once the loader is out of the way so the first screen animates in view
const startReveals = () => {
  const revealItems = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  revealItems.forEach((el) => revealObserver.observe(el));
};

if (document.getElementById("preloader") && !document.documentElement.classList.contains("is-loaded")) {
  window.addEventListener("preloader:done", startReveals, { once: true });
} else {
  startReveals();
}

/* ---------- Stat counters ---------- */
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

// Counting starts once the loader has gone and the numbers are on screen, so the run is seen
const statsSection = document.querySelector("#stats");
if (statsSection) {
  const watchStats = () => observer.observe(statsSection);
  if (document.getElementById("preloader") && !document.documentElement.classList.contains("is-loaded")) {
    window.addEventListener("preloader:done", watchStats, { once: true });
  } else {
    watchStats();
  }
}

/* ---------- Mobile navigation ---------- */
const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close");

const closeMenu = () => navMenu && navMenu.classList.remove("show-menu");

if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show-menu");
  });
}

if (navClose) {
  navClose.addEventListener("click", closeMenu);
}

/* ---------- Software dropdown: opens on hover on wide screens, on a tap or click everywhere ---------- */
const dropItems = Array.from(document.querySelectorAll(".nav__item--drop"));
const setDrop = (item, open) => {
  item.classList.toggle("is-open", open);
  item.querySelector(".nav__drop-btn").setAttribute("aria-expanded", String(open));
};
dropItems.forEach((item) => {
  item.querySelector(".nav__drop-btn").addEventListener("click", () => setDrop(item, !item.classList.contains("is-open")));
});
document.addEventListener("click", (e) => {
  dropItems.forEach((item) => {
    if (!item.contains(e.target)) setDrop(item, false);
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeMenu();
  dropItems.forEach((item) => setDrop(item, false));
});

/* ---------- Support ticket (contact page) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.querySelector('.contact-form');
  if (!contactForm) return;

  const blocks = Array.from(contactForm.querySelectorAll('.fblock'));
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const serviceTiles = Array.from(contactForm.querySelectorAll('#service_selection .tile'));
  const serviceHint = document.getElementById('service_hint');
  const toast = document.getElementById('custom-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  function showNotification(message, type = 'success') {
    toastMsg.textContent = message;
    toast.className = 'custom-toast show';

    if (type === 'success') {
      toast.classList.add('toast-success');
      toastIcon.className = 'bx bx-check-circle';
    } else {
      toast.classList.add('toast-error');
      toastIcon.className = 'bx bx-error-circle';
    }

    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // Which services make sense for which kind of device
  const mapping = {
    'drone': ['drone', 'app', 'sales', 'trade', 'recycle'],
    'pc': ['computer', 'setup', 'software', 'sales', 'trade', 'recycle'],
    'laptop': ['computer', 'setup', 'software', 'sales', 'trade', 'recycle'],
    'software': ['software', 'app'],
    'other': ['sales', 'trade', 'recycle']
  };

  const chosen = (name) => contactForm.querySelector('input[name="' + name + '"]:checked');
  const titleOf = (input) => input.closest('.tile').querySelector('strong').textContent;

  function updateServiceOptions() {
    const device = chosen('device_category');
    const allowedValues = device ? mapping[device.value] || [] : [];
    serviceTiles.forEach((tile) => {
      const input = tile.querySelector('input');
      const allowed = allowedValues.includes(input.value);
      tile.hidden = !allowed;
      if (!allowed) input.checked = false;
    });
    if (serviceHint) serviceHint.hidden = !!device;
  }

  // The progress steps above the form light up as each part is completed
  function setStep(key, done) {
    const step = contactForm.querySelector('[data-step="' + key + '"]');
    if (step) step.classList.toggle('is-done', done);
  }

  function updateStub() {
    const details = blocks[2] && Array.from(blocks[2].querySelectorAll('input, textarea')).every((field) => field.checkValidity());
    setStep('device', !!chosen('device_category'));
    setStep('service', !!chosen('service_type'));
    setStep('contact', !!details);
  }

  // The first block that still needs a choice or a valid field
  function firstProblem() {
    return blocks.find((block) => {
      const radios = Array.from(block.querySelectorAll('input[type="radio"]'));
      if (radios.length) return !radios.some((radio) => radio.checked);
      return Array.from(block.querySelectorAll('input, textarea')).some((field) => !field.checkValidity());
    });
  }

  contactForm.addEventListener('change', (e) => {
    if (e.target.name === 'device_category') updateServiceOptions();
    if (e.target.type === 'radio') e.target.closest('.fblock').classList.remove('is-missing');
    updateStub();
  });
  contactForm.addEventListener('input', updateStub);

  updateServiceOptions();
  updateStub();

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    blocks.forEach((block) => block.classList.remove('is-missing'));
    const problem = firstProblem();
    if (problem) {
      const invalid = Array.from(problem.querySelectorAll('input:not([type="radio"]), textarea'))
        .find((field) => !field.checkValidity());
      if (invalid) {
        invalid.reportValidity();
      } else {
        problem.classList.add('is-missing');
        problem.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return;
    }

    submitBtn.disabled = true;
    const formData = new FormData(contactForm);
    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: json
    })
      .then(async (response) => {
        if (response.status == 200) {
          showNotification("Ticket Submitted Successfully", "success");
          contactForm.reset();
          updateServiceOptions();
          updateStub();
        } else {
          showNotification("Submission Failed", "error");
        }
      })
      .catch(() => {
        showNotification("Connection Error Detected", "error");
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });
});

/* ---------- Terms categories ---------- */
function switchTerms(category) {
  document.querySelectorAll('.switcher-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('btn-' + category).classList.add('active');
  document.querySelectorAll('.specific-terms').forEach(section => section.classList.remove('active-section'));
  document.getElementById('terms-' + category).classList.add('active-section');
}

/* ---------- App pages: screen viewer, full-size view, model search ---------- */
document.querySelectorAll("[data-gallery]").forEach((gallery) => {
  const tabs = Array.from(gallery.querySelectorAll("[role=tab]"));
  const img = gallery.querySelector("[data-gallery-img]");
  const tag = gallery.querySelector("[data-gallery-tag]");
  const title = gallery.querySelector("[data-gallery-title]");
  const text = gallery.querySelector("[data-gallery-text]");
  const points = gallery.querySelector("[data-gallery-points]");
  const count = gallery.querySelector("[data-gallery-count]");
  const dialog = document.querySelector("[data-gallery-dialog]");
  const big = dialog && dialog.querySelector("[data-gallery-big]");
  let current = 0;

  const show = (index, first) => {
    current = (index + tabs.length) % tabs.length;
    const tab = tabs[current];
    tabs.forEach((other) => {
      other.classList.toggle("is-on", other === tab);
      other.setAttribute("aria-selected", String(other === tab));
    });
    tag.textContent = tab.dataset.tag;
    title.textContent = tab.dataset.title;
    text.textContent = tab.dataset.text;
    points.innerHTML = "";
    tab.dataset.points.split("|").forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      points.appendChild(li);
    });
    count.textContent = String(current + 1).padStart(2, "0") + " / " + String(tabs.length).padStart(2, "0");
    if (first) return;
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    img.classList.add("is-swapping");
    setTimeout(() => {
      img.src = tab.dataset.shot;
      img.alt = tab.querySelector("span").textContent + " screen";
      img.classList.remove("is-swapping");
    }, 200);
  };

  tabs.forEach((tab, i) => tab.addEventListener("click", () => i !== current && show(i)));
  gallery.querySelector("[data-gallery-prev]").addEventListener("click", () => show(current - 1));
  gallery.querySelector("[data-gallery-next]").addEventListener("click", () => show(current + 1));
  if (dialog && big) {
    gallery.querySelector("[data-gallery-open]").addEventListener("click", () => {
      big.src = tabs[current].dataset.shot;
      big.alt = img.alt;
      dialog.showModal();
    });
    dialog.querySelector("[data-gallery-close]").addEventListener("click", () => dialog.close());
    // a click on the dim area around the screen closes it too
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  }
  show(0, true);
});

document.querySelectorAll("[data-models]").forEach((finder) => {
  const input = finder.querySelector("[data-models-search]");
  const rows = Array.from(finder.querySelectorAll(".models__list li"));
  const count = finder.querySelector("[data-models-count]");
  const empty = finder.querySelector("[data-models-empty]");
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const match = !query || row.textContent.toLowerCase().includes(query);
      row.hidden = !match;
      if (match) shown++;
    });
    count.textContent = shown;
    empty.hidden = shown > 0;
  });
});
