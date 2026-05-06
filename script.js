const modes = {
  logic: {
    name: "Logic Coach",
    label: "Find weak reasoning",
    focus: "clarity, assumptions, and logical gaps",
    drills: [
      "Separate your opinion from your actual claim.",
      "Name one assumption your argument depends on.",
      "Find the weakest link before someone else does."
    ]
  },
  opponent: {
    name: "Opponent Mode",
    label: "Fight the strongest counterargument",
    focus: "pressure, objections, and defense",
    drills: [
      "Answer the strongest possible objection.",
      "Admit one fair point from the other side.",
      "Defend your claim without repeating yourself."
    ]
  },
  judge: {
    name: "Judge Mode",
    label: "Score both sides fairly",
    focus: "balance, fairness, and decision-making",
    drills: [
      "Score the claim from 1–10.",
      "Explain what evidence would change the result.",
      "Separate confidence from proof."
    ]
  },
  evidence: {
    name: "Evidence Mode",
    label: "Test proof quality",
    focus: "examples, evidence, and credibility",
    drills: [
      "Give one real example that supports your claim.",
      "Say what kind of evidence would weaken it.",
      "Replace vague proof with specific proof."
    ]
  },
  claim: {
    name: "Claim Mode",
    label: "Make the idea sharper",
    focus: "precision, wording, and structure",
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
  renderUsage();
  renderSavedSessions();
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

    const text = output.innerText.trim();

    try {
      await navigator.clipboard.writeText(text);
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
    state.savedSessions = state.savedSessions.slice(0, 5);
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
          <p>Enter a topic and choose a mode to generate your first training round.</p>
        </div>
      `;
    }

    showToast("Session cleared.");
  });
}

function updateModePreview() {
  const mode = modes[state.activeMode];
  const preview = document.querySelector("#modePreview");

  if (!preview || !mode) return;

  preview.innerHTML = `
    <span>${escapeHTML(mode.name)}</span>
    <strong>${escapeHTML(mode.label)}</strong>
    <p>This round focuses on ${escapeHTML(mode.focus)}.</p>
  `;
}

function createTrainingSession(topic, stance) {
  const output = document.querySelector("#sessionOutput");
  if (!output) return;

  const mode = modes[state.activeMode];
  const score = generateScore(topic, stance);
  const cleanTopic = escapeHTML(topic);
  const cleanStance = stance ? escapeHTML(stance) : "Not stated yet";

  state.weeklyUses += 1;
  localStorage.setItem("debatejam_weekly_uses", String(state.weeklyUses));
  renderUsage();

  output.dataset.empty = "false";
  output.innerHTML = `
    <article class="training-session">
      <div class="session-topline">
        <span>${escapeHTML(mode.name)}</span>
        <span>Score ${score}/100</span>
      </div>

      <h3 id="generatedTitle">${cleanTopic}</h3>

      <div class="session-grid">
        <div>
          <small>Your stance</small>
          <p>${cleanStance}</p>
        </div>
        <div>
          <small>Main focus</small>
          <p>${escapeHTML(mode.focus)}</p>
        </div>
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

      <div class="coach-card">
        <small>Next improvement</small>
        <p>${buildImprovement(score)}</p>
      </div>
    </article>
  `;

  showToast(`${mode.name} session generated.`);
}

function buildOpeningMove(topic, stance) {
  const claim = stance || `Take a clear position on "${topic}"`;
  return `Start with one precise claim: “${escapeHTML(claim)}.” Then support it with one reason, one example, and one limit where your claim may not apply.`;
}

function buildCounterArgument(topic) {
  return `A strong opponent would ask: “What evidence would prove that your view on ${escapeHTML(topic)} is wrong?” Prepare an answer before defending your position.`;
}

function buildImprovement(score) {
  if (score >= 82) {
    return "Your argument has a strong shape. Now improve it by naming the best counterargument fairly before you respond.";
  }

  if (score >= 68) {
    return "Your idea is usable, but it needs sharper proof. Add a concrete example and remove any vague claim that sounds true but is unsupported.";
  }

  return "Your argument needs structure first. Rewrite it as: claim → reason → evidence → counterargument → response.";
}

function generateScore(topic, stance) {
  let score = 58;

  if (topic.length > 25) score += 10;
  if (stance.length > 20) score += 12;
  if (/\bbecause\b|\bsince\b|\btherefore\b|\bevidence\b/i.test(stance)) score += 10;
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
    list.innerHTML = `<p class="muted">Saved sessions will appear here on this device.</p>`;
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
      if (!session) return;

      const output = document.querySelector("#sessionOutput");
      if (!output) return;

      output.dataset.empty = "false";
      output.innerHTML = `
        <article class="training-session">
          <div class="session-topline">
            <span>${escapeHTML(session.mode)}</span>
            <span>${escapeHTML(session.createdAt)}</span>
          </div>
          <h3 id="generatedTitle">${escapeHTML(session.title)}</h3>
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
    { threshold: 0.15 }
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
