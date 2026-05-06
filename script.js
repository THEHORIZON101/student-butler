const modes = {
  logic: {
    name: "Logic Coach",
    short: "Logic",
    label: "Find weak reasoning",
    focus: "clarity, assumptions, and logical gaps",
    accent: "01",
    drills: [
      "Separate your opinion from your actual claim.",
      "Name one assumption your argument depends on.",
      "Find the weakest link before someone else does."
    ]
  },
  opponent: {
    name: "Opponent Mode",
    short: "Opponent",
    label: "Pressure-test the claim",
    focus: "objections, defense, and calm responses",
    accent: "02",
    drills: [
      "Answer the strongest possible objection.",
      "Admit one fair point from the other side.",
      "Defend your claim without repeating yourself."
    ]
  },
  judge: {
    name: "Judge Mode",
    short: "Judge",
    label: "Score both sides fairly",
    focus: "balance, fairness, and decision-making",
    accent: "03",
    drills: [
      "Score the claim from 1–10.",
      "Explain what evidence would change the result.",
      "Separate confidence from proof."
    ]
  },
  evidence: {
    name: "Evidence Mode",
    short: "Evidence",
    label: "Test proof quality",
    focus: "examples, evidence, and credibility",
    accent: "04",
    drills: [
      "Give one real example that supports your claim.",
      "Say what kind of evidence would weaken it.",
      "Replace vague proof with specific proof."
    ]
  },
  claim: {
    name: "Claim Mode",
    short: "Claim",
    label: "Make the idea sharper",
    focus: "precision, wording, and structure",
    accent: "05",
    drills: [
      "Rewrite your topic as one clear claim.",
      "Remove emotional wording.",
      "Make the claim specific enough to debate."
    ]
  }
};

const sampleTopics = [
  "Schools should limit phone use during class.",
  "AI tools make students better thinkers.",
  "Homework should be optional.",
  "Social media does more harm than good.",
  "College should not be required for most careers.",
  "Competitive sports build better discipline."
];

const state = {
  activeMode: "logic",
  weeklyUses: Number(localStorage.getItem("debatejam_weekly_uses")) || 0,
  savedSessions: loadSessions()
};

document.addEventListener("DOMContentLoaded", () => {
  bindModeButtons();
  bindDemoForm();
  bindSampleButton();
  bindCopyButton();
  bindSaveButton();
  bindResetButton();
  bindSavedClearButton();
  bindMagneticButtons();
  renderUsage();
  renderSavedSessions();
  updateModePreview();
  revealOnScroll();
});

function bindModeButtons() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeMode = button.dataset.mode;

      document.querySelectorAll("[data-mode]").forEach((item) => {
        item.classList.toggle("is-active", item.dataset.mode === state.activeMode);
      });

      updateModePreview();
      showToast(`${modes[state.activeMode].name} selected.`);
    });
  });
}

function bindDemoForm() {
  const form = document.querySelector("#debateForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const topicInput = document.querySelector("#topicInput");
    const stanceInput = document.querySelector("#stanceInput");

    const topic = topicInput.value.trim();
    const stance = stanceInput.value.trim();

    if (!topic) {
      showToast("Add a topic first.");
      topicInput.focus();
      return;
    }

    createTrainingSession(topic, stance);
  });
}

function bindSampleButton() {
  const button = document.querySelector("#sampleTopicBtn");
  const topicInput = document.querySelector("#topicInput");

  if (!button || !topicInput) return;

  button.addEventListener("click", () => {
    const randomTopic = sampleTopics[Math.floor(Math.random() * sampleTopics.length)];
    topicInput.value = randomTopic;
    topicInput.focus();
    showToast("Sample topic added.");
  });
}

