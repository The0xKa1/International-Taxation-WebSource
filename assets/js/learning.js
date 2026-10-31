(() => {
  const button = document.querySelector(".parameter-toggle");
  button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    document.body.classList.toggle("parameters-open", expanded);
    button.querySelector("span").textContent = expanded ? "−" : "＋";
  });
})();
