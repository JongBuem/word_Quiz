/* ============================================================
   app_final.js - Finalized
   - Modes: 1문제씩, N문제씩(사용자 지정), 전체(all)
   - Always uses 품사별 입력창
   - judgeMode: 'all' or 'any' (behavior per user's spec)
   - Single-question '정답 확인' button disabled after click
   - Set mode: custom set size controls '다음 세트' visibility (remaining >= setSize)
   - JSON export/import preserved
   
   [최종 반영된 수정사항]
   1. '세트 크기 (N)'는 quizAmount가 'custom'일 때만 노출.
   2. quizAmount가 'custom'일 때만:
      - '정답 확인' 시 개별 세트 결과 테이블 미표시, 최종 완료 시 showFinal()만 호출.
      - Enter 키를 누르면 '정답 확인' 또는 '다음 세트' 동작 수행.
   3. quizAmount가 'all'일 때는 기존 동작(세트 확인 시 테이블 즉시 표시) 유지.
============================================================ */

let wordList = []; // [{ word:"", types:{ n:[], v:[], adj:[], adv:[], phr:[] } }]
let quizList = [];
let quizIndex = 0;
let resultLog = [];

// 옵션 (기본값)
let judgeMode = "all"; // all | any
let quizAmount = "1"; // "1" | "custom" | "all"
let customSetSize = 10; // used when quizAmount === "custom"

/* Utility */
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

/* 저장 / 로드 */
function saveWords() {
  localStorage.setItem("wordListPWA", JSON.stringify(wordList));
}
function loadWords() {
  const raw = localStorage.getItem("wordListPWA");
  if (raw) wordList = JSON.parse(raw);
}

function saveOptions() {
  localStorage.setItem("judgeMode", judgeMode);
  localStorage.setItem("quizAmount", quizAmount);
  localStorage.setItem("customSetSize", String(customSetSize));
}
function loadOptions() {
  const j = localStorage.getItem("judgeMode");
  const a = localStorage.getItem("quizAmount");
  const s = localStorage.getItem("customSetSize");

  if (j) judgeMode = j;
  if (a) quizAmount = a;
  if (s) customSetSize = Number(s);
}