function bindCopyButton() {
  const button = document.querySelector("#copySessionBtn");
  if (!button) return;

  button.addEventListener("click", async () => {
    const output = document.querySelector("#sessionOutput");

    if (!output || output.dataset.empty === "true") {
      showToast("Generate a session first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(output.innerText.trim());
      showToast("Session copied.");
    } catch {
      showToast("Copy failed. Select the text manually.");
    }
  });
}

function bindSaveButton() {
  const button = document.querySelector("#saveSessionBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    const output = document.querySelector("#sessionOutput");

    if (!output || output.dataset.empty === "true") {
      showToast("Generate a session first.");
      return;
    }

    const session = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      mode: modes[state.activeMode].name,
      title: document.querySelector("#generatedTitle")?.textContent || "DebateJam Session",
      summary: output.innerText.trim(),
      createdAt: new Date().toLocaleDateString()
    };

    state.savedSessions.unshift(session);
    state.savedSessions = state.savedSessions.slice(0, 6);

    localStorage.setItem("debatejam_sessions", JSON.stringify(state.savedSessions));
    renderSavedSessions();
    showToast("Session saved on this device.");
  });
}

function bindResetButton() {
  const button = document.querySelector("#resetSessionBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    const form = document.querySelector("#debateForm");
    const output = document.querySelector("#sessionOutput");

    if (form) form.reset();

    if (output) {
      output.dataset.empty = "true";
      output.innerHTML = `
        <div class="empty-state">
          <span>Debate arena waiting</span>
          <p>Enter a topic, choose a mode, and generate a clean training round.</p>
        </div>
      `;
    }

    showToast("Session cleared.");
  });
}

function bindSavedClearButton() {
  const button = document.querySelector("#clearSavedBtn");
  if (!button) return;

  button.addEventListener("click", () => {
    state.savedSessions = [];
    localStorage.removeItem("debatejam_sessions");
    renderSavedSessions();
    showToast("Saved sessions cleared.");
  });
}

function bindMagneticButtons() {
  const buttons = document.querySelectorAll(".btn, .mode-btn, .saved-session");

  buttons.forEach((button) => {
    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      button.style.transform = `translate(${x * 0.035}px, ${y * 0.035}px)`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.transform = "";
    });
  });
}

function updateModePreview() {
  const mode = modes[state.activeMode];
  const preview = document.querySelector("#modePreview");
  const modeTitle = document.querySelector("#modePreviewTitle");
  const modeText = document.querySelector("#modePreviewText");
  const modeNumber = document.querySelector("#modePreviewNumber");

  if (!mode) return;

  if (preview) {
    preview.innerHTML = `
      <span class="eyebrow">${escapeHTML(mode.name)}</span>
      <strong>${escapeHTML(mode.label)}</strong>
      <p>This round focuses on ${escapeHTML(mode.focus)}.</p>
    `;
  }

  if (modeTitle) modeTitle.textContent = mode.label;
  if (modeText) modeText.textContent = `Focus: ${mode.focus}.`;
  if (modeNumber) modeNumber.textContent = mode.accent;
}

function createTrainingSession(topic, stance) {
  const output = document.querySelector("#sessionOutput");
  if (!output) return;

  const mode = modes[state.activeMode];
  const score = generateScore(topic, stance);
  const verdict = buildVerdict(score);

  state.weeklyUses += 1;
  localStorage.setItem("debatejam_weekly_uses", String(state.weeklyUses));
  renderUsage();

  output.dataset.empty = "false";
  output.innerHTML = `
    <article class="training-session">
      <div class="session-hero">
        <span class="session-number">${escapeHTML(mode.accent)}</span>
        <div>
          <span class="eyebrow">${escapeHTML(mode.name)}</span>
          <h3 id="generatedTitle">${escapeHTML(topic)}</h3>
        </div>
      </div>

      <div class="score-row">
        <div>
          <small>Argument score</small>
          <strong>${score}/100</strong>
        </div>
        <div>
          <small>Verdict</small>
          <strong>${escapeHTML(verdict)}</strong>
        </div>
      </div>

      <div class="coach-card">
        <small>Your stance</small>
        <p>${stance ? escapeHTML(stance) : "No stance entered yet. Start by turning the topic into one clear claim."}</p>
      </div>

      <div class="coach-card">
        <small>Opening move</small>
        <p>${buildOpeningMove(topic, stance)}</p>
      </div>

      <div class="coach-card">
        <small>Counterpressure</small>
        <p>${buildCounterArgument(topic)}</p>
      </div>

      <div class="coach-card">
        <small>Coach drills</small>
        <ul>
          ${mode.drills.map((drill) => `<li>${escapeHTML(drill)}</li>`).join("")}
        </ul>
      </div>

      <div class="coach-card final-note">
        <small>Next improvement</small>
        <p>${buildImprovement(score)}</p>
      </div>
    </article>
  `;

  output.animate(
    [
      { opacity: 0, transform: "translateY(16px)" },
      { opacity: 1, transform: "translateY(0)" }
    ],
    { duration: 420, easing: "ease-out" }
  );

  showToast(`${mode.name} session generated.`);
}

