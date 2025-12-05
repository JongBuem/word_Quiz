/* ============================================================
   전역 상태
============================================================ */
let wordList = []; // [{ word:"", types:{ n:[], v:[], adj:[], adv:[], phr:[] } }]
let quizList = [];
let quizIndex = 0;
let resultLog = [];

// 옵션 (기본값)
let quizMode = "single"; // single | byType
let judgeMode = "all"; // all | any
let quizAmount = "1"; // 1 | 10 | all

/* ============================================================
   Utility
============================================================ */
function normalize(str) {
  return str
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\w가-힣]/g, "")
    .toLowerCase();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ============================================================
   저장 / 로드
============================================================ */
function saveWords() {
  localStorage.setItem("wordListPWA", JSON.stringify(wordList));
}
function loadWords() {
  const raw = localStorage.getItem("wordListPWA");
  if (raw) wordList = JSON.parse(raw);
}

function saveOptions() {
  localStorage.setItem("quizMode", quizMode);
  localStorage.setItem("judgeMode", judgeMode);
  localStorage.setItem("quizAmount", quizAmount);
}
function loadOptions() {
  const m = localStorage.getItem("quizMode");
  const j = localStorage.getItem("judgeMode");
  const a = localStorage.getItem("quizAmount");

  if (m) quizMode = m;
  if (j) judgeMode = j;
  if (a) quizAmount = a;
}

/* ============================================================
   기본 화면 (단어 생성기)
============================================================ */
function renderBuilder() {
  loadOptions();

  document.getElementById("app").innerHTML = `
    <h2>단어 입력</h2>

    <div class="option-group"><label>단어</label><input id="w_word"></div>
    <div class="option-group"><label>명사(n)</label><input id="w_n"></div>
    <div class="option-group"><label>동사(v)</label><input id="w_v"></div>
    <div class="option-group"><label>형용사(adj)</label><input id="w_adj"></div>
    <div class="option-group"><label>부사(adv)</label><input id="w_adv"></div>
    <div class="option-group"><label>숙어(phr)</label><input id="w_phr"></div>

    <button id="addWordBtn">단어 추가</button>
    <hr>

    <h2>단어 리스트</h2>
    <div id="wordTable"></div>
    <button id="clearWordsBtn" style="background:#d9534f">전체 삭제</button>
    <hr>

    <h2>퀴즈 옵션</h2>

    <div class="option-group">
      <label>문제 수</label>
      <select id="op_amount">
        <option value="1">1문제씩</option>
        <option value="10">10문제씩</option>
        <option value="all">전체 문제</option>
      </select>
    </div>

    <div class="option-group">
      <label  class="option-title">입력 방식</label>
      <label class="option-item"><input class="option-input" type="radio" name="op_mode" value="single"> 입력창 1개</label>
      <label class="option-item"><input class="option-input" type="radio" name="op_mode" value="byType"> 품사별 입력창</label>
    </div>

    <div class="option-group">
      <label  class="option-title">정답 정책</label>
      <label class="option-item"><input class="option-input" type="radio" name="op_judge" value="all"> 입력한 모든 뜻이 정답일 때 정답</label>
      <label class="option-item"><input class="option-input" type="radio" name="op_judge" value="any"> 입력한 답 중 하나라도 맞으면 정답 (틀린 답 포함 시 오답)</label>
    </div>

    <button id="startQuizBtn" style="margin-top:14px">👉 퀴즈 시작</button>
  `;

  renderWordTable();

  // 옵션 UI 반영
  document.getElementById("op_amount").value = quizAmount;
  document.querySelector(
    `input[name="op_mode"][value="${quizMode}"]`
  ).checked = true;
  document.querySelector(
    `input[name="op_judge"][value="${judgeMode}"]`
  ).checked = true;

  // 이벤트 바인딩
  document.getElementById("addWordBtn").onclick = addWord;
  document.getElementById("clearWordsBtn").onclick = clearWords;

  document.getElementById("startQuizBtn").onclick = startQuiz;

  document.getElementById("op_amount").onchange = (e) => {
    quizAmount = e.target.value;
    saveOptions();
  };

  document.querySelectorAll(`input[name="op_mode"]`).forEach((r) => {
    r.onchange = () => {
      quizMode = r.value;
      saveOptions();
    };
  });

  document.querySelectorAll(`input[name="op_judge"]`).forEach((r) => {
    r.onchange = () => {
      judgeMode = r.value;
      saveOptions();
    };
  });
}

