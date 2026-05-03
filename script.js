(() => {
  "use strict";

  const STORAGE_KEYS = {
    theme: "orbit.theme",
    card: "orbit.tonightCard",
    usage: "orbit.weeklyUsage",
    pricing: "orbit.pricingInterest"
  };

  const sampleMess = `- algebra worksheet p. 42 problems 1-18 due tomorrow
- English essay intro paragraph and thesis
- biology quiz Friday, review cell notes and vocab
- history read chapter 8 and answer 5 questions
- Spanish vocab practice
- pack permission slip for tomorrow`;

  const subjectRules = [
    {
      name: "Math",
      keywords: ["math", "algebra", "geometry", "calculus", "equation", "graph", "fraction", "worksheet", "problem", "problems"]
    },
    {
      name: "English",
      keywords: ["english", "essay", "reading", "novel", "book", "literature", "annotation", "draft", "thesis", "paragraph"]
    },
    {
      name: "Science",
      keywords: ["science", "biology", "bio", "chemistry", "chem", "physics", "lab", "experiment", "cell", "vocab"]
    },
    {
      name: "History",
      keywords: ["history", "social studies", "government", "civics", "chapter", "timeline", "source"]
    },
    {
      name: "Language",
      keywords: ["spanish", "french", "german", "latin", "language", "vocabulary", "conjugation", "vocab"]
    }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const dom = {
    menuToggle: $("#menuToggle"),
    navLinks: $("#navLinks"),
    themeToggle: $("#themeToggle"),

    planInput: $("#planInput"),
    sampleInput: $("#sampleInput"),
    clearInput: $("#clearInput"),
    generatePlan: $("#generatePlan"),
    inputHint: $("#inputHint"),
    usageCount: $("#usageCount"),

    resultEmpty: $("#resultEmpty"),
    resultContent: $("#resultContent"),
    subjectList: $("#subjectList"),
    priorityList: $("#priorityList"),
    totalTime: $("#totalTime"),
    firstActionText: $("#firstActionText"),
    reviewQueue: $("#reviewQueue"),
    focusPlan: $("#focusPlan"),
    dynamicFiveAction: $("#dynamicFiveAction"),

    orbitCard: $("#orbitCard"),
    cardChecklist: $("#cardChecklist"),
    cardProgressRing: $("#cardProgressRing"),
    cardProgressValue: $("#cardProgressValue"),
    copyPlan: $("#copyPlan"),
    clearSavedPlan: $("#clearSavedPlan"),
    saveStatus: $("#saveStatus"),
    topTaskBadge: $("#topTaskBadge"),
    activeSubjectBadge: $("#activeSubjectBadge"),
    generatedDate: $("#generatedDate"),

    pricingModal: $("#pricingModal"),
    modalTitle: $("#modalTitle"),
    modalText: $("#modalText"),
    saveInterest: $("#saveInterest"),
    interestStatus: $("#interestStatus"),
    pricingInterestStatus: $("#pricingInterestStatus")
  };

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  let currentCard = null;
  let selectedPricingPlan = "";
  let lastFocusedElement = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindTheme();
    bindNavigation();
    bindPlannerDemo();
    bindPricingModal();
    hydrateSavedPlan();
    updateUsageText();
    updatePricingInterestText();
    revealOnScroll();
  }

  function bindTheme() {
    if (!dom.themeToggle) return;

    const savedTheme = storage.get(STORAGE_KEYS.theme, null);
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    const initialTheme = savedTheme || (prefersLight ? "light" : "dark");

    applyTheme(initialTheme);

    dom.themeToggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      storage.set(STORAGE_KEYS.theme, nextTheme);
    });
  }

  function applyTheme(theme) {
    const safeTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = safeTheme;

    if (dom.themeToggle) {
      dom.themeToggle.textContent = safeTheme === "light" ? "Dark" : "Light";
      dom.themeToggle.setAttribute(
        "aria-label",
        safeTheme === "light" ? "Switch to dark mode" : "Switch to light mode"
      );
    }
  }

  function bindNavigation() {
    if (!dom.menuToggle || !dom.navLinks) return;

    dom.menuToggle.addEventListener("click", () => {
      const isOpen = dom.navLinks.classList.toggle("is-open");
      dom.menuToggle.setAttribute("aria-expanded", String(isOpen));
      dom.menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    });

    $$("#navLinks a").forEach((link) => {
      link.addEventListener("click", () => {
        dom.navLinks.classList.remove("is-open");
        dom.menuToggle.setAttribute("aria-expanded", "false");
        dom.menuToggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  function bindPlannerDemo() {
    if (!dom.planInput || !dom.generatePlan) return;

    dom.sampleInput?.addEventListener("click", () => {
      dom.planInput.value = sampleMess;
      setHint("Sample mess loaded. You can edit it or generate the plan.", "success");
      dom.planInput.focus();
    });

    dom.clearInput?.addEventListener("click", () => {
      dom.planInput.value = "";
      setHint("Cleared. Paste a few assignments to build a new plan.", "neutral");
      dom.planInput.focus();
    });

    dom.generatePlan.addEventListener("click", handleGeneratePlan);

    dom.planInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleGeneratePlan();
      }
    });

    dom.copyPlan?.addEventListener("click", copyCurrentPlan);
    dom.clearSavedPlan?.addEventListener("click", clearSavedCard);
  }

  function handleGeneratePlan() {
    const text = dom.planInput.value.trim();

    if (!text) {
      setHint("Paste at least one assignment, reminder, or note before generating.", "warn");
      dom.planInput.focus();
      return;
    }

    const plan = buildPlan(text);
    const checked = new Array(plan.checklist.length).fill(false);

    renderPlan(plan);
    renderOrbitCard(plan, checked);
    saveCard(plan, checked);
    markPlanUsed();

    setHint("Plan generated locally. Nothing was uploaded or sent to a server.", "success");

    dom.resultContent?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  function buildPlan(text) {
    const lines = normalizeLines(text);
    const tasks = lines.map((line, index) => createTask(line, index)).sort(sortByPriority);

    if (!tasks.length) {
      tasks.push(createTask("General study review for tonight", 0));
    }

    const subjects = unique(tasks.map((task) => task.subject));
    const totalTime = roundToNearestFive(tasks.reduce((sum, task) => sum + task.minutes, 0));
    const firstAction = buildFirstAction(tasks[0]);
    const reviewQueue = buildReviewQueue(tasks);
    const focusPlan = buildFocusPlan(tasks, totalTime);
    const checklist = buildChecklist(tasks, firstAction, reviewQueue);

    return {
      id: `orbit-${Date.now()}`,
      createdAt: new Date().toISOString(),
      subjects,
      tasks,
      totalTime,
      firstAction,
      reviewQueue,
      focusPlan,
      checklist
    };
  }

  function normalizeLines(text) {
    let lines = text
      .replace(/\r/g, "\n")
      .replace(/[•●]/g, "\n")
      .split(/\n|;/)
      .map(cleanLine)
      .filter(Boolean);

    if (lines.length === 1 && lines[0].length > 100) {
      lines = lines[0]
        .split(/\.\s+|\?\s+|!\s+/)
        .map(cleanLine)
        .filter(Boolean);
    }

    return lines.slice(0, 12);
  }

  function cleanLine(line) {
    return line
      .replace(/^\s*[-*–—\d.)]+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function createTask(line, index) {
    const lower = line.toLowerCase();
    const subject = inferSubject(lower);
    const reasons = [];
    let score = 20 + Math.max(0, 8 - index);
    let minutes = 20;

    if (/(due|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday)/i.test(lower)) {
      score += 38;
      minutes += 5;
      reasons.push("due soon");
    }

    if (/(quiz|test|exam|assessment)/i.test(lower)) {
      score += 34;
      minutes += 18;
      reasons.push("review risk");
    }

    if (/(worksheet|packet|problem|problems|questions|exercise)/i.test(lower)) {
      score += 20;
      minutes += 14;
      reasons.push("work block");
    }

    if (/(essay|draft|project|presentation|lab report|slides)/i.test(lower)) {
      score += 24;
      minutes += 24;
      reasons.push("deep work");
    }

    if (/(read|chapter|pages|p\.)/i.test(lower)) {
      score += 10;
      minutes += 12;
      reasons.push("reading");
    }

    if (/(study|review|vocab|vocabulary|flashcards|notes)/i.test(lower)) {
      score += 16;
      minutes += 10;
      reasons.push("review");
    }

    if (/(missing|late|redo|make up|makeup|finish)/i.test(lower)) {
      score += 24;
      minutes += 12;
      reasons.push("unfinished");
    }

    if (/(quick|easy|short|small)/i.test(lower)) {
      minutes -= 8;
      score += 4;
      reasons.push("quick win");
    }

    minutes += estimateVolumeMinutes(lower);
    minutes = clamp(roundToNearestFive(minutes), 10, 80);

    if (!reasons.length) reasons.push("momentum");

    return {
      id: `task-${index}-${hashString(line)}`,
      title: shorten(line, 92),
      subject,
      score,
      minutes,
      reasons: unique(reasons).slice(0, 3)
    };
  }

  function inferSubject(lowerLine) {
    let best = {
      name: "General",
      hits: 0
    };

    subjectRules.forEach((rule) => {
      const hits = rule.keywords.reduce((count, keyword) => {
        return lowerLine.includes(keyword) ? count + 1 : count;
      }, 0);

      if (hits > best.hits) {
        best = {
          name: rule.name,
          hits
        };
      }
    });

    return best.hits ? best.name : "General";
  }

  function estimateVolumeMinutes(lowerLine) {
    let extra = 0;

    const pageRange = lowerLine.match(/(?:page|pages|p\.)\s*(\d+)\s*[-–]\s*(\d+)/);
    if (pageRange) {
      const start = Number(pageRange[1]);
      const end = Number(pageRange[2]);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        extra += Math.min(25, Math.ceil((end - start) / 2));
      }
    }

    const itemCount = lowerLine.match(/(\d+)\s*(problems|questions|terms|flashcards)/);
    if (itemCount) {
      const count = Number(itemCount[1]);
      if (Number.isFinite(count)) {
        extra += Math.min(25, Math.ceil(count / 3));
      }
    }

    return extra;
  }

  function sortByPriority(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return b.minutes - a.minutes;
  }

  function buildFirstAction(topTask) {
    const subjectPhrase = topTask.subject === "General" ? "your top assignment" : `${topTask.subject} materials`;
    return `Set a 5-minute timer, open ${subjectPhrase}, and complete the smallest visible step for “${topTask.title}.”`;
  }

  function buildReviewQueue(tasks) {
    const explicitReviewTasks = tasks.filter((task) =>
      /(quiz|test|exam|study|review|vocab|vocabulary|notes|flashcards)/i.test(task.title)
    );

    const queue = explicitReviewTasks.slice(0, 3).map((task) => {
      return `Review ${task.subject}: ${shorten(task.title, 64)}`;
    });

    const subjectBackups = unique(tasks.map((task) => task.subject))
      .filter((subject) => subject !== "General")
      .slice(0, 3);

    subjectBackups.forEach((subject) => {
      if (queue.length < 3) {
        queue.push(`Check ${subject}: redo one hard example or summarize the main idea.`);
      }
    });

    if (!queue.length) {
      queue.push("Do a 7-minute review of the hardest item from tonight.");
      queue.push("Write one question to ask tomorrow if anything is unclear.");
    }

    return queue.slice(0, 3);
  }

  function buildFocusPlan(tasks, totalTime) {
    const topTasks = tasks.slice(0, 3);
    const plan = ["5 min — reset desk, put phone away, and open the first task"];

    topTasks.forEach((task, index) => {
      const blockLength = clamp(task.minutes, 15, 30);
      plan.push(`${blockLength} min — ${task.subject}: ${shorten(task.title, 58)}`);

      if (index < topTasks.length - 1) {
        plan.push("5 min — stand up, water break, then return");
      }
    });

    if (totalTime > 75) {
      plan.push("10 min — review queue only, no perfection pass");
    } else {
      plan.push("7 min — review queue and check tomorrow’s materials");
    }

    plan.push("3 min — pack finished work and write the next school-day reminder");

    return plan;
  }

  function buildChecklist(tasks, firstAction, reviewQueue) {
    const checklist = [
      {
        label: "Clear one workspace surface and move your phone out of reach.",
        meta: "2 min"
      },
      {
        label: firstAction,
        meta: "5 min"
      }
    ];

    tasks.slice(0, 3).forEach((task, index) => {
      checklist.push({
        label: `${index === 0 ? "Finish the first focus block" : "Move to the next block"}: ${task.title}`,
        meta: `${clamp(task.minutes, 15, 30)} min`
      });
    });

    checklist.push({
      label: reviewQueue[0] || "Review the hardest item from tonight.",
      meta: "7 min"
    });

    checklist.push({
      label: "Pack materials for tomorrow and close the plan.",
      meta: "3 min"
    });

    return checklist.slice(0, 7);
  }

  function renderPlan(plan) {
    if (dom.resultEmpty) dom.resultEmpty.hidden = true;
    if (dom.resultContent) dom.resultContent.hidden = false;

    if (dom.totalTime) dom.totalTime.textContent = `${plan.totalTime} min`;
    if (dom.firstActionText) dom.firstActionText.textContent = plan.firstAction;
    if (dom.dynamicFiveAction) dom.dynamicFiveAction.textContent = plan.firstAction;

    replaceWithChips(dom.subjectList, plan.subjects);
    renderPriorityList(plan.tasks);
    replaceWithList(dom.reviewQueue, plan.reviewQueue);
    replaceWithList(dom.focusPlan, plan.focusPlan);
  }

  function replaceWithChips(container, items) {
    if (!container) return;

    container.replaceChildren();

    items.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = item;
      container.appendChild(chip);
    });
  }

  function replaceWithList(container, items) {
    if (!container) return;

    container.replaceChildren();

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      container.appendChild(li);
    });
  }

  function renderPriorityList(tasks) {
    if (!dom.priorityList) return;

    dom.priorityList.replaceChildren();

    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.className = "priority-item";

      const priorityIndex = document.createElement("span");
      priorityIndex.className = "priority-index";
      priorityIndex.textContent = String(index + 1).padStart(2, "0");

      const main = document.createElement("div");
      main.className = "priority-main";

      const title = document.createElement("strong");
      title.textContent = task.title;

      const meta = document.createElement("span");
      meta.textContent = `${task.subject} · ${priorityLabel(task.score)}`;

      const reasonWrap = document.createElement("div");
      reasonWrap.className = "priority-reasons";

      task.reasons.forEach((reason) => {
        const reasonChip = document.createElement("span");
        reasonChip.className = "reason-chip";
        reasonChip.textContent = reason;
        reasonWrap.appendChild(reasonChip);
      });

      main.append(title, meta, reasonWrap);

      const time = document.createElement("div");
      time.className = "priority-time";

      const minutes = document.createElement("span");
      minutes.textContent = `${task.minutes}`;

      const label = document.createElement("small");
      label.textContent = "min";

      time.append(minutes, label);
      li.append(priorityIndex, main, time);
      dom.priorityList.appendChild(li);
    });
  }

  function renderOrbitCard(plan, checked) {
    if (!dom.orbitCard || !dom.cardChecklist) return;

    currentCard = {
      plan,
      checked: plan.checklist.map((_, index) => Boolean(checked[index]))
    };

    dom.orbitCard.hidden = false;
    if (dom.topTaskBadge) dom.topTaskBadge.textContent = plan.tasks[0] ? `Top: ${plan.tasks[0].subject}` : "Top task";
    if (dom.activeSubjectBadge) dom.activeSubjectBadge.textContent = plan.subjects.join(", ");
    if (dom.generatedDate) dom.generatedDate.textContent = formatDate(plan.createdAt);

    dom.cardChecklist.replaceChildren();

    plan.checklist.forEach((item, index) => {
      const li = document.createElement("li");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `orbit-check-${index}`;
      checkbox.checked = Boolean(currentCard.checked[index]);

      const label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = item.label;

      const meta = document.createElement("span");
      meta.className = "check-meta";
      meta.textContent = item.meta;

      checkbox.addEventListener("change", () => {
        currentCard.checked[index] = checkbox.checked;
        saveCard(currentCard.plan, currentCard.checked);
        updateCardProgress();
        setSaveStatus("Progress saved locally in this browser.", "success");
      });

      li.append(checkbox, label, meta);
      dom.cardChecklist.appendChild(li);
    });

    updateCardProgress();
  }

  function updateCardProgress() {
    if (!currentCard || !currentCard.plan) return;

    const total = currentCard.plan.checklist.length;
    const done = currentCard.checked.filter(Boolean).length;
    const percent = total ? Math.round((done / total) * 100) : 0;

    if (dom.cardProgressValue) dom.cardProgressValue.textContent = `${percent}%`;
    if (dom.cardProgressRing) {
      dom.cardProgressRing.style.setProperty("--progress", `${percent * 3.6}deg`);
      dom.cardProgressRing.setAttribute("aria-label", `Checklist progress ${percent} percent`);
    }
  }

  function saveCard(plan, checked) {
    const saved = storage.set(STORAGE_KEYS.card, {
      plan,
      checked,
      savedAt: new Date().toISOString()
    });

    if (saved) {
      setSaveStatus("Tonight Orbit Card saved locally.", "success");
    } else {
      setSaveStatus("Plan generated, but local saving is unavailable in this browser.", "warn");
    }
  }

  function hydrateSavedPlan() {
    const saved = storage.get(STORAGE_KEYS.card, null);

    if (!saved || !saved.plan || !Array.isArray(saved.plan.tasks)) return;

    renderPlan(saved.plan);
    renderOrbitCard(saved.plan, saved.checked || []);
    setHint("Loaded your last local Orbit Card. Generate a new plan anytime.", "success");
  }

  function clearSavedCard() {
    storage.remove(STORAGE_KEYS.card);
    currentCard = null;

    if (dom.orbitCard) dom.orbitCard.hidden = true;
    if (dom.cardChecklist) dom.cardChecklist.replaceChildren();
    if (dom.cardProgressValue) dom.cardProgressValue.textContent = "0%";
    if (dom.cardProgressRing) dom.cardProgressRing.style.setProperty("--progress", "0deg");

    setSaveStatus("Saved Orbit Card cleared from this browser.", "success");
  }

  async function copyCurrentPlan() {
    if (!currentCard || !currentCard.plan) {
      setSaveStatus("Generate a plan before copying.", "warn");
      return;
    }

    const text = formatPlanForCopy(currentCard.plan);
    const copied = await copyText(text);

    if (copied) {
      setSaveStatus("Plan copied to clipboard.", "success");
    } else {
      setSaveStatus("Clipboard unavailable. Select the generated plan text manually.", "warn");
    }
  }

  function formatPlanForCopy(plan) {
    const lines = [
      `Orbit Study Plan — ${formatDate(plan.createdAt)}`,
      "",
      `Detected subjects: ${plan.subjects.join(", ")}`,
      `Estimated time: ${plan.totalTime} minutes`,
      "",
      "Priority order:"
    ];

    plan.tasks.forEach((task, index) => {
      lines.push(`${index + 1}. ${task.subject} — ${task.title} (${task.minutes} min)`);
    });

    lines.push("", `First 5-minute action: ${plan.firstAction}`);
    lines.push("", "Review queue:");
    plan.reviewQueue.forEach((item) => lines.push(`- ${item}`));

    lines.push("", "Quick focus plan:");
    plan.focusPlan.forEach((item) => lines.push(`- ${item}`));

    lines.push("", "Tonight Orbit Card:");
    plan.checklist.forEach((item) => lines.push(`- [ ] ${item.label} (${item.meta})`));

    return lines.join("\n");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return fallbackCopy(text);
      }
    }

    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    textarea.remove();
    return copied;
  }

  function bindPricingModal() {
    $$(".pricing-action").forEach((button) => {
      button.addEventListener("click", () => {
        openPricingModal(button.dataset.plan || "Orbit");
      });
    });

    $$("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", closePricingModal);
    });

    dom.saveInterest?.addEventListener("click", () => {
      if (!selectedPricingPlan) return;

      const saved = storage.set(STORAGE_KEYS.pricing, {
        plan: selectedPricingPlan,
        savedAt: new Date().toISOString()
      });

      if (saved) {
        dom.interestStatus.textContent = `${selectedPricingPlan} interest saved locally. No payment was made.`;
        dom.interestStatus.className = "save-status success";
        updatePricingInterestText();
      } else {
        dom.interestStatus.textContent = "Local saving is unavailable in this browser.";
        dom.interestStatus.className = "save-status warn";
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && dom.pricingModal && !dom.pricingModal.hidden) {
        closePricingModal();
      }
    });
  }

  function openPricingModal(planName) {
    if (!dom.pricingModal || !dom.modalTitle || !dom.modalText) return;

    selectedPricingPlan = planName;
    lastFocusedElement = document.activeElement;

    dom.modalTitle.textContent = `${planName} is coming soon`;

    if (planName === "Free") {
      dom.modalText.textContent =
        "The Free plan would include 3 study plans per week, basic planning, and local progress. This static demo already lets you try the core planning flow.";
    } else if (planName === "Orbit Plus") {
      dom.modalText.textContent =
        "Orbit Plus would add unlimited study plans, saved study history, better review tools, focus mode, and weekly summaries. Real subscriptions require a backend and payment provider.";
    } else {
      dom.modalText.textContent =
        "Orbit Pro would support deeper planning, advanced review queues, priority support, and future AI extraction plus image/PDF tools. Those future features are not faked in this static site.";
    }

    if (dom.interestStatus) {
      dom.interestStatus.textContent = "";
      dom.interestStatus.className = "save-status";
    }

    dom.pricingModal.hidden = false;
    document.body.classList.add("modal-open");

    const modalPanel = $(".modal-panel", dom.pricingModal);
    if (modalPanel) {
      window.setTimeout(() => modalPanel.focus(), 0);
    }
  }

  function closePricingModal() {
    if (!dom.pricingModal) return;

    dom.pricingModal.hidden = true;
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function updatePricingInterestText() {
    if (!dom.pricingInterestStatus) return;

    const interest = storage.get(STORAGE_KEYS.pricing, null);

    if (!interest || !interest.plan) {
      dom.pricingInterestStatus.textContent =
        "No pricing interest saved. Buttons above only open a coming-soon message.";
      dom.pricingInterestStatus.className = "pricing-interest";
      return;
    }

    dom.pricingInterestStatus.textContent =
      `Saved locally: interested in ${interest.plan}. This is not a subscription or payment.`;
    dom.pricingInterestStatus.className = "pricing-interest success";
  }

  function markPlanUsed() {
    const week = getWeekKey();
    const usage = storage.get(STORAGE_KEYS.usage, {
      week,
      count: 0
    });

    const nextUsage = usage.week === week
      ? { week, count: usage.count + 1 }
      : { week, count: 1 };

    storage.set(STORAGE_KEYS.usage, nextUsage);
    updateUsageText();
  }

  function updateUsageText() {
    if (!dom.usageCount) return;

    const week = getWeekKey();
    const usage = storage.get(STORAGE_KEYS.usage, {
      week,
      count: 0
    });

    const count = usage.week === week ? usage.count : 0;

    dom.usageCount.textContent =
      `Local demo plans this week: ${count}. Free plan preview: 3/week in a real product; this static demo does not charge or block you.`;
  }

  function getWeekKey(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;

    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

    return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }

  function revealOnScroll() {
    const items = $$(".reveal");

    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12
      }
    );

    items.forEach((item) => observer.observe(item));
  }

  function setHint(message, type) {
    if (!dom.inputHint) return;

    dom.inputHint.textContent = message;
    dom.inputHint.className = type && type !== "neutral"
      ? `input-hint ${type}`
      : "input-hint";
  }

  function setSaveStatus(message, type) {
    if (!dom.saveStatus) return;

    dom.saveStatus.textContent = message;
    dom.saveStatus.className = type
      ? `save-status ${type}`
      : "save-status";
  }

  function priorityLabel(score) {
    if (score >= 86) return "do first";
    if (score >= 62) return "high priority";
    if (score >= 40) return "medium priority";
    return "low pressure";
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Saved locally";
    }

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function unique(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function roundToNearestFive(number) {
    return Math.max(5, Math.round(number / 5) * 5);
  }

  function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
  }

  function shorten(text, maxLength) {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
  }

  function hashString(text) {
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }
})();