function buildOpeningMove(topic, stance) {
  const claim = stance || `I believe ${topic}`;
  return `Open with: “${escapeHTML(claim)}.” Then add one reason, one example, and one limit where the claim may not apply.`;
}

function buildCounterArgument(topic) {
  return `A strong opponent would ask: “What evidence would make your view on ${escapeHTML(topic)} weaker or false?” Prepare that answer before defending your point.`;
}

function buildImprovement(score) {
  if (score >= 82) {
    return "Your argument has a strong shape. Now improve it by naming the best counterargument fairly before responding.";
  }

  if (score >= 68) {
    return "Your idea is usable, but it needs sharper proof. Add one concrete example and remove any vague claim that sounds true but is unsupported.";
  }

  return "Your argument needs structure first. Rewrite it as: claim → reason → evidence → counterargument → response.";
}

function buildVerdict(score) {
  if (score >= 82) return "Strong";
  if (score >= 68) return "Promising";
  return "Needs structure";
}

function generateScore(topic, stance) {
  let score = 56;

  if (topic.length > 24) score += 8;
  if (stance.length > 20) score += 12;
  if (/\bbecause\b|\bsince\b|\btherefore\b|\bevidence\b|\bexample\b/i.test(stance)) score += 12;
  if (/\balways\b|\bnever\b|\beveryone\b|\bnobody\b/i.test(stance)) score -= 8;

  return Math.max(42, Math.min(96, score));
}

function renderUsage() {
  const usageText = document.querySelector("#usageText");
  const usageBar = document.querySelector("#usageBar");

  const freeLimit = 5;
  const used = Math.min(state.weeklyUses, freeLimit);
  const percentage = (used / freeLimit) * 100;

  if (usageText) {
    usageText.textContent = `${used}/${freeLimit} free weekly practices used`;
  }

  if (usageBar) {
    usageBar.style.width = `${percentage}%`;
  }
}

function renderSavedSessions() {
  const list = document.querySelector("#savedSessions");
  if (!list) return;

  if (!state.savedSessions.length) {
    list.innerHTML = `
      <p class="muted">Saved sessions will appear here on this device.</p>
    `;
    return;
  }

  list.innerHTML = state.savedSessions
    .map(
      (session) => `
        <button class="saved-session" type="button" data-session-id="${escapeHTML(session.id)}">
          <span>${escapeHTML(session.mode)}</span>
          <strong>${escapeHTML(session.title)}</strong>
          <small>${escapeHTML(session.createdAt)}</small>
        </button>
      `
    )
    .join("");

  list.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const session = state.savedSessions.find((item) => item.id === button.dataset.sessionId);
      const output = document.querySelector("#sessionOutput");

      if (!session || !output) return;

      output.dataset.empty = "false";
      output.innerHTML = `
        <article class="training-session">
          <div class="session-hero">
            <span class="session-number">S</span>
            <div>
              <span class="eyebrow">${escapeHTML(session.mode)}</span>
              <h3 id="generatedTitle">${escapeHTML(session.title)}</h3>
            </div>
          </div>
          <pre class="session-note">${escapeHTML(session.summary)}</pre>
        </article>
      `;

      showToast("Saved session opened.");
    });
  });
}

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem("debatejam_sessions")) || [];
  } catch {
    return [];
  }
}

function revealOnScroll() {
  const items = document.querySelectorAll("[data-reveal]");

  if (!items.length || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  items.forEach((item) => observer.observe(item));
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
