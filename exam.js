// ─── State ────────────────────────────────────────────────────────────────────
let allUnits = [];
let currentQuestions = [];
let score = 0;
let answered = 0;
let selectedUnit = 0; // 0 = all units

// ─── Shuffle helper ───────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadQuestions() {
  try {
    const res = await fetch("questions.json");
    const data = await res.json();
    allUnits = data.units;
    buildUnitSelector();
    startExam();
  } catch (e) {
    document.getElementById("quiz-container").innerHTML =
      `<div class="error-msg">⚠️ Could not load questions.json. Make sure all files are in the same folder.</div>`;
  }
}

// ─── Build unit selector tabs ─────────────────────────────────────────────────
function buildUnitSelector() {
  const bar = document.getElementById("unit-tabs");
  bar.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.className = "tab-btn active";
  allBtn.textContent = "All Units";
  allBtn.dataset.unit = "0";
  allBtn.addEventListener("click", () => switchUnit(0, allBtn));
  bar.appendChild(allBtn);

  allUnits.forEach((unit) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = `Unit ${unit.id}`;
    btn.dataset.unit = unit.id;
    btn.addEventListener("click", () => switchUnit(unit.id, btn));
    bar.appendChild(btn);
  });
}

function switchUnit(unitId, clickedBtn) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  clickedBtn.classList.add("active");
  selectedUnit = unitId;
  startExam();
}

// ─── Start / reset exam ───────────────────────────────────────────────────────
function startExam() {
  score = 0;
  answered = 0;

  if (selectedUnit === 0) {
    currentQuestions = allUnits.flatMap((u) => u.questions);
  } else {
    const unit = allUnits.find((u) => u.id === selectedUnit);
    currentQuestions = unit ? [...unit.questions] : [];
  }

  // Shuffle question order and each question's options
  currentQuestions = shuffle(currentQuestions).map((q) => ({
    ...q,
    shuffledOptions: shuffle(q.options),
  }));

  updateScoreboard();
  renderQuestions();
}

// ─── Render all questions ─────────────────────────────────────────────────────
function renderQuestions() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  currentQuestions.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.id = `card-${q.id}`;

    const qNum = document.createElement("div");
    qNum.className = "q-number";
    qNum.textContent = `Q${idx + 1}`;

    const qText = document.createElement("div");
    qText.className = "q-text";
    qText.textContent = q.question;

    const optList = document.createElement("div");
    optList.className = "options";

    q.shuffledOptions.forEach((opt, optIdx) => {
      const label = ["A", "B", "C", "D"][optIdx];
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.dataset.qid = q.id;
      btn.dataset.value = opt;
      btn.innerHTML = `<span class="opt-label">${label}</span><span class="opt-text">${opt}</span>`;
      btn.addEventListener("click", () => handleAnswer(q.id, opt, btn));
      optList.appendChild(btn);
    });

    card.appendChild(qNum);
    card.appendChild(qText);
    card.appendChild(optList);
    container.appendChild(card);
  });
}

// ─── Handle answer click ──────────────────────────────────────────────────────
function handleAnswer(qid, selectedOpt, clickedBtn) {
  const card = document.getElementById(`card-${qid}`);
  if (card.classList.contains("locked")) return; // already answered
  card.classList.add("locked");

  const q = currentQuestions.find((q) => q.id === qid);
  const isCorrect = selectedOpt === q.answer;

  answered++;
  if (isCorrect) score++;

  // Style all buttons in this card
  card.querySelectorAll(".option-btn").forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.value === q.answer) {
      btn.classList.add("correct");
    } else if (btn === clickedBtn && !isCorrect) {
      btn.classList.add("wrong");
    } else {
      btn.classList.add("dimmed");
    }
  });

  // Show result badge on card
  const badge = document.createElement("div");
  badge.className = `result-badge ${isCorrect ? "badge-correct" : "badge-wrong"}`;
  badge.textContent = isCorrect ? "✓ Correct!" : "✗ Wrong";
  card.appendChild(badge);

  // Scroll the card into a nice view
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });

  updateScoreboard();
  checkCompletion();
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────
function updateScoreboard() {
  document.getElementById("score-current").textContent = score;
  document.getElementById("score-total").textContent = currentQuestions.length;
  document.getElementById("score-answered").textContent = answered;

  const pct = currentQuestions.length
    ? Math.round((score / currentQuestions.length) * 100)
    : 0;
  document.getElementById("score-pct").textContent = `${pct}%`;

  const bar = document.getElementById("progress-bar");
  const prog = currentQuestions.length ? (answered / currentQuestions.length) * 100 : 0;
  bar.style.width = `${prog}%`;
}

// ─── Completion banner ────────────────────────────────────────────────────────
function checkCompletion() {
  if (answered < currentQuestions.length) return;

  const pct = Math.round((score / currentQuestions.length) * 100);
  let grade, gradeClass;
  if (pct >= 90) { grade = "Excellent! "; gradeClass = "grade-a"; }
  else if (pct >= 75) { grade = "Good Job! "; gradeClass = "grade-b"; }
  else if (pct >= 50) { grade = "Keep Practising "; gradeClass = "grade-c"; }
  else { grade = "Needs Improvement "; gradeClass = "grade-d"; }

  const banner = document.createElement("div");
  banner.className = `completion-banner ${gradeClass}`;
  banner.innerHTML = `
    <div class="comp-title">${grade}</div>
    <div class="comp-stats">You scored <strong>${score}/${currentQuestions.length}</strong> (${pct}%)</div>
    <button class="retry-btn" onclick="startExam()"> Retry with Shuffled Questions</button>
  `;
  document.getElementById("quiz-container").prepend(banner);
  banner.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", loadQuestions);