const buttons = document.querySelectorAll("button");

buttons.forEach((button) => {
  button.addEventListener("mousemove", (event) => {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    button.style.setProperty("--mouse-x", `${x}px`);
    button.style.setProperty("--mouse-y", `${y}px`);
  });
});

const cards = document.querySelectorAll(".stack-card, .trial-card, .info-grid article");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.2,
  }
);

cards.forEach((card) => {
  observer.observe(card);
});
