/* ---------------------------------------
   전역 상태
----------------------------------------*/
let wordList = []; // { word: "", types: { n:[], v:[], adj:[], adv:[], phr:[] } }
let quizList = [];
let quizIndex = 0;
let resultLog = [];

let quizMode = "single"; // 입력 방식: single | byType
let judgeMode = "all"; // 정답 정책: all | any
let quizAmount = "1"; // 1 | 10 | all

/* ---------------------------------------
   테마 전환
----------------------------------------*/
const themeBtn = document.getElementById("themeToggle");

themeBtn.onclick = () => {
  document.body.classList.toggle("dark");
  themeBtn.textContent = document.body.classList.contains("dark")
    ? "☀️ 라이트"
    : "🌙 다크";
};

/* ---------------------------------------
   normalize
----------------------------------------*/
function normalize(str) {
  return str
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\w가-힣]/g, "")
    .toLowerCase();
}

/* ---------------------------------------
   단어 UI 렌더링 (옵션 저장/불러오기 포함)
----------------------------------------*/
function renderBuilder() {
  /* 🔵 저장된 퀴즈 옵션 불러오기 */
  const savedMode = localStorage.getItem("quizModeSaved");
  const savedJudge = localStorage.getItem("judgeModeSaved");
  const savedAmount = localStorage.getItem("quizAmountSaved");

  if (savedMode) quizMode = savedMode;
  if (savedJudge) judgeMode = savedJudge;
  if (savedAmount) quizAmount = savedAmount;

  /* 🔵 UI 렌더링 */
  document.getElementById("app").innerHTML = `
    <h2>단어 입력</h2>

    <div class="option-group">
      <label class="option-title">단어</label>
      <input id="wordInput">
    </div>

    <div class="option-group">
      <label class="option-title">명사 (n)</label>
      <input id="nInput">
    </div>

    <div class="option-group">
      <label class="option-title">동사 (v)</label>
      <input id="vInput">
    </div>

    <div class="option-group">
      <label class="option-title">형용사 (adj)</label>
      <input id="adjInput">
    </div>

    <div class="option-group">
      <label class="option-title">부사 (adv)</label>
      <input id="advInput">
    </div>

    <div class="option-group">
      <label class="option-title">구동사/숙어 (phr)</label>
      <input id="phrInput">
    </div>

    <button id="addWordBtn">단어 추가</button>

    <hr>

    <h2>단어 리스트</h2>
    <div id="wordTableBox"></div>

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

    <!-- 문제 수 -->
    <div class="option-group">
      <div class="option-title">문제 수</div>
      <select id="quizAmountSel">
        <option value="1">1문제씩</option>
        <option value="10">10문제씩</option>
        <option value="all">전체 문제</option>
      </select>
    </div>

    <!-- 입력 방식 -->
    <div class="option-group">
      <div class="option-title">입력 방식</div>
      
      <label class="option-item">
        <input type="radio" name="mode" value="single">
        입력창 1개
      </label>

      <label class="option-item">
        <input class="option-input" type="radio" name="mode" value="byType">
        품사별 입력창
      </label>
    </div>

    <!-- 정답 정책 -->
    <div class="option-group">
      <div class="option-title">정답 정책</div>

      <label class="option-item">
        <input class="option-input" type="radio" name="judge" value="all">
        입력한 모든 뜻이 정답일 때 정답
      </label>

      <label class="option-item">
        <input class="option-input" type="radio" name="judge" value="any">
        입력한 답 중 하나라도 맞으면 정답
        <br><small style="color:var(--text-light)">※ 틀린 답 포함 시 오답</small>
      </label>
    </div>

    <button id="startQuizBtn" style="margin-top:20px">👉 퀴즈 시작</button>
  `;

  /* 🔵 불러온 옵션을 UI에 반영 */
  document.getElementById("quizAmountSel").value = quizAmount;

  const modeEl = document.querySelector(
    `input[name="mode"][value="${quizMode}"]`
  );
  if (modeEl) modeEl.checked = true;

  const judgeEl = document.querySelector(
    `input[name="judge"][value="${judgeMode}"]`
  );
  if (judgeEl) judgeEl.checked = true;

  /* 🔵 기존 기능 그대로 유지 */
  renderWordTable();
  renderJSON();

  document.getElementById("addWordBtn").onclick = addWord;
  document.getElementById("clearWordsBtn").onclick = clearWords;
  document.getElementById("copyJsonBtn").onclick = copyJSON;
  document.getElementById("importJsonBtn").onclick = importJSON;
  document.getElementById("startQuizBtn").onclick = startQuiz;

  /* 🔵 옵션 바꿀 때마다 저장 */
  document.getElementById("quizAmountSel").onchange = (e) => {
    quizAmount = e.target.value;
    localStorage.setItem("quizAmountSaved", quizAmount);
  };

  document.querySelectorAll("input[name='mode']").forEach((r) => {
    r.onchange = () => {
      quizMode = r.value;
      localStorage.setItem("quizModeSaved", quizMode);
    };
  });

  document.querySelectorAll("input[name='judge']").forEach((r) => {
    r.onchange = () => {
      judgeMode = r.value;
      localStorage.setItem("judgeModeSaved", judgeMode);
    };
  });
}