/* ============================================================
   단어 추가
============================================================ */
function addWord() {
  const word = document.getElementById("w_word").value.trim();
  if (!word) return alert("단어를 입력하세요.");

  const entry = { word, types: {} };

  const push = (raw, t) => {
    if (!raw) return;
    const list = raw
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v);
    if (list.length) entry.types[t] = list;
  };

  push(document.getElementById("w_n").value, "n");
  push(document.getElementById("w_v").value, "v");
  push(document.getElementById("w_adj").value, "adj");
  push(document.getElementById("w_adv").value, "adv");
  push(document.getElementById("w_phr").value, "phr");

  if (Object.keys(entry.types).length === 0)
    return alert("뜻을 1개 이상 입력하세요.");

  const exist = wordList.find((w) => w.word === word);
  if (exist) {
    for (const t in entry.types) {
      if (!exist.types[t]) exist.types[t] = [];
      exist.types[t].push(...entry.types[t]);
    }
  } else {
    wordList.push(entry);
  }

  saveWords();
  renderBuilder();
}

/* ============================================================
   단어 리스트 렌더링
============================================================ */
function renderWordTable() {
  let html = `
    <table>
      <tr><th>단어</th><th>품사/뜻</th></tr>
  `;

  wordList.forEach((w) => {
    let tHTML = "";
    for (const t in w.types) {
      tHTML += `<b>[${t}]</b> ${w.types[t].join(", ")}<br>`;
    }
    html += `
    <tr>
      <td>${w.word}</td>
      <td>${tHTML}</td>
    </tr>`;
  });

  html += "</table>";
  document.getElementById("wordTable").innerHTML = html;
}

/* ============================================================
   전체 삭제
============================================================ */
function clearWords() {
  if (!confirm("정말 삭제?")) return;
  wordList = [];
  saveWords();
  renderBuilder();
}

/* ============================================================
   퀴즈 시작
============================================================ */
function startQuiz() {
  if (wordList.length === 0) return alert("단어 없음");

  quizList = [...wordList];
  shuffle(quizList);

  quizIndex = 0;
  resultLog = [];

  if (quizAmount === "1") startSingle();
  else startSet();
}

/* ============================================================
   단일 문제 모드
============================================================ */
function startSingle() {
  const q = quizList[quizIndex];
  renderSingleQuestion(q);
}

function renderSingleQuestion(q) {
  document.getElementById("app").innerHTML = `
    <h2>단일 문제</h2>
    <div><b>${q.word}</b></div>
    <div id="answerBox"></div>

    <button id="btnCheck">정답 확인</button>
    <div id="resultArea" style="margin-top:10px;"></div>
    <button id="btnNext" class="hidden" style="margin-top:10px">다음 문제 →</button>

    <hr>
    <button id="btnBack">← 돌아가기</button>
  `;

  renderSingleInputUI(q);

  document.getElementById("btnCheck").onclick = () => checkSingle(q);
  document.getElementById("btnNext").onclick = nextSingle;
  document.getElementById("btnBack").onclick = renderBuilder;

  document.onkeydown = (e) => {
    if (e.key === "Enter") {
      const nextBtn = document.getElementById("btnNext");
      if (!nextBtn.classList.contains("hidden")) nextBtn.click();
      else document.getElementById("btnCheck").click();
    }
  };
}

