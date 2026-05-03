const storageKey = "orbit-planner-state-v1";
const themeKey = "orbit-theme-v1";

const elements = {
  header: document.querySelector("[data-header]"),
  menuToggle: document.querySelector("[data-menu-toggle]"),
  navLinks: document.querySelector("[data-nav-links]"),
  themeToggle: document.querySelector("[data-theme-toggle]"),
  themeIcon: document.querySelector("[data-theme-icon]"),
  themeLabel: document.querySelector("[data-theme-label]"),
  year: document.querySelector("[data-year]"),

  form: document.querySelector("[data-planner-form]"),
  taskDump: document.querySelector("[data-task-dump]"),
  energy: document.querySelector("[data-energy]"),
  startTime: document.querySelector("[data-start-time]"),
  availableTime: document.querySelector("[data-available-time]"),
  timeLabel: document.querySelector("[data-time-label]"),
  saveState: document.querySelector("[data-save-state]"),

  sampleButton: document.querySelector("[data-sample-button]"),
  clearButton: document.querySelector("[data-clear-button]"),
  copyButton: document.querySelector("[data-copy-plan]"),

  planStats: document.querySelector("[data-plan-stats]"),
  emptyState: document.querySelector("[data-empty-state]"),
  timeline: document.querySelector("[data-timeline]"),
  toast: document.querySelector("[data-toast]")
};

const sampleDump = `Math worksheet due tomorrow
Study biology quiz notes 35 min
Read chapter 8 for history
English essay outline 45 min
Review Spanish vocabulary
Pack gym clothes`;

let latestPlanText = "";

function init() {
  elements.year.textContent = new Date().getFullYear();

  restoreTheme();
  restorePlannerState();
  updateTimeLabel();

  bindEvents();
  observeReveals();
  handleHeaderScroll();
}

function bindEvents() {
  window.addEventListener("scroll", handleHeaderScroll, { passive: true });

  elements.menuToggle.addEventListener("click", toggleMenu);
  elements.navLinks.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLAnchorElement) {
      closeMenu();
    }
  });

  elements.themeToggle.addEventListener("click", toggleTheme);

  elements.availableTime.addEventListener("input", () => {
    updateTimeLabel();
    savePlannerState();
  });

  [elements.taskDump, elements.energy, elements.startTime].forEach((element) => {
    element.addEventListener("input", savePlannerState);
    element.addEventListener("change", savePlannerState);
  });

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    generatePlan();
  });

  elements.sampleButton.addEventListener("click", () => {
    elements.taskDump.value = sampleDump;
    elements.energy.value = "medium";
    elements.availableTime.value = "135";
    elements.startTime.value = "18:30";
    updateTimeLabel();
    savePlannerState();
    showToast("Sample added. Generate the plan when ready.");
    elements.taskDump.focus();
  });

  elements.clearButton.addEventListener("click", () => {
    elements.taskDump.value = "";
    localStorage.removeItem(storageKey);
    latestPlanText = "";
    renderEmptyPlan();
    showToast("Planner cleared.");
    elements.taskDump.focus();
  });

  elements.copyButton.addEventListener("click", copyPlan);
}

function handleHeaderScroll() {
  elements.header.classList.toggle("is-scrolled", window.scrollY > 10);
}

function toggleMenu() {
  const isOpen = document.body.classList.toggle("menu-open");
  elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  elements.menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.menuToggle.setAttribute("aria-label", "Open menu");
}