/* ---------------------------------------
   단어 추가
----------------------------------------*/
function addWord() {
  const word = document.getElementById("wordInput").value.trim();
  const n = document.getElementById("nInput").value.trim();
  const v = document.getElementById("vInput").value.trim();
  const adj = document.getElementById("adjInput").value.trim();
  const adv = document.getElementById("advInput").value.trim();
  const phr = document.getElementById("phrInput").value.trim();

  if (!word) {
    alert("단어를 입력해주세요.");
    return;
  }

  const entry = {
    word,
    types: {},
  };

  // 품사별 입력 처리
  const pushTypes = (raw, type) => {
    if (!raw) return;
    const list = raw
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x);
    if (list.length > 0) entry.types[type] = list;
  };

  pushTypes(n, "n");
  pushTypes(v, "v");
  pushTypes(adj, "adj");
  pushTypes(adv, "adv");
  pushTypes(phr, "phr");

  if (Object.keys(entry.types).length === 0) {
    alert("뜻을 1개 이상 입력해주세요.");
    return;
  }

  // 동일 단어 이미 있는지 체크
  const exist = wordList.find((w) => w.word === word);
  if (exist) {
    // 기존 품사와 병합
    for (const t in entry.types) {
      if (!exist.types[t]) exist.types[t] = [];
      exist.types[t].push(...entry.types[t]);
    }
  } else {
    wordList.push(entry);
  }

  saveWords();
  renderWordTable();
  renderJSON();

  // 입력창 초기화
  document.getElementById("wordInput").value = "";
  document.getElementById("nInput").value = "";
  document.getElementById("vInput").value = "";
  document.getElementById("adjInput").value = "";
  document.getElementById("advInput").value = "";
  document.getElementById("phrInput").value = "";
}

/* ---------------------------------------
   단어 리스트 표 렌더링
----------------------------------------*/
function renderWordTable() {
  let html = `
    <table>
      <tr>
        <th>단어</th>
        <th>품사/뜻</th>
      </tr>
  `;

  wordList.forEach((w) => {
    let typeHTML = "";
    for (const type in w.types) {
      typeHTML += `<b>[${type}]</b> ${w.types[type].join(", ")}<br>`;
    }

    html += `
      <tr>
        <td>${w.word}</td>
        <td>${typeHTML}</td>
      </tr>
    `;
  });

  html += "</table>";

  document.getElementById("wordTableBox").innerHTML = html;
}

/* ---------------------------------------
   JSON Export
----------------------------------------*/
function renderJSON() {
  document.getElementById("jsonOut").value = JSON.stringify(wordList, null, 2);
}

function copyJSON() {
  navigator.clipboard.writeText(document.getElementById("jsonOut").value);
  alert("복사되었습니다!");
}

/* ---------------------------------------
   JSON Import
----------------------------------------*/
function importJSON() {
  try {
    const raw = document.getElementById("jsonIn").value.trim();
    const arr = JSON.parse(raw);

    if (!Array.isArray(arr)) throw "not array";

    wordList = arr;
    saveWords();
    renderWordTable();
    renderJSON();
    alert("반영 완료!");
  } catch (e) {
    alert("JSON 형식이 잘못되었습니다.");
  }
}

/* ---------------------------------------
   단어 전체 삭제
----------------------------------------*/
function clearWords() {
  if (!confirm("정말 전체 삭제할까요?")) return;
  wordList = [];
  saveWords();
  renderWordTable();
  renderJSON();
}

/* ---------------------------------------
   LocalStorage 저장/로드
----------------------------------------*/
function saveWords() {
  localStorage.setItem("wordListPWA", JSON.stringify(wordList));
}

function loadWords() {
  const saved = localStorage.getItem("wordListPWA");
  if (saved) {
    wordList = JSON.parse(saved);
  }
}