function renderSingleInputUI(q) {
  const box = document.getElementById("answerBox");
  box.innerHTML = "";

  if (quizMode === "single") {
    box.innerHTML = `<input id="singleAns">`;
    document.getElementById("singleAns").focus();
  } else {
    for (const t in q.types) {
      box.innerHTML += `
        <div><b>[${t}]</b> <input id="ans_${t}"></div>
      `;
    }
    box.querySelector("input").focus();
  }
}

function checkSingle(q) {
  const btn = document.getElementById("btnCheck");
  btn.classList.add("hidden"); // 중복 채점 방지

  let userRaw = {};
  let userNorm = {};

  if (quizMode === "single") {
    const raw = document.getElementById("singleAns").value.trim();
    userRaw.single = raw;

    userNorm = raw
      .split(",")
      .map((x) => normalize(x))
      .filter((x) => x);

    const ok = judgeAnswer(userNorm, q.types, false);
    storeAndShowSingleResult(q, ok, userRaw);
  } else {
    for (const t in q.types) {
      const raw = document.getElementById(`ans_${t}`).value.trim();
      userRaw[t] = raw;

      userNorm[t] = raw
        .split(",")
        .map((x) => normalize(x))
        .filter((x) => x);
    }
    const ok = judgeAnswer(userNorm, q.types, true);
    storeAndShowSingleResult(q, ok, userRaw);
  }
}

function storeAndShowSingleResult(q, ok, userRaw) {
  const resultArea = document.getElementById("resultArea");

  let correctHTML = "";
  for (const t in q.types) correctHTML += `[${t}] ${q.types[t].join(", ")}<br>`;

  resultLog.push({
    word: q.word,
    types: q.types,
    user: userRaw,
    correct: ok,
  });

  resultArea.innerHTML = ok
    ? `<span style="color:green">정답!</span>`
    : `<span style="color:red">오답!</span><br>${correctHTML}`;

  document.getElementById("btnNext").classList.remove("hidden");
}

function nextSingle() {
  quizIndex++;
  if (quizIndex >= quizList.length) showFinal();
  else startSingle();
}

/* ============================================================
   세트 문제 모드
============================================================ */
function startSet() {
  renderSetUI();
}

function renderSetUI() {
  const size = quizAmount === "10" ? 10 : quizList.length;

  const start = quizIndex;
  const end = Math.min(start + size, quizList.length);
  const set = quizList.slice(start, end);

  let html = `
    <h2>세트 문제 (${set.length})</h2>
    <table>
      <tr><th>#</th><th>단어</th><th>품사</th><th>입력</th></tr>
  `;

  set.forEach((q, i) => {
    const idx = start + i + 1;

    let inputFields = "";
    if (quizMode === "single") {
      inputFields = `<input id="set_${idx}">`;
    } else {
      for (const t in q.types) {
        inputFields += `
          <div><b>[${t}]</b> <input id="set_${idx}_${t}"></div>
        `;
      }
    }

    html += `
      <tr>
        <td>${idx}</td>
        <td>${q.word}</td>
        <td>${Object.keys(q.types).join(", ")}</td>
        <td>${inputFields}</td>
      </tr>
    `;
  });

  html += `</table>
    <button id="btnSetCheck">정답 확인</button>
    <button id="btnSetNext" class="hidden" style="margin-left:10px">다음 세트 →</button>

    <div id="setResult" style="margin-top:20px"></div>
    <hr>
    <button id="btnBack">← 돌아가기</button>
  `;

  document.getElementById("app").innerHTML = html;

  document.getElementById("btnSetCheck").onclick = () => checkSet(set, start);
  document.getElementById("btnSetNext").onclick = () => {
    quizIndex += size;
    if (quizIndex >= quizList.length) showFinal();
    else renderSetUI();
  };
  document.getElementById("btnBack").onclick = renderBuilder;
}

