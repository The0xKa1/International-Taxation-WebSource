(() => {
  const viewport = document.querySelector(".chapter-viewport");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let hovered = false;
  let focused = false;
  let interacting = false;
  let resumeAt = 0;
  let direction = 1;
  let previousTime = 0;
  viewport.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch") hovered = true;
  });
  viewport.addEventListener("pointerleave", () => {
    hovered = false;
  });
  viewport.addEventListener("focusin", () => {
    focused = true;
  });
  viewport.addEventListener("focusout", (event) => {
    focused = viewport.contains(event.relatedTarget);
  });
  viewport.addEventListener("pointerdown", () => {
    interacting = true;
  });
  const release = () => {
    interacting = false;
    resumeAt = performance.now() + 3500;
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  viewport.addEventListener(
    "wheel",
    () => {
      resumeAt = performance.now() + 3500;
    },
    { passive: true },
  );
  function move(sign) {
    resumeAt = performance.now() + 5000;
    direction = sign;
    const card = viewport.querySelector(".course-card");
    viewport.scrollBy({
      left: sign * (card.getBoundingClientRect().width + 22),
      behavior: reducedMotion.matches ? "instant" : "smooth",
    });
  }
  document
    .querySelector("#previous-chapter")
    .addEventListener("click", () => move(-1));
  document
    .querySelector("#next-chapter")
    .addEventListener("click", () => move(1));
  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    }
  });
  function tick(time) {
    const delta = Math.min(time - previousTime, 50);
    previousTime = time;
    const rect = viewport.getBoundingClientRect();
    if (
      !reducedMotion.matches &&
      !hovered &&
      !focused &&
      !interacting &&
      !document.hidden &&
      time > resumeAt &&
      rect.top < window.innerHeight &&
      rect.bottom > 0
    ) {
      const end = viewport.scrollWidth - viewport.clientWidth;
      if (end > 0) {
        if (viewport.scrollLeft >= end - 1) direction = -1;
        else if (viewport.scrollLeft <= 0) direction = 1;
        viewport.scrollLeft += direction * delta * 0.032;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