/* 초기 실행 */
loadWords();
renderBuilder();

/* ---------------------------------------
   Fisher-Yates Shuffle
----------------------------------------*/
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ---------------------------------------
   퀴즈 시작
----------------------------------------*/
function startQuiz() {
  saveQuizOptions();
  if (wordList.length === 0) {
    alert("단어가 없습니다!");
    return;
  }

  quizAmount = document.getElementById("quizAmountSel").value;

  // 최신 JSON 반영
  saveWords();

  // 문제 리스트 구성
  quizList = [...wordList];
  shuffle(quizList);

  quizIndex = 0;
  resultLog = [];

  if (quizAmount === "1") {
    startSingleMode();
  } else {
    startSetMode();
  }
}

function saveQuizOptions() {
  localStorage.setItem("quizModeSaved", quizMode);
  localStorage.setItem("judgeModeSaved", judgeMode);
  localStorage.setItem("quizAmountSaved", quizAmount);
}

/* ---------------------------------------
   단일 문제 모드 시작
----------------------------------------*/
function startSingleMode() {
  const q = quizList[quizIndex];
  renderSingleQuestion(q);
}

/* ---------------------------------------
   단일 문제 화면 렌더링
----------------------------------------*/
function renderSingleQuestion(q) {
  let typeHTML = Object.keys(q.types)
    .map((t) => `<b>[${t}]</b>`)
    .join(" ");

  document.getElementById("app").innerHTML = `
    <h2>단일 문제 모드</h2>

    <div style="font-size:20px; margin-bottom:10px;">
      <b>${q.word}</b> <span style="color:#888">${typeHTML}</span>
    </div>

    <div id="answerBox"></div>

    <button id="checkSingleBtn">정답 확인</button>
    <div id="singleResult" style="margin-top:12px;font-weight:bold"></div>

    <button id="nextSingleBtn" class="hidden" style="margin-top:12px">다음 문제 →</button>

    <hr>
    <button id="backBtn">← 단어 생성기로 돌아가기</button>
  `;

  // 입력창 렌더링
  renderSingleInputs(q);

  document.getElementById("checkSingleBtn").onclick = () =>
    checkSingleAnswer(q);

  document.getElementById("nextSingleBtn").onclick = () => {
    quizIndex++;
    if (quizIndex >= quizList.length) {
      showFinalSummary();
    } else {
      renderSingleQuestion(quizList[quizIndex]);
    }
  };

  document.getElementById("backBtn").onclick = renderBuilder;

  // 엔터키 처리
  document.onkeydown = function (e) {
    if (e.key !== "Enter") return;

    const nextBtn = document.getElementById("nextSingleBtn");
    if (!nextBtn.classList.contains("hidden")) nextBtn.click();
    else document.getElementById("checkSingleBtn").click();
  };
}

/* ---------------------------------------
   단일 문제 입력창 그리기
----------------------------------------*/
function renderSingleInputs(q) {
  const box = document.getElementById("answerBox");
  box.innerHTML = "";

  if (quizMode === "single") {
    box.innerHTML = `<input id="singleInput" placeholder="뜻을 입력하세요 (여러 개는 콤마)">`;
    document.getElementById("singleInput").focus();
    return;
  }

  // 품사별 입력 모드
  for (const t in q.types) {
    const labelMap = {
      n: "명사",
      v: "동사",
      adj: "형용사",
      adv: "부사",
      phr: "숙어",
    };

    const div = document.createElement("div");
    div.style.marginBottom = "6px";
    div.innerHTML = `
      <b>[${t}]</b>
      <input id="input_${t}" placeholder="${labelMap[t]} 뜻 입력 (콤마 가능)">
    `;
    box.appendChild(div);
  }

  const first = box.querySelector("input");
  if (first) first.focus();
}

/* ---------------------------------------
   단일 문제 정답 체크 (패치버전)
----------------------------------------*/
function checkSingleAnswer(q) {
  let isCorrect = false;
  let raw = "";

  if (quizMode === "single") {
    // 입력창 1개 모드
    const inputBox = document.getElementById("singleInput");
    if (!inputBox) return;

    raw = inputBox.value.trim();

    const userParts = raw
      .split(",")
      .map((x) => normalize(x))
      .filter((x) => x);

    isCorrect = judgeAnswer(userParts, q.types, false);

    // 엔터 중복 방지
    inputBox.blur();
  } else {
    // 품사별 입력 모드
    let perType = {};
    let hasAny = false;

    for (const t in q.types) {
      const el = document.getElementById(`input_${t}`);
      if (!el) continue;

      const rawVal = el.value.trim();
      const parts = rawVal
        .split(",")
        .map((x) => normalize(x))
        .filter((x) => x);

      perType[t] = parts;
      if (parts.length > 0) hasAny = true;
    }

    // 아무 뜻도 입력 안했으면 오답
    if (!hasAny && judgeMode === "all") {
      isCorrect = false;
      raw = "(입력 없음)";
    } else {
      isCorrect = judgeAnswer(perType, q.types, true);
      raw = "(품사별 입력)";
    }
  }

  // 결과 표시
  showSingleResult(isCorrect, q, raw);
}