/* 기본 화면 (단어 생성기) */
function renderBuilder() {
  loadOptions();

  // 1. "세트 크기 (N)" 입력창을 감싸는 div에 id="customSetSizeGroup" 추가
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

    <h2>JSON Export / Import</h2>

    <div class="option-group">
      <label class="option-title">JSON Export</label>
      <textarea id="jsonOut" style="height:160px"></textarea>
      <button id="copyJsonBtn">JSON 복사</button>
    </div>

    <div class="option-group">
      <label class="option-title">JSON Import</label>
      <textarea id="jsonIn" style="height:160px"></textarea>
      <button id="importJsonBtn">JSON 반영</button>
    </div>

    <hr>

    <h2>퀴즈 옵션</h2>

    <div class="option-group">
      <label>문제 수</label>
      <select id="op_amount">
        <option value="1">1문제씩</option>
        <option value="custom">N문제씩 (사용자 지정)</option>
        <option value="all">전체 문제</option>
      </select>
    </div>

    <div class="option-group" id="customSetSizeGroup">
      <label>세트 크기 (N)</label>
      <input id="op_custom_set" type="number" min="1" step="1" value="${customSetSize}" style="width:80px">
      <small>세트 문제 수를 입력하세요. 기본 10</small>
    </div>

    <div class="option-group">
      <label  class="option-title">(입력 방식) 항상 품사별 입력창으로 동작합니다</label>
    </div>

    <div class="option-group">
      <label  class="option-title">정답 정책</label>
      <label class="option-item"><input class="option-input" type="radio" name="op_judge" value="all"> 모든 품사를 적어야 정답</label>
      <label class="option-item"><input class="option-input" type="radio" name="op_judge" value="any"> 일부 품사만 적어도 정답 (틀린 답을 적을 경우 오답)</label>
    </div>

    <button id="startQuizBtn" style="margin-top:14px">👉 퀴즈 시작</button>
  `;

  renderWordTable();

  // 옵션 UI 반영
  document.getElementById("op_amount").value = quizAmount;
  document.getElementById("op_custom_set").value = customSetSize;
  const judgeEl = document.querySelector(
    `input[name="op_judge"][value="${judgeMode}"]`
  );
  if (judgeEl) judgeEl.checked = true;

  // 세트 크기 입력창의 초기 표시 상태를 설정하는 함수 (수정 1 반영)
  const toggleCustomSetSizeInput = () => {
    const group = document.getElementById("customSetSizeGroup");
    if (group) {
      if (quizAmount === "custom") {
        group.style.display = "block"; // 'custom'일 때만 보임
      } else {
        group.style.display = "none"; // 나머지는 숨김
      }
    }
  };
  toggleCustomSetSizeInput(); // 초기 상태 적용

  // 이벤트 바인딩
  document.getElementById("addWordBtn").onclick = addWord;
  document.getElementById("clearWordsBtn").onclick = clearWords;

  document.getElementById("startQuizBtn").onclick = startQuiz;

  // "문제 수" 변경 시 세트 크기 입력창의 표시 상태 업데이트 (수정 1 반영)
  document.getElementById("op_amount").onchange = (e) => {
    quizAmount = e.target.value;
    saveOptions();
    toggleCustomSetSizeInput();
  };

  document.getElementById("op_custom_set").onchange = (e) => {
    let v = Number(e.target.value);
    if (isNaN(v) || v < 1) v = 1;
    customSetSize = Math.floor(v);
    saveOptions();
    // reflect immediately
    document.getElementById("op_custom_set").value = customSetSize;
  };

  document.querySelectorAll(`input[name="op_judge"]`).forEach((r) => {
    r.onchange = () => {
      judgeMode = r.value;
      saveOptions();
    };
  });

  document.getElementById("copyJsonBtn").onclick = copyJSON;
  document.getElementById("importJsonBtn").onclick = importJSON;

  renderJSON();
}

/* 단어 추가 */
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
  renderJSON();
}

/* 단어 리스트 렌더링 */
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

/* 전체 삭제 */
function clearWords() {
  if (!confirm("정말 삭제?")) return;
  wordList = [];
  saveWords();
  renderBuilder();
  renderJSON();
}

/* 퀴즈 시작 */
function startQuiz() {
  if (wordList.length === 0) return alert("단어 없음");

  quizList = [...wordList];
  shuffle(quizList);

  quizIndex = 0;
  resultLog = [];

  if (quizAmount === "1") startQuestion();
  else startSet();
}

/* 단일 문제 (항상 품사별 입력창) */
function startQuestion() {
  const q = quizList[quizIndex];
  renderQuestion(q);
}

function renderQuestion(q) {
  let typeHTML = Object.keys(q.types)
    .map((t) => `<b>[${t}]</b>`)
    .join(" ");

  document.getElementById("app").innerHTML = `
    <h2>문제</h2>

    <div style="font-size:20px; margin-bottom:10px;">
      <b>${q.word}</b> <span style="color:#888">${typeHTML}</span>
    </div>

    <div id="answerBox"></div>

    <button id="checkBtn">정답 확인</button>
    <div id="resultArea" style="margin-top:12px;font-weight:bold"></div>

    <button id="nextBtn" class="hidden" style="margin-top:12px">다음 문제 →</button>

    <hr>
    <button id="backBtn">← 단어 생성기로 돌아가기</button>
  `;

  const box = document.getElementById("answerBox");
  box.innerHTML = "";
  const labelMap = {
    n: "명사",
    v: "동사",
    adj: "형용사",
    adv: "부사",
    phr: "숙어",
  };

  for (const t in q.types) {
    const div = document.createElement("div");
    div.style.marginBottom = "6px";
    div.innerHTML = `
      <b>[${t}]</b>
      <input id="ans_${t}" placeholder="${labelMap[t]} 뜻 입력 (콤마 가능)">
    `;
    box.appendChild(div);
  }

  // bind
  const checkBtn = document.getElementById("checkBtn");
  checkBtn.onclick = () => checkQuestion(q);
  document.getElementById("nextBtn").onclick = nextQuestion;
  document.getElementById("backBtn").onclick = renderBuilder;

  // 단일 문제 모드 엔터 키 바인딩
  document.onkeydown = (e) => {
    if (e.key === "Enter") {
      const nextBtn = document.getElementById("nextBtn");
      if (!nextBtn.classList.contains("hidden")) nextBtn.click();
      else document.getElementById("checkBtn").click();
    }
  };

  const first = box.querySelector("input");
  if (first) first.focus();
}

function checkQuestion(q) {
  document.getElementById("checkBtn").classList.add("hidden");
  // disable check to prevent multiple clicks
  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) {
    checkBtn.disabled = true;
    checkBtn.classList.add("disabled");
  }

  // 수집
  let userRaw = {};
  let userNorm = {};
  let hasAny = false;

  for (const t in q.types) {
    const raw = document.getElementById(`ans_${t}`).value.trim();
    userRaw[t] = raw;

    const list = raw
      .split(",")
      .map((x) => normalize(x))
      .filter((x) => x);

    userNorm[t] = list;
    if (list.length > 0) hasAny = true;
  }

  // 모든 칸 비어있으면 오답
  if (!hasAny) {
    showQuestionResult(false, q, "(입력 없음)");
    return;
  }

  const ok = judgeAnswer(userNorm, q.types);
  showQuestionResult(ok, q, userRaw);
}

function showQuestionResult(isCorrect, q, userRaw) {
  const resultArea = document.getElementById("resultArea");

  let correctHTML = "";
  for (const t in q.types) {
    correctHTML += `[${t}] ${q.types[t].join(", ")}<br>`;
  }

  resultLog.push({
    word: q.word,
    types: q.types,
    user: userRaw,
    correct: isCorrect,
  });

  resultArea.innerHTML = isCorrect
    ? `<span style="color:green">정답!</span>`
    : `<span style="color:red">오답!</span><br><br>정답:<br>${correctHTML}`;

  document.getElementById("nextBtn").classList.remove("hidden");
}

function nextQuestion() {
  quizIndex++;
  if (quizIndex >= quizList.length) {
    showFinal();
  } else {
    renderQuestion(quizList[quizIndex]);
  }
}

/* 세트 문제 모드 */
function startSet() {
  renderSetUI();
}

// 2. renderSetUI 수정: setResult 영역 조건부 숨김 처리 및 Enter 키 바인딩
function renderSetUI() {
  // determine set size (custom or all)
  const size = quizAmount === "custom" ? customSetSize : quizList.length;

  const start = quizIndex;
  // 현재 퀴즈 리스트의 끝이나 세트 크기만큼의 문제까지만 가져옴
  const end = Math.min(start + size, quizList.length);
  const set = quizList.slice(start, end);

  // 세트 크기가 0이면 최종화면으로 전환
  if (set.length === 0) {
    showFinal();
    return;
  }

  // 'custom' 모드일 때만 결과를 숨김
  const isCustomMode = quizAmount === "custom";
  const resultStyle = isCustomMode
    ? "color:transparent; height:1px; overflow:hidden;"
    : "";

  let html = `
    <h2>세트 문제 (${start + 1} ~ ${end} / ${quizList.length})</h2>
    <table>
      <tr><th>#</th><th>단어</th><th>품사</th><th>입력</th></tr>
  `;

  set.forEach((q, i) => {
    const idx = start + i + 1;

    let inputFields = "";
    for (const t in q.types) {
      inputFields += `
        <div><b>[${t}]</b> <input id="set_${idx}_${t}" placeholder="${t} (콤마 가능)"></div>
      `;
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
    
    <div id="setResult" style="margin-top:20px; font-weight:bold; ${resultStyle}"></div>
    
    <button id="btnSetNext" class="hidden" style="margin-left:10px">다음 세트 →</button>

    <hr>
    <button id="btnBack">← 돌아가기</button>
  `;

  document.getElementById("app").innerHTML = html;

  document.getElementById("btnSetCheck").onclick = () =>
    checkSet(set, start, size);
  document.getElementById("btnBack").onclick = renderBuilder;

  // 세트 모드 엔터 키 바인딩 (수정 2 반영)
  document.onkeydown = (e) => {
    if (e.key === "Enter") {
      const nextBtn = document.getElementById("btnSetNext");
      // 다음 세트 버튼이 보이면 클릭
      if (nextBtn && !nextBtn.classList.contains("hidden")) {
        nextBtn.click();
      } else {
        // 아니면 정답 확인 버튼 클릭
        const checkBtn = document.getElementById("btnSetCheck");
        if (checkBtn && !checkBtn.disabled) checkBtn.click();
      }
    }
  };
}

