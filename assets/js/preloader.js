window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  const progressBar = document.querySelector(".progress-fill");

  if (progressBar) {
    progressBar.style.animation = "none";

    progressBar.style.transition = "width 0.4s cubic-bezier(0.23, 1, 0.32, 1)";

    requestAnimationFrame(() => {
      progressBar.style.width = "100%";
    });
  }

  setTimeout(() => {
    preloader.classList.add("preloader-hidden");

    setTimeout(() => {
      preloader.style.display = "none";
    }, 500);
  }, 500);
});