function restoreTheme() {
  const savedTheme = localStorage.getItem(themeKey);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = savedTheme || (prefersLight ? "light" : "dark");

  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButton(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", nextTheme);
  localStorage.setItem(themeKey, nextTheme);
  updateThemeButton(nextTheme);
}

function updateThemeButton(theme) {
  const isDark = theme === "dark";
  elements.themeIcon.textContent = isDark ? "☾" : "☼";
  elements.themeLabel.textContent = isDark ? "Dark" : "Light";
}

function restorePlannerState() {
  const rawState = localStorage.getItem(storageKey);
  if (!rawState) return;

  try {
    const state = JSON.parse(rawState);

    elements.taskDump.value = typeof state.taskDump === "string" ? state.taskDump : "";
    elements.energy.value = state.energy || "medium";
    elements.startTime.value = state.startTime || "18:30";
    elements.availableTime.value = state.availableTime || "120";
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function savePlannerState() {
  const state = {
    taskDump: elements.taskDump.value,
    energy: elements.energy.value,
    startTime: elements.startTime.value,
    availableTime: elements.availableTime.value
  };

  localStorage.setItem(storageKey, JSON.stringify(state));
  flashSavedState();
}

function flashSavedState() {
  elements.saveState.textContent = "Saved locally";
  window.clearTimeout(flashSavedState.timeoutId);

  flashSavedState.timeoutId = window.setTimeout(() => {
    elements.saveState.textContent = "Auto-saved locally";
  }, 1400);
}

function updateTimeLabel() {
  elements.timeLabel.textContent = `${elements.availableTime.value} min`;
}

function parseTasks(rawText) {
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => createTaskFromLine(line, index))
    .sort((a, b) => b.priority - a.priority || b.minutes - a.minutes);
}

function createTaskFromLine(line, index) {
  const lower = line.toLowerCase();
  const explicitMinutes = extractMinutes(lower);

  const subject = detectSubject(lower);
  const priority = detectPriority(lower);
  const minutes = explicitMinutes || estimateMinutes(lower);

  return {
    id: `task-${index}`,
    title: cleanTaskTitle(line),
    subject,
    priority,
    minutes
  };
}

function extractMinutes(text) {
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(hr|hrs|hour|hours)\b/);
  if (hourMatch) {
    return Math.round(Number(hourMatch[1]) * 60);
  }

  const minuteMatch = text.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  if (minuteMatch) {
    return Number(minuteMatch[1]);
  }

  return null;
}

function detectSubject(text) {
  const subjects = [
    ["Math", ["math", "algebra", "geometry", "calculus", "worksheet"]],
    ["Science", ["science", "bio", "biology", "chem", "chemistry", "physics", "lab"]],
    ["English", ["english", "essay", "reading", "book", "literature", "outline"]],
    ["History", ["history", "chapter", "social studies", "government"]],
    ["Language", ["spanish", "french", "vocabulary", "vocab", "latin"]],
    ["Personal", ["pack", "email", "permission", "form", "club", "practice"]]
  ];

  const match = subjects.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)));
  return match ? match[0] : "General";
}

function detectPriority(text) {
  let score = 1;

  if (text.includes("due tomorrow") || text.includes("tomorrow")) score += 5;
  if (text.includes("tonight") || text.includes("due")) score += 3;
  if (text.includes("quiz") || text.includes("test") || text.includes("exam")) score += 4;
  if (text.includes("project") || text.includes("essay")) score += 3;
  if (text.includes("study") || text.includes("review")) score += 2;
  if (text.includes("pack") || text.includes("bring")) score -= 1;

  return score;
}

function estimateMinutes(text) {
  if (text.includes("project")) return 55;
  if (text.includes("essay")) return 45;
  if (text.includes("test") || text.includes("exam")) return 45;
  if (text.includes("quiz") || text.includes("study")) return 35;
  if (text.includes("read") || text.includes("chapter")) return 30;
  if (text.includes("worksheet") || text.includes("problem")) return 28;
  if (text.includes("review") || text.includes("notes")) return 25;
  if (text.includes("pack") || text.includes("bring")) return 8;

  return 22;
}