// 2. checkSet 함수 수정: 'custom' 모드일 때만 정답 확인 테이블을 보여주지 않음
function checkSet(set, startIdx, setSize) {
  const isCustomMode = quizAmount === "custom";

  let html = "";
  if (isCustomMode) {
    // 'custom' 모드일 경우, 결과를 숨김
    html = `
        <h3>채점 완료</h3>
        <p>채점이 완료되었습니다. '다음 세트'를 클릭하세요.</p>
      `;
  } else {
    // 'all' 모드일 경우 (기존 동작), 결과를 테이블로 바로 보여줌
    html = `
        <h3>정답 확인</h3>
        <table>
          <tr><th>단어</th><th>정답</th><th>내 답</th><th>결과</th></tr>
      `;
  }

  // 기존 resultLog에 추가하는 로직은 유지
  set.forEach((q, i) => {
    const idx = startIdx + i + 1;

    let userRaw = {};
    let userNorm = {};
    let hasAny = false;

    for (const t in q.types) {
      const rawEl = document.getElementById(`set_${idx}_${t}`);
      // 입력창이 없는 경우를 대비해 rawEl 체크
      const raw = rawEl ? rawEl.value.trim() : "";
      userRaw[t] = raw;

      const list = raw
        .split(",")
        .map((v) => normalize(v))
        .filter((v) => v);

      userNorm[t] = list;
      if (list.length > 0) hasAny = true;
    }

    // determine ok for this question
    let ok = false;
    if (!hasAny) {
      ok = false;
    } else {
      ok = judgeAnswer(userNorm, q.types);
    }

    // ⭐ resultLog에 기록하는 것은 유지
    resultLog.push({
      word: q.word,
      types: q.types,
      user: userRaw,
      correct: ok,
    });

    if (!isCustomMode) {
      // 'all' 모드일 때만 테이블 행 추가
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
    }
  });

  if (!isCustomMode) {
    html += `</table>`;
  }

  // 결과 표시
  const setResultEl = document.getElementById("setResult");
  setResultEl.innerHTML = html;

  // 'custom' 모드인 경우에만 결과 표시 영역의 스타일을 해제하여 메시지를 보이게 할 수 있으나,
  // '다음 세트' 버튼만 누르게 하기 위해 결과 영역 스타일은 유지함. (혹은 간단히 hidden 해제)
  if (isCustomMode) {
    // 메시지 표시를 위해 잠시 스타일 해제 (필요하다면)
    setResultEl.style.color = "black";
    setResultEl.style.height = "auto";
    setResultEl.style.overflow = "visible";
  }

  // hide check button to prevent re-check
  const btnSetCheck = document.getElementById("btnSetCheck");
  if (btnSetCheck) btnSetCheck.disabled = true;
  btnSetCheck.classList.add("hidden");

  // 다음 세트 버튼 로직 (quizIndex 업데이트 및 화면 전환)
  const setActualSize = set.length;
  const end = startIdx + setActualSize;
  const remain = quizList.length - end;

  const nextBtn = document.getElementById("btnSetNext");

  // 최종 문제까지 다 풀었을 때 (모드와 관계없이)
  if (end >= quizList.length) {
    if (nextBtn) nextBtn.textContent = "퀴즈 종료 및 결과 보기 →";
    if (nextBtn) nextBtn.classList.remove("hidden");

    // 다음 버튼 클릭 시 최종 결과 호출
    nextBtn.onclick = showFinal;
  } else {
    // 다음 세트가 남았을 때 (모드와 관계없이)
    if (nextBtn) nextBtn.textContent = "다음 세트 →";
    if (nextBtn) nextBtn.classList.remove("hidden");

    // 다음 세트가 있을 경우, 다음 버튼 클릭 시 다음 세트 렌더링
    nextBtn.onclick = () => {
      quizIndex = end;
      renderSetUI();
    };
  }
}