/* ---------------------------------------
   정답 판정 엔진
   - singleMode → normalized list 전달
   - byTypeMode → { n:[], v:[], ... } 전달
----------------------------------------*/
function judgeAnswer(user, correctTypes, isByType = false) {
  // 🌟 ALL 모드 - 빈 입력이면 자동 오답 처리
  if (judgeMode === "all") {
    if (isByType) {
      // 품사별 입력에서 하나도 안 적은 경우
      const hasAny = Object.values(user).some((list) => list.length > 0);
      if (!hasAny) return false;
    } else {
      // 입력창 1개 모드에서 아무 입력 없음
      if (user.length === 0) return false;
    }
  }

  const isCorrectTypeGroup = (userList, correctList) => {
    if (judgeMode === "all") {
      return userList.every((u) => correctList.includes(u));
    } else {
      const anyCorrect = userList.some((u) => correctList.includes(u));
      const anyWrong = userList.some((u) => !correctList.includes(u));
      return anyCorrect && !anyWrong;
    }
  };

  let totalCorrect = true;

  if (!isByType) {
    // 입력창 1개 모드
    let merged = [];
    for (const t in correctTypes) {
      merged.push(...correctTypes[t].map((x) => normalize(x)));
    }
    return isCorrectTypeGroup(user, merged);
  }

  // 품사별 입력창 모드
  for (const t in correctTypes) {
    const correctList = correctTypes[t].map((x) => normalize(x));
    const userList = user[t] || [];

    const ok = isCorrectTypeGroup(userList, correctList);
    if (!ok) totalCorrect = false;
  }

  return totalCorrect;
}

/* ---------------------------------------
   단일 문제 정답 출력
----------------------------------------*/
function showSingleResult(isCorrect, q, userAns) {
  const resultArea = document.getElementById("singleResult");

  // 정답 포맷
  let correctHTML = "";
  for (const t in q.types) {
    correctHTML += `[${t}] ${q.types[t].join(", ")}<br>`;
  }

  resultLog.push({
    word: q.word,
    types: q.types,
    user: userAns,
    correct: isCorrect,
  });

  resultArea.innerHTML = isCorrect
    ? `<span style="color:green">정답!</span>`
    : `<span style="color:red">오답!</span><br><br>정답:<br>${correctHTML}`;

  document.getElementById("nextSingleBtn").classList.remove("hidden");
}

/* ---------------------------------------
   세트 모드 시작 (10문제씩 or 전체)
----------------------------------------*/
function startSetMode() {
  renderSetQuestions();
}

/* ---------------------------------------
   세트 문제 화면 렌더링
----------------------------------------*/
function renderSetQuestions() {
  const setSize = quizAmount === "10" ? 10 : quizList.length;

  const start = quizIndex;
  const end = Math.min(start + setSize, quizList.length);
  const currentSet = quizList.slice(start, end);

  let html = `
    <h2>세트 문제 모드</h2>
    <h3>${Math.floor(start / setSize) + 1}세트 (${currentSet.length} 문제)</h3>

    <table>
      <tr>
        <th>#</th>
        <th>단어</th>
        <th>품사</th>
        <th>입력</th>
      </tr>
  `;

  currentSet.forEach((q, i) => {
    const idx = start + i + 1;
    const typeList = Object.keys(q.types).join(", ");

    // 입력창 생성
    let inputField = "";

    if (quizMode === "single") {
      inputField = `<input id="set_${idx}" placeholder="뜻 입력 (콤마 가능)">`;
    } else {
      // 품사별 입력창
      inputField = "";
      for (const t in q.types) {
        const labelMap = {
          n: "명사",
          v: "동사",
          adj: "형용사",
          adv: "부사",
          phr: "숙어",
        };
        inputField += `
          <div style="margin-bottom:6px;">
            <b>[${t}]</b>
            <input id="set_${idx}_${t}" placeholder="${labelMap[t]} (콤마 가능)">
          </div>
        `;
      }
    }

    html += `
      <tr>
        <td>${idx}</td>
        <td>${q.word}</td>
        <td>${typeList}</td>
        <td>${inputField}</td>
      </tr>
    `;
  });

  html += `</table>
    <button id="checkSetBtn" style="margin-top:14px;">정답 확인</button>
    <button id="nextSetBtn" class="hidden" style="margin-top:14px;">다음 세트 →</button>

    <div id="setResult" style="margin-top:20px;"></div>

    <hr>
    <button id="backBtn">← 단어 생성기로 돌아가기</button>
  `;

  document.getElementById("app").innerHTML = html;

  document.getElementById("checkSetBtn").onclick = () =>
    checkSetAnswers(currentSet, start);
  document.getElementById("nextSetBtn").onclick = nextSet;
  document.getElementById("backBtn").onclick = renderBuilder;

  document.onkeydown = null; // 세트 모드에서는 엔터 자동 동작 안 함.
}

