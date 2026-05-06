document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#debateForm");
  const topicInput = document.querySelector("#topic");
  const stanceInput = document.querySelector("#stance");
  const modeButtons = document.querySelectorAll(".mode-pill");
  const useExampleBtn = document.querySelector("#useExample");
  const copyBtn = document.querySelector("#copyFeedback");
  const resetUsageBtn = document.querySelector("#resetUsage");
  const proButton = document.querySelector("#proButton");
  const usesLeftEl = document.querySelector("#usesLeft");

  const emptyState = document.querySelector("#emptyState");
  const loadingState = document.querySelector("#loadingState");
  const resultState = document.querySelector("#resultState");

  const resultMode = document.querySelector("#resultMode");
  const resultTopic = document.querySelector("#resultTopic");
  const finalScore = document.querySelector("#finalScore");
  const openingText = document.querySelector("#openingText");
  const oppositionText = document.querySelector("#oppositionText");
  const logicText = document.querySelector("#logicText");
  const counterText = document.querySelector("#counterText");
  const evidenceText = document.querySelector("#evidenceText");
  const pressureText = document.querySelector("#pressureText");
  const heroScore = document.querySelector("#heroScore");

  const STORAGE_KEY = "debateGymWeeklyUses";
  const MAX_FREE_USES = 5;

  const state = {
    activeMode: "Logic Coach",
    lastFeedback: "",
    uses: loadUses()
  };

  updateUsesUI();
  setupReveals();

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeMode = button.dataset.mode;
      modeButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      if (button.classList.contains("pro-only")) {
        showToast("Speed Practice is a Pro feature. This demo still previews the workout style.");
      }
    });
  });

  useExampleBtn.addEventListener("click", () => {
    topicInput.value = "Should schools ban phones?";
    stanceInput.value = "balanced";
    topicInput.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const topic = topicInput.value.trim() || "Should schools ban phones?";
    const stance = stanceInput.value;

    if (state.uses >= MAX_FREE_USES && state.activeMode !== "Speed Practice") {
      showToast("Free weekly limit reached. Reset the demo limit or upgrade to Pro in a real version.");
      return;
    }

    if (state.uses >= MAX_FREE_USES && state.activeMode === "Speed Practice") {
      showToast("Speed Practice is Pro-only. Previewing one demo round.");
    }

    state.uses += 1;
    saveUses(state.uses);
    updateUsesUI();

    showLoading();

    window.setTimeout(() => {
      const workout = createWorkout(topic, stance, state.activeMode);
      renderWorkout(workout);
      showToast("Workout generated. Start with the pressure question.");
    }, 650);
  });

  copyBtn.addEventListener("click", async () => {
    if (!state.lastFeedback) {
      showToast("Generate feedback first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(state.lastFeedback);
      showToast("Feedback copied.");
    } catch {
      showToast("Copy failed. Select the text manually from the results.");
    }
  });

  resetUsageBtn.addEventListener("click", () => {
    state.uses = 0;
    saveUses(0);
    updateUsesUI();
    showToast("Demo weekly limit reset.");
  });

  proButton.addEventListener("click", () => {
    showToast("Demo only: real Pro upgrades need Stripe Checkout and backend verification.");
  });

  function createWorkout(topic, stance, mode) {
    const cleanTopic = escapeHTML(topic);
    const stanceLabel = {
      support: "support",
      oppose: "oppose",
      balanced: "argue both sides of"
    }[stance] || "analyze";

    const modeAdvice = {
      "Logic Coach": {
        logic: "Watch for broad claims, single-cause explanations, and emotional examples standing in for proof. Name the exact reason your conclusion follows.",
        pressure: "What assumption must be true for your argument to work, and what would weaken that assumption?"
      },
      "Opponent": {
        logic: "Your opponent will attack the weakest bridge between your claim and impact. Strengthen the warrant before adding more examples.",
        pressure: "What is the fairest version of the other side, and why might a reasonable person believe it?"
      },
      "Judge": {
        logic: "Compare harms, benefits, tradeoffs, and uncertainty. A judge rewards balance, not just confidence.",
        pressure: "Which side wins if both sides have partly true evidence, and what standard should decide the round?"
      },
      "Evidence": {
        logic: "Separate proof from assertion. Each major claim needs data, a credible example, or a clear reason it is likely true.",
        pressure: "What exact evidence would change your mind on this topic?"
      },
      "Calm": {
        logic: "Remove loaded language. Replace attacks with charitable framing and ask one clarifying question before rebutting.",
        pressure: "How can you disagree without making the other person feel mocked, trapped, or dismissed?"
      },
      "Speed Practice": {
        logic: "Compress the claim, reason, evidence, and impact into a 30-second answer. Cut anything decorative.",
        pressure: "You have 20 seconds: state your strongest point, one proof, and one concession."
      }
    };

    const chosen = modeAdvice[mode] || modeAdvice["Logic Coach"];
    const baseScore = 72 + Math.floor(Math.random() * 21);
    const score = mode === "Speed Practice" ? Math.min(96, baseScore + 3) : baseScore;

    const opening = `To ${stanceLabel} “${cleanTopic},” start with one clear claim, then give one reason, one concrete example, and one impact. Avoid opening with a long history lesson. Your first sentence should tell listeners exactly what you believe.`;

    const opposition = `The strongest opposing argument is not the loudest one. It likely focuses on unintended consequences, fairness, freedom, cost, enforcement, or edge cases that your side may be minimizing.`;

    const counter = `Answer the best objection by conceding one fair point, narrowing your claim, then showing why your side still creates the better overall outcome.`;

    const evidence = `Add at least one source type: a study, expert report, real-world example, survey, court case, school policy result, or measurable outcome. Label what the evidence proves and what it does not prove.`;

    const feedback = [
      `Debate Gym Workout`,
      `Topic: ${topic}`,
      `Mode: ${mode}`,
      `Score: ${score}`,
      ``,
      `Opening: ${stripHTML(opening)}`,
      `Opposition: ${stripHTML(opposition)}`,
      `Logic: ${chosen.logic}`,
      `Counterargument: ${counter}`,
      `Evidence: ${evidence}`,
      `Pressure Question: ${chosen.pressure}`
    ].join("\n");

    return {
      topic: cleanTopic,
      mode,
      score,
      opening,
      opposition,
      logic: chosen.logic,
      counter,
      evidence,
      pressure: chosen.pressure,
      feedback
    };
  }

  function renderWorkout(workout) {
    resultMode.textContent = workout.mode;
    resultTopic.textContent = workout.topic;
    finalScore.textContent = workout.score;
    heroScore.textContent = workout.score;

    openingText.innerHTML = workout.opening;
    oppositionText.textContent = workout.opposition;
    logicText.textContent = workout.logic;
    counterText.textContent = workout.counter;
    evidenceText.textContent = workout.evidence;
    pressureText.textContent = workout.pressure;

    state.lastFeedback = workout.feedback;

    loadingState.classList.add("hidden");
    emptyState.classList.add("hidden");
    resultState.classList.remove("hidden");
  }

  function showLoading() {
    emptyState.classList.add("hidden");
    resultState.classList.add("hidden");
    loadingState.classList.remove("hidden");
  }

  function loadUses() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved.count !== "number") return 0;

      const savedDate = new Date(saved.date);
      const now = new Date();
      const daysSince = Math.floor((now - savedDate) / (1000 * 60 * 60 * 24));

      return daysSince >= 7 ? 0 : saved.count;
    } catch {
      return 0;
    }
  }

  function saveUses(count) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      count,
      date: new Date().toISOString()
    }));
  }

  function updateUsesUI() {
    const usesLeft = Math.max(0, MAX_FREE_USES - state.uses);
    usesLeftEl.textContent = usesLeft;
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 3300);
  }

  function setupReveals() {
    const revealEls = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => observer.observe(el));
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function stripHTML(value) {
    const div = document.createElement("div");
    div.innerHTML = value;
    return div.textContent || div.innerText || "";
  }
});