/* 정답 판정 모듈 (core) */
function judgeAnswer(user, correctTypes) {
  // 0) 모든 입력칸 비었으면 즉시 오답
  const hasAnyInput = Object.values(user).some((list) => list.length > 0);
  if (!hasAnyInput) return false;

  // 1) ALL MODE
  if (judgeMode === "all") {
    // 모든 품사에 대해: 반드시 입력해야 하고, 입력한 모든 값이 정답이어야 함
    for (const t in correctTypes) {
      const correctList = correctTypes[t].map((v) => normalize(v));
      const userList = user[t] || [];

      // 해당 품사 입력 안했고 → 오답
      if (userList.length === 0) return false;

      // 사용자 입력값이 모두 정답 리스트 안에 있어야 함
      const allCorrect = userList.every((u) => correctList.includes(u));
      if (!allCorrect) return false;
    }

    return true; // 모든 품사 통과
  }

  // 2) ANY MODE
  if (judgeMode === "any") {
    let foundCorrect = false;

    for (const t in correctTypes) {
      const correctList = correctTypes[t].map((v) => normalize(v));
      const userList = user[t] || [];

      if (userList.length === 0) continue; // 비어있으면 무시

      const anyCorrect = userList.some((u) => correctList.includes(u));
      const anyWrong = userList.some((u) => !correctList.includes(u));

      // 입력한 품사칸에서 틀린 단어가 있으면 즉시 오답
      if (anyWrong) return false;

      if (anyCorrect) foundCorrect = true;
    }

    return foundCorrect; // 1개라도 맞으면 정답
  }

  return false;
}

