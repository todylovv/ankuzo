/* ============================================================
   ANKUZO_OS — boot sequence, clock, cursor, uptime
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var boot = document.getElementById("boot");
  var log = document.getElementById("boot-log");
  var fill = document.getElementById("boot-bar-fill");
  var pct = document.getElementById("boot-pct");
  var booted = false;

  var LINES = [
    { t: "СИСТЕМА ANKUZO", c: "" },
    { t: "инициализация ядра…", ok: true },
    { t: "загрузка слоя идентичности…", ok: true },
    { t: "поиск Steam-узлов…", ok: true },
    { t: "объединение игровых часов…", ok: true },
    { t: "PSN ID найден: ankkui", c: "comment" },
    { t: "загрузка кубков…", ok: true },
    { t: "Discord-сигнал найден: ankuz0", c: "comment" },
    { t: "маршрут связи заблокирован на Discord…", ok: true },
    { t: "ДОСТУП РАЗРЕШЁН", c: "ready" }
  ];

  function finish() {
    if (booted) return;
    booted = true;
    boot.classList.add("done");
    document.body.classList.add("ready");
    window.dispatchEvent(new Event("ankuzo:ready"));
    setTimeout(function () { boot.style.display = "none"; }, 900);
  }

  function skipped() {
    document.removeEventListener("keydown", skipped);
    document.removeEventListener("click", skipped);
    finish();
  }

  function runBoot() {
    var i = 0, n = LINES.length;
    function step() {
      if (booted) return;
      if (i >= n) {
        fill.style.width = "100%";
        pct.textContent = "100%";
        setTimeout(finish, 480);
        return;
      }
      var L = LINES[i];
      var el = document.createElement("div");
      el.className = "ln" + (L.c ? " " + L.c : "");
      if (L.ok) {
        el.innerHTML = L.t + " <span class='ok'>……… ok</span>";
      } else if (L.c === "ready") {
        el.innerHTML = L.t + " <span class='cur'></span>";
      } else {
        el.textContent = L.t;
      }
      log.appendChild(el);
      i++;
      var p = Math.round((i / n) * 100);
      fill.style.width = p + "%";
      pct.textContent = p + "%";
      var delay = L.c === "ready" ? 240 : 300;
      setTimeout(step, delay);
    }
    step();
  }

  document.addEventListener("keydown", skipped);
  document.addEventListener("click", skipped);

  window.ankuzoReplayBoot = function () {
    booted = false;
    log.innerHTML = "";
    fill.style.width = "0";
    pct.textContent = "0%";
    boot.style.display = "flex";
    boot.classList.remove("done");
    document.addEventListener("keydown", skipped);
    document.addEventListener("click", skipped);
    requestAnimationFrame(runBoot);
  };

  if (reduce) {
    LINES.forEach(function (L) {
      var el = document.createElement("div");
      el.className = "ln" + (L.c ? " " + L.c : "");
      el.textContent = L.t + (L.ok ? " … ok" : "");
      log.appendChild(el);
    });
    fill.style.width = "100%"; pct.textContent = "100%";
    setTimeout(finish, 400);
  } else {
    requestAnimationFrame(runBoot);
  }

  /* ---------------- live clock + uptime ---------------- */
  var clock = document.getElementById("clock");
  var uptimeEl = document.getElementById("uptime");
  var start = Date.now();
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function tick() {
    var d = new Date();
    var date = d.getUTCFullYear() + "." + pad(d.getUTCMonth() + 1) + "." + pad(d.getUTCDate());
    if (clock) clock.textContent = date + " · " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()) + " UTC";
    var up = Math.floor((Date.now() - start) / 1000);
    if (uptimeEl) uptimeEl.textContent = pad(Math.floor(up / 3600)) + ":" + pad(Math.floor((up % 3600) / 60)) + ":" + pad(up % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------------- custom cursor ---------------- */
  var cur = document.getElementById("cursor");
  var tag = document.getElementById("cursor-tag");
  var readout = document.getElementById("cursor-readout");
  function pad4(n) { n = "" + n; while (n.length < 4) n = "0" + n; return n; }
  if (cur && window.matchMedia("(pointer:fine)").matches) {
    var tx = 0, ty = 0;
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!tag.classList.contains("on")) tag.classList.add("on");
      var sx = pad4(Math.round(e.clientX)), sy = pad4(Math.round(e.clientY));
      if (tag) tag.textContent = sx + " . " + sy;
      if (readout) readout.textContent = "x " + sx + " · y " + sy;
    });
    (function raf() {
      cur.style.transform = "translate(" + tx + "px," + ty + "px) translate(-50%,-50%)";
      tag.style.left = tx + "px"; tag.style.top = ty + "px";
      requestAnimationFrame(raf);
    })();
    var hotSel = "a,button";
    document.addEventListener("mouseover", function (e) { if (e.target.closest(hotSel)) cur.classList.add("hot"); });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(hotSel) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(hotSel)))
        cur.classList.remove("hot");
    });
  }
})();
