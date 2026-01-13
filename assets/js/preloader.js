(function() {
    const preloader = document.getElementById("preloader");
    const progressBar = document.querySelector(".progress-fill");

    if (!progressBar || !preloader) return;

    // 1. STAGE ONE: The "Crawl"
    // Start moving to 80% as soon as possible
    requestAnimationFrame(() => {
        // We set a long time (5s) so it doesn't finish too early on slow connections
        progressBar.style.transition = "width 5s cubic-bezier(0.1, 0.5, 0.1, 1)";
        progressBar.style.width = "80%";
    });

    // 2. STAGE TWO: The "Finish"
    window.addEventListener("load", () => {
        // Force the bar to 100% quickly
        progressBar.style.transition = "width 0.4s ease-out";
        progressBar.style.width = "100%";

        // Wait for the bar to physically reach the end
        progressBar.addEventListener('transitionend', (e) => {
            if (e.propertyName === 'width') {
                
                // Stay at 100% for a moment for visual impact
                setTimeout(() => {
                    preloader.classList.add("preloader-hidden");

                    // Hide fully after CSS opacity transition finishes
                    setTimeout(() => {
                        preloader.style.display = "none";
                        // Prevent user from being stuck with no scrollbar
                        document.body.style.overflow = "auto"; 
                    }, 500); 
                }, 200); 
            }
        }, { once: true });
    });

    // Optional: Lock scrolling while loading
    document.body.style.overflow = "hidden";
})();