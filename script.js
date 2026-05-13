const atlasCards = document.querySelectorAll(".atlas-card, .atlas-info article");

const atlasObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform += " translateY(0)";
      }
    });
  },
  { threshold: 0.15 }
);

atlasCards.forEach((card) => {
  card.style.opacity = "0";
  card.style.transition = "opacity 0.7s ease, transform 0.7s ease";
  atlasObserver.observe(card);
});
