/* ANKUZO — cinematic entry, clock and cursor */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var boot = document.getElementById("boot");
  var fill = document.getElementById("boot-bar-fill");
  var pct = document.getElementById("boot-pct");
  var booted = false;
  var animationFrame = 0;

  function unbindSkip() {
    document.removeEventListener("keydown", skip);
    document.removeEventListener("pointerdown", skip);
  }

  function finish() {
    if (booted) return;
    booted = true;
    cancelAnimationFrame(animationFrame);
    unbindSkip();
    if (fill) fill.style.width = "100%";
    if (pct) pct.textContent = "100%";
    if (boot) boot.classList.add("done");
    document.body.classList.add("ready");
    window.dispatchEvent(new Event("ankuzo:ready"));
    window.setTimeout(function () {
      if (boot && booted) boot.style.display = "none";
    }, 850);
  }

  function skip(event) {
    if (event && event.type === "keydown" && !["Enter", " ", "Escape"].includes(event.key)) return;
    finish();
  }

  function runBoot() {
    var startedAt = performance.now();
    var duration = reduce ? 260 : 1750;
    function frame(now) {
      if (booted) return;
      var raw = Math.min(1, (now - startedAt) / duration);
      var eased = 1 - Math.pow(1 - raw, 3);
      var value = Math.min(100, Math.round(eased * 100));
      if (fill) fill.style.width = value + "%";
      if (pct) pct.textContent = value + "%";
      if (raw < 1) animationFrame = requestAnimationFrame(frame);
      else window.setTimeout(finish, reduce ? 60 : 220);
    }
    animationFrame = requestAnimationFrame(frame);
  }

  function prepareBoot() {
    booted = false;
    if (fill) fill.style.width = "0";
    if (pct) pct.textContent = "0%";
    if (boot) {
      boot.style.display = "flex";
      boot.classList.remove("done");
    }
    document.addEventListener("keydown", skip);
    document.addEventListener("pointerdown", skip);
    runBoot();
  }

  window.ankuzoReplayBoot = prepareBoot;
  prepareBoot();

  /* live UTC clock + local page uptime */
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
  window.setInterval(tick, 1000);

  /* custom cursor */
  var cur = document.getElementById("cursor");
  if (cur && window.matchMedia("(pointer:fine)").matches) {
    var tx = -40, ty = -40, cx = -40, cy = -40;
    document.addEventListener("mousemove", function (event) {
      tx = event.clientX;
      ty = event.clientY;
    });
    (function animateCursor() {
      cx += (tx - cx) * .24;
      cy += (ty - cy) * .24;
      cur.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)";
      requestAnimationFrame(animateCursor);
    })();
    document.addEventListener("mouseover", function (event) {
      if (event.target.closest("a,button")) cur.classList.add("hot");
    });
    document.addEventListener("mouseout", function (event) {
      if (event.target.closest("a,button") && !(event.relatedTarget && event.relatedTarget.closest && event.relatedTarget.closest("a,button"))) {
        cur.classList.remove("hot");
      }
    });
    document.addEventListener("pointerdown", function () { cur.classList.add("pressed"); });
    document.addEventListener("pointerup", function () { cur.classList.remove("pressed"); });
    document.addEventListener("pointercancel", function () { cur.classList.remove("pressed"); });
  }
})();
