/* 토익 Part 5 · 10문제 퀴즈 */
(function () {
  "use strict";

  var BANK = window.TOEIC_BANK;
  var SETS = BANK.sets;
  var KEY = "toeicP5.v1";
  var app = document.getElementById("app");
  var overlay = document.getElementById("overlay");
  var toastEl = document.getElementById("toast");

  var CONCEPT = {};
  SETS.forEach(function (s) {
    s.items.forEach(function (q) { if (!CONCEPT[q.tag]) CONCEPT[q.tag] = q.concept; });
  });

  function blankStore() {
    return { v: 1, cycleUsed: [], completedSets: 0, total: { n: 0, c: 0 }, byTag: {}, recent: [], session: null };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return blankStore();
      var s = JSON.parse(raw);
      var d = blankStore();
      Object.keys(d).forEach(function (k) { if (s[k] === undefined) s[k] = d[k]; });
      return s;
    } catch (e) { return blankStore(); }
  }
  var store = load();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  function setById(id) {
    for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i];
    return SETS[0];
  }
  function newSession(setId) {
    return { setId: setId, answers: [null, null, null, null, null, null, null, null, null, null], idx: 0, hints: {}, done: false, counted: false, review: false };
  }
  function validSession(s) {
    return !!s && typeof s.setId === "number" && Array.isArray(s.answers) && s.answers.length === 10 &&
      typeof s.idx === "number" && s.idx >= 0 && s.idx < 10;
  }
  function firstFreeSetId() {
    var used = store.cycleUsed || [];
    for (var i = 0; i < SETS.length; i++) if (used.indexOf(SETS[i].id) === -1) return SETS[i].id;
    store.cycleUsed = [];
    return SETS[0].id;
  }
  if (!validSession(store.session)) store.session = newSession(firstFreeSetId());

  var S = function () { return store.session; };
  var SET = function () { return setById(S().setId); };

  /* ---------- helpers ---------- */
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function stemHTML(text) {
    return esc(text).replace("____", '<span class="blank"></span>');
  }
  function josa(word, pair) {
    var code = word.charCodeAt(word.length - 1);
    var has = (code - 0xac00) % 28 !== 0;
    return word + (has ? pair[0] : pair[1]);
  }
  function pct(c, n) { return n ? Math.round((c / n) * 100) : 0; }
  function rateClass(p) { return p < 60 ? "low" : p < 80 ? "mid" : "high"; }

  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  function answeredInfo() {
    var s = S(), set = SET(), n = 0, c = 0;
    s.answers.forEach(function (a, i) {
      if (a == null) return;
      n++;
      if (a === set.items[i].answer) c++;
    });
    return { n: n, c: c };
  }

  /* ---------- card ---------- */
  function renderCard() {
    var s = S(), set = SET(), qi = s.idx, q = set.items[qi];
    var picked = s.answers[qi];
    var answered = picked != null;
    var info = answeredInfo();
    var hintOn = !!s.hints[qi];
    var allDone = s.answers.every(function (a) { return a != null; });

    var segs = "";
    s.answers.forEach(function (a, i) {
      var cls = a == null ? (i === qi ? "cur" : "") : (a === set.items[i].answer ? "ok" : "no");
      segs += '<span class="seg ' + cls + '"></span>';
    });

    var opts = "";
    q.choices.forEach(function (choice, i) {
      var cls = "opt";
      if (answered) {
        if (i === q.answer) cls += " correct";
        else if (i === picked) cls += " wrong";
        else cls += " dim";
      }
      var why = "";
      if (answered && (i === q.answer || i === picked)) {
        why = '<div class="why">' + esc(q.ex[i]) + "</div>";
      }
      opts += '<li class="' + cls + '" data-opt="' + i + '"><span class="badge">' + "ABCD"[i] +
        '</span><span class="wrap"><span class="txt">' + esc(choice) + "</span>" + why + "</span></li>";
    });

    var hintBox = hintOn ? '<div class="hintbox"><span>💡</span><span><b>힌트</b> · ' + esc(q.hint) + "</span></div>" : "";
    var footnote = answered ? '<div class="footnote"><b>해석</b> · ' + esc(q.tr) + "</div>" : "";

    var rightBtn;
    if (s.review) rightBtn = '<button class="btn" data-act="toresult">결과로</button>';
    else if (qi === 9 && answered) rightBtn = '<button class="btn solid" data-act="result">결과 보기</button>';
    else rightBtn = '<button class="btn" data-act="next"' + (answered ? "" : " disabled") + ">다음</button>";

    app.className = "card";
    app.innerHTML =
      '<div class="head">' +
        '<div class="counter">' +
          '<button class="chev" data-act="prev" aria-label="이전 문제"' + (qi === 0 ? " disabled" : "") + ">‹</button>" +
          '<span class="count">' + (qi + 1) + "/10</span>" +
          '<button class="chev" data-act="next" aria-label="다음 문제"' + (qi === 9 ? " disabled" : "") + ">›</button>" +
        "</div>" +
        '<span class="spacer"></span>' +
        '<button class="iconbtn' + (hintOn ? " on" : "") + '" data-act="hint" aria-label="힌트 보기">💡</button>' +
        '<button class="iconbtn" data-act="jump" aria-label="문항 이동">🗂️</button>' +
      "</div>" +
      '<div class="meta">' +
        '<span class="pill">' + esc(q.tag) + "</span>" +
        '<span class="segs">' + segs + "</span>" +
      "</div>" +
      '<div class="body">' +
        '<p class="qtext">' + stemHTML(q.q) + "</p>" +
        hintBox +
        '<ul class="opts' + (answered ? " locked" : "") + '">' + opts + "</ul>" +
        footnote +
      "</div>" +
      '<div class="foot">' +
        '<div class="stat">현재까지 <b>' + info.c + "/" + info.n + "</b> 정답 · 세트 #" + set.id + "</div>" +
        rightBtn +
      "</div>";

    var body = app.querySelector(".body");
    if (body) body.scrollTop = 0;
    app._allDone = allDone;
  }

  /* ---------- result ---------- */
  function setSummary(set, correct, total) {
    if (correct === total) return "이번 세트는 10문제 모두 맞혔어요. 다음 세트로 넘어가 볼까요?";
    if (correct === 0) return "이번 세트는 전부 놓쳤어요. 약점 유형부터 천천히 다시 보는 게 좋아요.";
    var acc = {};
    set.items.forEach(function (q, i) {
      var a = S().answers[i];
      if (a == null) return;
      acc[q.tag] = acc[q.tag] || { n: 0, c: 0 };
      acc[q.tag].n++;
      if (a === q.answer) acc[q.tag].c++;
    });
    var arr = Object.keys(acc).map(function (k) { return { tag: k, n: acc[k].n, c: acc[k].c, r: acc[k].c / acc[k].n }; });
    arr.sort(function (a, b) { return a.r - b.r; });
    var worst = arr[0];
    var best = arr.filter(function (x) { return x.r === 1; }).sort(function (a, b) { return b.n - a.n; })[0];
    var wrong = worst.n - worst.c;
    var msg = "";
    if (best) msg += josa(best.tag, "은/는") + " 안정적이고, ";
    msg += worst.tag + "에서 " + wrong + "문제를 놓쳤어요.";
    return msg;
  }

  function weakList() {
    var arr = Object.keys(store.byTag).filter(function (k) { return store.byTag[k].n > 0; })
      .map(function (k) {
        var v = store.byTag[k], p = pct(v.c, v.n);
        return { tag: k, n: v.n, c: v.c, p: p };
      });
    arr.sort(function (a, b) { return a.p - b.p || b.n - a.n; });
    return arr.slice(0, 3);
  }

  function renderResult() {
    var s = S(), set = SET();
    var total = 0, correct = 0;
    set.items.forEach(function (q, i) {
      if (s.answers[i] == null) return;
      total++;
      if (s.answers[i] === q.answer) correct++;
    });
    var cells = set.items.map(function (q, i) {
      var a = s.answers[i], ok = a === q.answer;
      return '<button class="cell ' + (ok ? "ok" : "no") + '" data-jump="' + i + '">' + (i + 1) +
        '<span class="mk">' + (ok ? "○" : "×") + "</span></button>";
    }).join("");

    var weak = weakList();
    var weakHTML = "";
    if (weak.length) {
      weakHTML = '<p class="sec">누적 약점 파트 분석 (' + store.completedSets + "세트 기준)</p>";
      weakHTML += weak.map(function (w) {
        return '<div class="weak"><span class="wrap"><span class="t">' + esc(w.tag) + "</span>" +
          '<span class="c">' + esc(CONCEPT[w.tag] || "") + "</span></span>" +
          '<span class="rate ' + rateClass(w.p) + '">정답률 ' + w.p + "%</span></div>";
      }).join("");
    }

    app.className = "card result";
    app.innerHTML =
      '<div class="rhead"><span class="t">세트 #' + set.id + ' 완료 · ETS 기출 유형</span>' +
        '<span class="rs">누적 ' + store.total.n + "문제 중 " + store.total.c + "정답</span></div>" +
      '<div class="body">' +
        '<div class="scorebox"><div class="score">' + correct + " <small>/ " + total + " 정답</small></div>" +
          '<div class="scorenote">' + esc(setSummary(set, correct, total)) + "</div></div>" +
        '<p class="sec">문항별 결과 (누르면 해설 다시 보기)</p>' +
        '<div class="grid5">' + cells + "</div>" +
        weakHTML +
        '<div class="rbtns">' +
          '<button class="btn solid wide" data-act="newset">다음 문제 풀기 (새 10문제)</button>' +
          '<button class="btn wide ghost" data-act="note">📝 지금까지 내용 종합해서 노션에 정리하기</button>' +
        "</div>" +
      "</div>";
  }

  function render() {
    var s = S();
    if (s.done && !s.review) renderResult(); else renderCard();
  }

  /* ---------- actions ---------- */
  function choose(qi, ci) {
    var s = S(), set = SET();
    if (s.answers[qi] != null) return;
    s.answers[qi] = ci;
    var q = set.items[qi], ok = ci === q.answer;
    store.total.n++;
    if (ok) store.total.c++;
    var t = store.byTag[q.tag] || (store.byTag[q.tag] = { n: 0, c: 0 });
    t.n++;
    if (ok) t.c++;
    if (!ok) {
      store.recent.unshift({ qid: q.id, tag: q.tag, picked: ci, answer: q.answer, ts: Date.now() });
      store.recent = store.recent.slice(0, 40);
    }
    save();
    render();
  }

  function openResult() {
    var s = S();
    if (!s.counted) {
      s.counted = true;
      store.completedSets = (store.completedSets || 0) + 1;
      if (store.cycleUsed.indexOf(s.setId) === -1) store.cycleUsed.push(s.setId);
    }
    s.done = true;
    s.review = false;
    save();
    render();
  }

  function nextSet() {
    store.cycleUsed = store.cycleUsed || [];
    var free = SETS.filter(function (x) { return store.cycleUsed.indexOf(x.id) === -1; });
    if (!free.length) { store.cycleUsed = []; free = SETS; }
    store.session = newSession(free[0].id);
    save();
    render();
  }

  /* ---------- sheet ---------- */
  function openSheet() {
    var s = S(), set = SET();
    var btns = set.items.map(function (q, i) {
      var a = s.answers[i];
      var cls = a == null ? "" : (a === q.answer ? " ok" : " no");
      if (!s.review && !s.done && i === s.idx) cls += " cur";
      return '<button class="jbtn' + cls + '" data-jump="' + i + '">' + (i + 1) + "</button>";
    }).join("");
    var allDone = s.answers.every(function (a) { return a != null; });
    overlay.innerHTML = '<div class="sheet"><h3>문항 이동</h3><div class="jump">' + btns + "</div>" +
      (allDone && !s.done ? '<button class="btn solid" data-act="result">결과 보기</button>' : '<button class="btn" data-act="closesheet">닫기</button>') +
      "</div>";
    overlay.hidden = false;
  }
  function closeOverlay() { overlay.hidden = true; overlay.innerHTML = ""; }

  /* ---------- notion report ---------- */
  function buildReport() {
    var total = store.total, rate = pct(total.c, total.n);
    var lines = [];
    lines.push("토익 Part 5 퀴즈 웹앱에서 쌓인 내 누적 풀이 기록이야. 이 내용을 노션에 정리해 줘.");
    lines.push("");
    lines.push("[정리 방식]");
    lines.push("- 오답 노트 나열이 아니라 약한 개념 기초 → 왜 필요한지 → 시험장 3초 팁 순서로 정리해 줘.");
    lines.push("- 기존 노션 NOTE 하단 정리에 이어 붙이되, 이미 있는 설명과 중복되지 않고 어우러지게 보완해 줘.");
    lines.push("- 새로 추가할 내용과 기존 정리에서 보강할 부분을 구분해서 알려 줘.");
    lines.push("");
    lines.push("[누적 현황]");
    lines.push("- 푼 문제: " + total.n + "문항 / 정답 " + total.c + " (정답률 " + rate + "%)");
    lines.push("- 완료한 세트: " + store.completedSets + "세트");

    var tags = Object.keys(store.byTag).filter(function (k) { return store.byTag[k].n > 0; })
      .map(function (k) {
        var v = store.byTag[k];
        return { tag: k, n: v.n, c: v.c, p: pct(v.c, v.n) };
      })
      .sort(function (a, b) { return a.p - b.p || b.n - a.n; });

    if (tags.length) {
      lines.push("");
      lines.push("[유형별 정답률 (낮은 순)]");
      tags.forEach(function (t) {
        lines.push("- " + t.tag + " — " + t.p + "% (" + t.c + "/" + t.n + ")");
      });
    }

    if (store.recent.length) {
      var cnt = {};
      store.recent.forEach(function (r) { cnt[r.tag] = (cnt[r.tag] || 0) + 1; });
      var patterns = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 6);
      lines.push("");
      lines.push("[주요 오답 패턴]");
      patterns.forEach(function (k) {
        lines.push("- " + k + " (" + esc(CONCEPT[k] || "") + ") — 최근 오답 " + cnt[k] + "회");
      });

      lines.push("");
      lines.push("[최근 오답 문항]");
      var shown = 0;
      store.recent.forEach(function (r) {
        if (shown >= 8) return;
        var found = null;
        SETS.forEach(function (st) {
          st.items.forEach(function (q) { if (q.id === r.qid) found = q; });
        });
        if (!found) return;
        lines.push("- " + found.q.replace("____", "____") + " | 내 답: " + found.choices[r.picked] + " / 정답: " + found.choices[r.answer]);
        shown++;
      });
    }

    lines.push("");
    lines.push("위 기록에서 정답률이 낮은 유형을 우선해서, 기존 NOTE와 겹치지 않는 보완 내용으로 정리해 줘.");
    return lines.join("\n");
  }

  function showNoteModal(text, copied) {
    overlay.innerHTML =
      '<div class="modal">' +
        "<h3>📝 노션 정리용 리포트</h3>" +
        (copied
          ? '<span class="copyok"><span class="dot">✓</span>클립보드에 복사했어요. 노션에 붙여넣으면 됩니다.</span>'
          : '<p>자동 복사가 막혀 있어요. 아래 내용을 직접 복사해 주세요.</p>') +
        '<p>누적 통계와 약점 유형, 그리고 정리 방식 요청이 함께 담겨 있어요. 그대로 복사해 저에게 붙여넣어 주세요.</p>' +
        '<textarea id="reportText" readonly>' + esc(text) + "</textarea>" +
        '<div class="row"><button class="btn" data-act="recopy">다시 복사</button>' +
        '<button class="btn solid" data-act="closemodal">닫기</button></div>' +
      "</div>";
    overlay.hidden = false;
    var ta = document.getElementById("reportText");
    if (ta && !copied) { ta.focus(); ta.select(); }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
    }
    return Promise.resolve(false);
  }
  function noteReport() {
    var text = buildReport();
    copyText(text).then(function (ok) { showNoteModal(text, ok); });
  }
  function recopy() {
    var ta = document.getElementById("reportText");
    var text = ta ? ta.value : buildReport();
    copyText(text).then(function (ok) {
      if (ok) { toast("클립보드에 복사했어요"); }
      else if (ta) { ta.focus(); ta.select(); toast("전체 선택했어요. 직접 복사해 주세요"); }
    });
  }

  /* ---------- events ---------- */
  app.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act],[data-opt],[data-jump]");
    if (!t) return;
    var s = S();

    if (t.hasAttribute("data-opt")) {
      choose(s.idx, Number(t.getAttribute("data-opt")));
      return;
    }
    if (t.hasAttribute("data-jump")) {
      s.idx = Number(t.getAttribute("data-jump"));
      s.review = s.done;
      save();
      closeOverlay();
      render();
      return;
    }
    var act = t.getAttribute("data-act");
    if (act === "prev") { if (s.idx > 0) { s.idx--; save(); render(); } }
    else if (act === "next") {
      if (s.answers[s.idx] == null) return;
      if (s.idx === 9) openResult();
      else { s.idx++; save(); render(); }
    }
    else if (act === "result") { openResult(); }
    else if (act === "toresult") { s.review = false; save(); render(); }
    else if (act === "hint") { s.hints[s.idx] = !s.hints[s.idx]; save(); render(); }
    else if (act === "jump") { openSheet(); }
    else if (act === "newset") { nextSet(); }
    else if (act === "note") { noteReport(); }
  });

  overlay.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act],[data-jump]");
    if (t) {
      var act = t.getAttribute("data-act");
      if (act === "closesheet" || act === "closemodal") { closeOverlay(); return; }
      if (act === "result") { closeOverlay(); openResult(); return; }
      if (act === "recopy") { recopy(); return; }
      if (t.hasAttribute("data-jump")) {
        var s = S();
        s.idx = Number(t.getAttribute("data-jump"));
        s.review = s.done;
        save(); closeOverlay(); render();
        return;
      }
    }
    if (e.target === overlay) closeOverlay();
  });

  document.addEventListener("keydown", function (e) {
    if (!overlay.hidden) { if (e.key === "Escape") closeOverlay(); return; }
    var s = S();
    if (s.done && !s.review) return;
    if (e.key === "ArrowLeft" && s.idx > 0) { s.idx--; save(); render(); }
    else if (e.key === "ArrowRight" && s.answers[s.idx] != null) {
      if (s.idx === 9) openResult(); else { s.idx++; save(); render(); }
    }
    else if (/^[1-4]$/.test(e.key)) {
      var i = Number(e.key) - 1;
      if (!e.target.closest(".modal")) choose(s.idx, i);
    }
  });

  render();
})();