function cleanTaskTitle(line) {
  return line
    .replace(/\b\d+(?:\.\d+)?\s*(hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function generatePlan() {
  const tasks = parseTasks(elements.taskDump.value);

  if (!tasks.length) {
    renderEmptyPlan();
    showToast("Add at least one task first.");
    elements.taskDump.focus();
    return;
  }

  const availableMinutes = Number(elements.availableTime.value);
  const energy = elements.energy.value;
  const startMinutes = timeToMinutes(elements.startTime.value);

  const plan = buildPlan(tasks, availableMinutes, startMinutes, energy);
  renderPlan(plan);
  savePlannerState();
  showToast("Tonight’s study orbit is ready.");
}

function buildPlan(tasks, availableMinutes, startMinutes, energy) {
  const settings = getEnergySettings(energy);
  const blocks = [];
  const overflow = [];

  let cursor = startMinutes;
  let usedMinutes = 0;
  let focusSinceBreak = 0;

  tasks.forEach((task) => {
    if (usedMinutes + task.minutes > availableMinutes) {
      overflow.push(task);
      return;
    }

    if (focusSinceBreak >= settings.breakAfter && usedMinutes + settings.breakLength + task.minutes <= availableMinutes) {
      blocks.push({
        type: "break",
        title: "Reset break",
        description: "Stand up, refill water, and get away from the screen for a few minutes.",
        minutes: settings.breakLength,
        start: cursor,
        end: cursor + settings.breakLength,
        tag: `${settings.breakLength} min break`
      });

      cursor += settings.breakLength;
      usedMinutes += settings.breakLength;
      focusSinceBreak = 0;
    }

    blocks.push({
      type: "focus",
      title: task.title,
      description: `${task.subject} · estimated focus block based on your brain dump.`,
      minutes: task.minutes,
      start: cursor,
      end: cursor + task.minutes,
      tag: `${task.minutes} min focus`
    });

    cursor += task.minutes;
    usedMinutes += task.minutes;
    focusSinceBreak += task.minutes;
  });

  overflow.forEach((task) => {
    blocks.push({
      type: "overflow",
      title: task.title,
      description: `${task.subject} · not enough room tonight. Move this to tomorrow or shorten another block.`,
      minutes: task.minutes,
      start: null,
      end: null,
      tag: "Save for later"
    });
  });

  return {
    blocks,
    tasks,
    overflow,
    focusMinutes: tasks.reduce((sum, task) => sum + task.minutes, 0),
    plannedMinutes: usedMinutes,
    finishMinutes: cursor,
    startMinutes,
    availableMinutes
  };
}

function getEnergySettings(energy) {
  const settings = {
    low: { breakAfter: 45, breakLength: 10 },
    medium: { breakAfter: 60, breakLength: 10 },
    high: { breakAfter: 75, breakLength: 8 }
  };

  return settings[energy] || settings.medium;
}

function renderPlan(plan) {
  elements.emptyState.hidden = true;
  elements.timeline.hidden = false;
  elements.copyButton.disabled = false;

  elements.timeline.replaceChildren();

  plan.blocks.forEach((block, index) => {
    const item = createTimelineItem(block, index);
    elements.timeline.appendChild(item);
  });

  updateStats(plan);
  latestPlanText = planToText(plan);
}

function createTimelineItem(block, index) {
  const item = document.createElement("article");
  item.className = `timeline-item ${block.type}`;
  item.style.animationDelay = `${Math.min(index * 55, 420)}ms`;

  const time = document.createElement("div");
  time.className = "timeline-time";

  if (block.start === null) {
    time.textContent = "Later";
  } else {
    time.textContent = `${minutesToTime(block.start)} – ${minutesToTime(block.end)}`;
  }

  const content = document.createElement("div");
  content.className = "timeline-content";

  const title = document.createElement("strong");
  title.textContent = block.title;

  const description = document.createElement("p");
  description.textContent = block.description;

  const tag = document.createElement("span");
  tag.className = "timeline-tag";
  tag.textContent = block.tag;

  content.append(title, description, tag);
  item.append(time, content);

  return item;
}

function renderEmptyPlan() {
  elements.timeline.replaceChildren();
  elements.timeline.hidden = true;
  elements.emptyState.hidden = false;
  elements.copyButton.disabled = true;

  latestPlanText = "";

  const statValues = elements.planStats.querySelectorAll("strong");
  statValues[0].textContent = "0";
  statValues[1].textContent = "0m";
  statValues[2].textContent = "—";
}

function updateStats(plan) {
  const statValues = elements.planStats.querySelectorAll("strong");
  const plannedFocus = plan.blocks
    .filter((block) => block.type === "focus")
    .reduce((sum, block) => sum + block.minutes, 0);

  statValues[0].textContent = String(plan.tasks.length);
  statValues[1].textContent = `${plannedFocus}m`;
  statValues[2].textContent = minutesToTime(plan.finishMinutes);
}

function planToText(plan) {
  const lines = ["Orbit study plan"];

  plan.blocks.forEach((block) => {
    if (block.start === null) {
      lines.push(`Later: ${block.title} (${block.tag})`);
    } else {
      lines.push(`${minutesToTime(block.start)}–${minutesToTime(block.end)}: ${block.title} (${block.tag})`);
    }
  });

  return lines.join("\n");
}

async function copyPlan() {
  if (!latestPlanText) return;

  try {
    await navigator.clipboard.writeText(latestPlanText);
    showToast("Plan copied.");
  } catch {
    showToast("Copy failed. Your browser may block clipboard access.");
  }
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 18 * 60 + 30;
  }

  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function observeReveals() {
  const revealElements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
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

  revealElements.forEach((element) => observer.observe(element));
}

init();