/* ---------------------------------------
   세트 정답 체크
----------------------------------------*/
function checkSetAnswers(currentSet, startIdx) {
  let html = `
    <h3>정답 확인</h3>
    <table>
      <tr>
        <th>단어</th>
        <th>품사별 정답</th>
        <th>내 답</th>
        <th>결과</th>
      </tr>
  `;

  currentSet.forEach((q, i) => {
    const idx = startIdx + i + 1;

    let userAns = {};
    let isCorrect = true;

    if (quizMode === "single") {
      const raw = document.getElementById(`set_${idx}`).value.trim();
      const normalized = raw
        .split(",")
        .map((x) => normalize(x))
        .filter((x) => x);

      userAns.single = raw;

      isCorrect = judgeAnswer(normalized, q.types);
    } else {
      let perType = {};
      for (const t in q.types) {
        const raw = document.getElementById(`set_${idx}_${t}`).value.trim();
        const list = raw
          .split(",")
          .map((x) => normalize(x))
          .filter((x) => x);
        perType[t] = list;
        userAns[t] = raw;
      }
      isCorrect = judgeAnswer(perType, q.types, true);
    }

    resultLog.push({
      word: q.word,
      types: q.types,
      user: userAns,
      correct: isCorrect,
    });

    let correctHTML = "";
    for (const t in q.types) {
      correctHTML += `[${t}] ${q.types[t].join(", ")}<br>`;
    }

    let userHTML = "";
    for (const k in userAns) {
      userHTML += `<b>[${k}]</b> ${userAns[k]}<br>`;
    }

    html += `
      <tr>
        <td>${q.word}</td>
        <td>${correctHTML}</td>
        <td>${userHTML}</td>
        <td>${isCorrect ? "⭕" : "❌"}</td>
      </tr>
    `;
  });

  html += `</table>`;
  document.getElementById("setResult").innerHTML = html;

  document.getElementById("checkSetBtn").classList.add("hidden");
  document.getElementById("nextSetBtn").classList.remove("hidden");
}

/* ---------------------------------------
   다음 세트로 이동
----------------------------------------*/
function nextSet() {
  const setSize = quizAmount === "10" ? 10 : quizList.length;

  quizIndex += setSize;

  if (quizIndex >= quizList.length) {
    showFinalSummary();
  } else {
    renderSetQuestions();
  }
}

/* ---------------------------------------
   최종 요약표
----------------------------------------*/
function showFinalSummary() {
  const score = resultLog.filter((r) => r.correct).length;

  let html = `
    <h2>퀴즈 종료</h2>
    <p>총 점수: <b>${score}</b> / ${resultLog.length}</p>

    <table>
      <tr>
        <th>단어</th>
        <th>품사별 정답</th>
        <th>내 답</th>
        <th>결과</th>
      </tr>
  `;

  resultLog.forEach((r) => {
    let correctHTML = "";
    for (const t in r.types) {
      correctHTML += `[${t}] ${r.types[t].join(", ")}<br>`;
    }

    let userHTML = "";
    for (const k in r.user) {
      userHTML += `<b>[${k}]</b> ${r.user[k]}<br>`;
    }

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
    <button id="backBtn">← 단어 생성기로 돌아가기</button>
  `;

  document.getElementById("app").innerHTML = html;

  document.getElementById("backBtn").onclick = renderBuilder;
}

/* ---------------------------------------
   초기 실행
----------------------------------------*/
renderBuilder();
