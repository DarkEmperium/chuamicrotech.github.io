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

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.querySelector('.contact-form');
    const deviceSelect = document.querySelector('select[name="device_category"]');
    const serviceSelect = document.querySelector('#service_selection');
    const submitBtn = contactForm.querySelector('button[type="submit"]');
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

    const allServiceOptions = Array.from(serviceSelect.options);
    const mapping = {
        'drone': ['drone', 'sales', 'trade', 'recycle'],
        'pc': ['computer', 'setup', 'sales', 'trade', 'recycle'],
        'laptop': ['computer', 'setup', 'sales', 'trade', 'recycle'],
        'other': ['sales', 'trade', 'recycle']
    };

    function updateServiceOptions() {
        const selectedCategory = deviceSelect.value;
        const allowedValues = mapping[selectedCategory] || [];
        serviceSelect.innerHTML = '';

        if (selectedCategory === "") {
            const placeholder = document.createElement('option');
            placeholder.value = "";
            placeholder.textContent = "Please Choose Device Category";
            serviceSelect.appendChild(placeholder);
            serviceSelect.disabled = true;
        } else {
            serviceSelect.disabled = false;
            serviceSelect.appendChild(allServiceOptions[0]); 
            allServiceOptions.forEach(option => {
                if (allowedValues.includes(option.value)) {
                    serviceSelect.appendChild(option.cloneNode(true));
                }
            });
        }
        serviceSelect.selectedIndex = 0;
    }

    deviceSelect.addEventListener('change', updateServiceOptions);
    updateServiceOptions();
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
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