function checkSet(set, startIdx) {
  let html = `
    <h3>정답 확인</h3>
    <table>
      <tr><th>단어</th><th>정답</th><th>내 답</th><th>결과</th></tr>
  `;

  set.forEach((q, i) => {
    const idx = startIdx + i + 1;

    let userRaw = {};
    let userNorm = {};

    if (quizMode === "single") {
      const raw = document.getElementById(`set_${idx}`).value.trim();
      userRaw.single = raw;

      userNorm = raw
        .split(",")
        .map((v) => normalize(v))
        .filter((v) => v);

      var ok = judgeAnswer(userNorm, q.types, false);
    } else {
      for (const t in q.types) {
        const raw = document.getElementById(`set_${idx}_${t}`).value.trim();
        userRaw[t] = raw;

        userNorm[t] = raw
          .split(",")
          .map((v) => normalize(v))
          .filter((v) => v);
      }

      var ok = judgeAnswer(userNorm, q.types, true);
    }

    resultLog.push({
      word: q.word,
      types: q.types,
      user: userRaw,
      correct: ok,
    });

    let correctHTML = "";
    for (const t in q.types)
      correctHTML += `[${t}] ${q.types[t].join(", ")}<br>`;

    let userHTML = "";
    for (const t in userRaw) userHTML += `<b>[${t}]</b> ${userRaw[t]}<br>`;

    html += `
      <tr>
        <td>${q.word}</td>
        <td>${correctHTML}</td>
        <td>${userHTML}</td>
        <td>${ok ? "⭕" : "❌"}</td>
      </tr>
    `;
  });

  html += `</table>`;
  document.getElementById("setResult").innerHTML = html;

  document.getElementById("btnSetCheck").classList.add("hidden");
  document.getElementById("btnSetNext").classList.remove("hidden");
}

/* ============================================================
   정답 판정 모듈 (core)
============================================================ */
function judgeAnswer(user, correctTypes, isByType) {
  const check = (userList, correctList) => {
    if (judgeMode === "all") {
      return userList.every((u) => correctList.includes(u));
    } else {
      const anyCorrect = userList.some((u) => correctList.includes(u));
      const anyWrong = userList.some((u) => !correctList.includes(u));
      return anyCorrect && !anyWrong;
    }
  };

  if (!isByType) {
    let merged = [];
    for (const t in correctTypes)
      merged.push(...correctTypes[t].map((v) => normalize(v)));

    return check(user, merged);
  }

  for (const t in correctTypes) {
    const correct = correctTypes[t].map((v) => normalize(v));
    const userList = user[t] || [];

    if (!check(userList, correct)) return false;
  }
  return true;
}

/* ============================================================
   최종 결과 화면
============================================================ */
function showFinal() {
  const score = resultLog.filter((r) => r.correct).length;

  let html = `
    <h2>퀴즈 종료</h2>
    <p>총 점수: ${score} / ${resultLog.length}</p>

    <table>
      <tr><th>단어</th><th>정답</th><th>내 답</th><th>결과</th></tr>
  `;

  resultLog.forEach((r) => {
    let correctHTML = "";
    for (const t in r.types)
      correctHTML += `[${t}] ${r.types[t].join(", ")}<br>`;

    let userHTML = "";
    for (const t in r.user) userHTML += `<b>[${t}]</b> ${r.user[t]}<br>`;

    html += `
      <tr>
        <td>${r.word}</td>
        <td>${correctHTML}</td>
        <td>${userHTML}</td>
        <td>${r.correct ? "⭕" : "❌"}</td>
      </tr>
    `;
  });

  html += `</table>
    <hr>
    <button id="btnBack">← 단어 생성기로 돌아가기</button>
  `;

  document.getElementById("app").innerHTML = html;
  document.getElementById("btnBack").onclick = renderBuilder;
}

/* ============================================================
   초기 실행
============================================================ */
loadWords();
loadOptions();
renderBuilder();