/* 최종 결과 화면 */
function showFinal() {
  const score = resultLog.filter((r) => r.correct).length;

  let html = `
    <h2>퀴즈 종료</h2>
    <p>총 점수: ${score} / ${resultLog.length}</p>

    <table>
      <tr><th>단어</th><th>품사별 정답</th><th>내 답</th><th>결과</th></tr>
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

/* JSON Export */
function renderJSON() {
  const jsonOut = document.getElementById("jsonOut");
  if (jsonOut) jsonOut.value = JSON.stringify(wordList, null, 2);
}

function copyJSON() {
  try {
    navigator.clipboard.writeText(document.getElementById("jsonOut").value);
    alert("복사되었습니다!");
  } catch (e) {
    alert("클립보드 복사 실패! 콘솔을 확인하세요.");
    console.error(e);
  }
}

/* JSON Import */
function importJSON() {
  try {
    const raw = document.getElementById("jsonIn").value.trim();
    const arr = JSON.parse(raw);

    if (!Array.isArray(arr)) throw "not array";

    // 데이터 유효성 검사 추가: 최소한의 구조 확인
    const isValid = arr.every(
      (item) => item.word && typeof item.types === "object"
    );
    if (!isValid) throw "Invalid word structure in JSON array";

    wordList = arr;
    saveWords();
    renderBuilder();
    alert("반영 완료!");
  } catch (err) {
    alert("JSON 형식 오류!");
  }
}

/* 초기 실행 */
loadWords();
loadOptions();
renderBuilder();
