/* ============================================================
   ANKUZO_OS — interface behaviour
   SYSTEM CORE (3D) · reveals · nav · copy · presence · marquee
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BAR = 44;

  /* ---------- split wordmark into characters ---------- */
  var wm = document.getElementById("wordmark");
  if (wm) {
    var text = wm.textContent.trim();
    wm.textContent = "";
    text.split("").forEach(function (c, i) {
      var s = document.createElement("span");
      s.className = "ch"; s.textContent = c;
      s.style.animationDelay = (0.15 + i * 0.06) + "s";
      wm.appendChild(s);
    });
  }

  /* ============================================================
     SYSTEM CORE — canvas-rendered rotating wireframe
     ============================================================ */
  (function core() {
    var canvas = document.getElementById("core-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var cx = 0, cy = 0, R = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.max(1, Math.round(W * DPR));
      canvas.height = Math.max(1, Math.round(H * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx = W / 2; cy = H / 2;
      R = Math.min(W, H) * 0.33;
    }
    resize();
    window.addEventListener("resize", resize);

    // --- icosahedron geometry ---
    var t = (1 + Math.sqrt(5)) / 2;
    var V = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    // normalize to unit
    var maxLen = Math.sqrt(1 + t * t);
    V = V.map(function (p) { return [p[0] / maxLen, p[1] / maxLen, p[2] / maxLen]; });
    // edges by nearest-distance
    var edges = [];
    for (var a = 0; a < V.length; a++) {
      for (var b = a + 1; b < V.length; b++) {
        var dx = V[a][0] - V[b][0], dy = V[a][1] - V[b][1], dz = V[a][2] - V[b][2];
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < 1.12) edges.push([a, b]);
      }
    }
    // inner octahedron (counter-rotating)
    var V2 = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    var edges2 = [];
    for (var i2 = 0; i2 < V2.length; i2++)
      for (var j2 = i2 + 1; j2 < V2.length; j2++) {
        var ddx = V2[i2][0]-V2[j2][0], ddy = V2[i2][1]-V2[j2][1], ddz = V2[i2][2]-V2[j2][2];
        if (Math.sqrt(ddx*ddx+ddy*ddy+ddz*ddz) < 1.6) edges2.push([i2, j2]);
      }

    // orbiting particles
    var parts = [];
    for (var p = 0; p < 46; p++) {
      parts.push({
        a: Math.random() * Math.PI * 2,
        inc: (Math.random() - 0.5) * 1.4,
        rad: 1.25 + Math.random() * 0.85,
        spd: 0.0008 + Math.random() * 0.0016,
        ph: Math.random() * Math.PI * 2
      });
    }

    var rotX = -0.35, rotY = 0.4;
    var tRotX = -0.35, tRotY = 0.4;
    var mouseInfluence = false;

    document.addEventListener("mousemove", function (e) {
      var rect = canvas.getBoundingClientRect();
      var nx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      var ny = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      // only react when pointer is reasonably near the stage
      if (Math.abs(nx) < 1.6 && Math.abs(ny) < 1.6) {
        tRotY = 0.4 + nx * 0.6;
        tRotX = -0.35 + ny * 0.5;
        mouseInfluence = true;
      }
    });

    function rotate(pt, ax, ay) {
      var x = pt[0], y = pt[1], z = pt[2];
      // Y axis
      var cosy = Math.cos(ay), siny = Math.sin(ay);
      var x1 = x * cosy - z * siny, z1 = x * siny + z * cosy;
      // X axis
      var cosx = Math.cos(ax), sinx = Math.sin(ax);
      var y1 = y * cosx - z1 * sinx, z2 = y * sinx + z1 * cosx;
      return [x1, y1, z2];
    }
    function project(pt) {
      var fov = 3.0;
      var scale = fov / (fov + pt[2]);
      return { x: cx + pt[0] * R * scale, y: cy + pt[1] * R * scale, z: pt[2], s: scale };
    }

    var time = 0, last = performance.now(), running = true;
    document.addEventListener("visibilitychange", function () {
      running = !document.hidden;
      if (running) { last = performance.now(); requestAnimationFrame(frame); }
    });

    function frame(now) {
      if (!running) return;
      var dt = Math.min(60, now - last); last = now;
      time += dt;

      // auto-rotate + ease toward mouse target
      if (!mouseInfluence) { tRotY += 0.00022 * dt; }
      else { tRotY += 0.00012 * dt; }
      rotX += (tRotX - rotX) * 0.05;
      rotY += (tRotY - rotY) * 0.05;
      var spin = time * 0.00025;

      ctx.clearRect(0, 0, W, H);

      // core glow
      var pulse = 0.5 + 0.5 * Math.sin(time * 0.0016);
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.5);
      grad.addColorStop(0, "rgba(194,255,26," + (0.16 + pulse * 0.10) + ")");
      grad.addColorStop(0.4, "rgba(194,255,26,0.05)");
      grad.addColorStop(1, "rgba(194,255,26,0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

      // inner counter-rotating octahedron
      var proj2 = V2.map(function (v) { return project(rotate(v, -rotX * 1.3, -rotY * 1.6 - spin * 2)); });
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(232,236,230,0.18)";
      edges2.forEach(function (e) {
        ctx.beginPath();
        ctx.moveTo(proj2[e[0]].x, proj2[e[0]].y);
        ctx.lineTo(proj2[e[1]].x, proj2[e[1]].y);
        ctx.stroke();
      });

      // main icosahedron
      var proj = V.map(function (v) {
        var sc = 1.55;
        return project(rotate([v[0]*sc, v[1]*sc, v[2]*sc], rotX, rotY + spin));
      });
      edges.forEach(function (e) {
        var p1 = proj[e[0]], p2 = proj[e[1]];
        var depth = (p1.z + p2.z) / 2; // -1..1
        var front = (depth + 1.6) / 3.2; // 0..1ish
        ctx.lineWidth = 0.6 + front * 1.3;
        ctx.strokeStyle = "rgba(194,255,26," + (0.10 + front * 0.55) + ")";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
      // vertices
      proj.forEach(function (p) {
        var front = (p.z + 1.6) / 3.2;
        var r = 1.4 + front * 3.0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232,236,230," + (0.4 + front * 0.6) + ")";
        ctx.fill();
        if (front > 0.7) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(194,255,26,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        }
      });

      // orbiting particles
      parts.forEach(function (q) {
        q.a += q.spd * dt;
        var px = Math.cos(q.a) * q.rad;
        var pz = Math.sin(q.a) * q.rad;
        var py = Math.sin(q.a * 0.6 + q.ph) * q.inc;
        var pr = project(rotate([px, py, pz], rotX, rotY + spin));
        var front = (pr.z + 1.6) / 3.2;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 0.6 + front * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(194,255,26," + (0.12 + front * 0.5) + ")";
        ctx.fill();
      });

      // bright core dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.6 + pulse * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(194,255,26," + (0.6 + pulse * 0.4) + ")";
      ctx.fill();

      requestAnimationFrame(frame);
    }

    if (reduce) {
      // draw a single static frame
      last = performance.now(); time = 1000; running = true;
      frame(performance.now()); running = false;
    } else {
      // paint first frame synchronously, then self-scheduling loop continues
      last = performance.now();
      frame(performance.now());
    }
  })();

  /* ---------- scroll reveals ---------- */
  function bindReveals() {
    var els = document.querySelectorAll(".rv");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- presence bars ---------- */
  function bindPresence() {
    var bars = document.querySelectorAll(".prow .track i");
    if (!("IntersectionObserver" in window)) {
      bars.forEach(function (b) { b.style.width = (b.getAttribute("data-w") || 50) + "%"; });
      return;
    }
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var b = en.target;
          setTimeout(function () { b.style.width = (b.getAttribute("data-w") || 50) + "%"; }, 120);
          pio.unobserve(b);
        }
      });
    }, { threshold: 0.5 });
    bars.forEach(function (b) { pio.observe(b); });
  }

  /* ---------- rail nav ---------- */
  var railLinks = Array.prototype.slice.call(document.querySelectorAll(".rail a"));
  function scrollToId(id) {
    var el = document.getElementById(id); if (!el) return;
    var top = el.getBoundingClientRect().top + window.pageYOffset - BAR - 8;
    window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
  }
  railLinks.forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); scrollToId(a.getAttribute("data-go")); });
  });
  var sectionIds = ["core", "identity", "steam", "ps5", "signal"];
  function setActive(go) { railLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-go") === go); }); }
  if ("IntersectionObserver" in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sectionIds.forEach(function (id) { var el = document.getElementById(id); if (el) sio.observe(el); });
  }
  setActive("core");

  /* ---------- replay boot from brand badge ---------- */
  var brand = document.querySelector(".topbar .brand");
  if (brand) {
    brand.addEventListener("click", function () { if (window.ankuzoReplayBoot) window.ankuzoReplayBoot(); });
    brand.title = "перезапустить загрузку";
  }

  /* ---------- glitch on wordmark ---------- */
  function glitch() {
    if (!wm || reduce || document.hidden) return;
    wm.classList.add("glitch");
    setTimeout(function () { wm.classList.remove("glitch"); }, 460);
  }
  function scheduleGlitch() { setTimeout(function () { glitch(); scheduleGlitch(); }, 4500 + Math.random() * 6000); }

  /* ---------- bottom marquee ---------- */
  var marq = document.getElementById("marq");
  if (marq) {
    var bits = [
      "// приватный интерфейс инициализирован", "ядро стабильно", "слой идентичности активен",
      "подключённые узлы обнаружены", "основной сигнал: Discord", "публичные каналы отключены",
      "маршрут связи: только Discord", "присутствие включено", "узел ANKUZO активен"
    ];
    var html = "";
    bits.forEach(function (b) { html += "<span>" + (b.indexOf("//") === 0 ? "<i>" + b + "</i>" : b) + "</span>"; });
    marq.innerHTML = html + html;
  }

  /* ---------- copy buttons (Discord + PSN) ---------- */
  var toast = document.getElementById("toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 1600);
  }
  function copyText(str) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(str).catch(function () { return fallbackCopy(str); });
    }
    return Promise.resolve(fallbackCopy(str));
  }
  function fallbackCopy(str) {
    try {
      var ta = document.createElement("textarea");
      ta.value = str; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
  }
  // Discord copy buttons (have .done state + label swap)
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var label = btn.querySelector("span:first-child");
    var original = label ? label.textContent : "";
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy")).then(function () {
        showToast("СКОПИРОВАНО · ankuz0");
        btn.classList.add("done");
        if (label) label.textContent = "СКОПИРОВАНО";
        clearTimeout(btn._t);
        btn._t = setTimeout(function () {
          btn.classList.remove("done");
          if (label) label.textContent = original;
        }, 1800);
      });
    });
  });
  // PSN copy targets
  ["psn-copy", "psn-copy-2"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function () {
      copyText("ankkui").then(function () { showToast("СКОПИРОВАНО · ankkui"); });
    });
  });

  /* ---------- public JSON data ---------- */
  var steamMockData = {
    source: "fallback",
    stats: { totalHours: 4952, totalGames: 190 },
    profiles: [
      { steamId: "76561199770575251", nickname: "b1", avatarUrl: "./assets/steam-b1.jpg", totalHours: null, games: [
        { name: "Counter-Strike 2", hours: 842 },
        { name: "Dota 2", hours: 416 },
        { name: "Grand Theft Auto V", hours: 231 },
        { name: "Cyberpunk 2077", hours: 128 },
        { name: "ELDEN RING", hours: 94 }
      ]},
      { steamId: "76561198165374024", nickname: "b2", avatarUrl: "./assets/steam-b2.jpg", totalHours: null, games: [
        { name: "Rust", hours: 604 },
        { name: "PUBG: BATTLEGROUNDS", hours: 287 },
        { name: "Apex Legends", hours: 173 },
        { name: "The Witcher 3", hours: 112 },
        { name: "Red Dead Redemption 2", hours: 86 }
      ]}
    ]
  };
  var psnMockData = {
    source: "fallback",
    psnId: "ankkui",
    trophies: { total: 1234, platinum: 12, gold: 84, silver: 310, bronze: 828, level: 286 },
    library: [
      { title: "Marvel's Spider-Man 2", platform: "PS5", trophyProgress: 68 },
      { title: "God of War Ragnarök", platform: "PS5", trophyProgress: 41 },
      { title: "Ghost of Tsushima", platform: "PS5", trophyProgress: 100 },
      { title: "The Last of Us Part II", platform: "PS5", trophyProgress: 73 },
      { title: "Gran Turismo 7", platform: "PS5", trophyProgress: 28 }
    ]
  };
  var discordMockData = {
    source: "fallback",
    username: "ankuz0",
    displayName: "anku",
    bio: "Discord — единственный активный канал связи.",
    presence: "dnd",
    bannerUrl: "./assets/discord-banner.webp",
    decorationUrl: "./assets/discord-avatar-decoration.png",
    badges: ["Nitro", "HypeSquad Bravery"],
    status: "ОСНОВНОЙ СИГНАЛ",
    avatarUrl: "./assets/discord-avatar.webp"
  };

  function safeText(value, fallback) {
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }
  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = safeText(value, "—");
  }
  function loadJson(path, fallback) {
    return fetch(path, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Данные недоступны");
        return response.json();
      })
      .catch(function () { return fallback; });
  }
  function renderSteam(data) {
    var profiles = Array.isArray(data.profiles) ? data.profiles : [];
    var totals = {};
    profiles.forEach(function (profile) {
      (Array.isArray(profile.games) ? profile.games : []).forEach(function (game) {
        var name = safeText(game.name, "Неизвестная игра");
        var hours = Number(game.hours || game.playtimeHours || 0);
        totals[name] = (totals[name] || 0) + hours;
      });
    });
    var games = Object.keys(totals).map(function (name) { return { name: name, hours: totals[name] }; });
    if (!games.length && Array.isArray(data.top)) games = data.top.slice();
    games.sort(function (a, b) { return b.hours - a.hours; });
    var profileHours = profiles.reduce(function (sum, profile) {
      return sum + Number(profile.totalHours || 0);
    }, 0);
    var totalHours = Number(data.stats && data.stats.totalHours) || profileHours ||
      games.reduce(function (sum, game) { return sum + Number(game.hours || 0); }, 0);
    setText("steam-hours", Math.round(totalHours).toLocaleString("ru-RU"));
    setText("steam-games", Number(data.stats && data.stats.totalGames) || games.length);
    setText("steam-profiles", profiles.length || 2);
    var source = document.getElementById("steam-source");
    if (source) source.innerHTML = "данные<br>" + (data.source === "api" ? "API · обновлены" : "резервный режим");

    var cards = document.getElementById("steam-account-cards");
    if (cards) {
      cards.textContent = "";
      profiles.forEach(function (profile, index) {
        var card = document.createElement("article");
        card.className = "steam-account";
        card.innerHTML = "<img class='steam-account-avatar' alt=''>" +
          "<div class='steam-account-copy'><small></small><h3></h3><p></p></div>" +
          "<div class='steam-account-hours'><strong></strong><span>ЧАСОВ</span></div>" +
          "<a class='steam-account-link' target='_blank' rel='noopener noreferrer' aria-label='Открыть Steam-профиль'></a>";
        var avatar = card.querySelector("img");
        avatar.src = profile.avatarUrl || (index ? "./assets/steam-b2.jpg" : "./assets/steam-b1.jpg");
        avatar.alt = "Аватар Steam " + safeText(profile.nickname, "профиля");
        card.querySelector("small").textContent = "STEAM УЗЕЛ_0" + (index + 1);
        card.querySelector("h3").textContent = safeText(profile.nickname, "Профиль " + (index + 1));
        card.querySelector("p").textContent = profile.online ? "В СЕТИ" : "НЕ В СЕТИ";
        card.querySelector("strong").textContent = profile.totalHours === null || profile.totalHours === undefined
          ? "—" : Math.round(profile.totalHours).toLocaleString("ru-RU");
        card.querySelector("a").href = profile.profileUrl || "#";
        cards.appendChild(card);
      });
    }

    var topThree = document.getElementById("steam-top-three");
    if (topThree) {
      topThree.textContent = "";
      var max = games[0] ? games[0].hours : 1;
      games.slice(0, 3).forEach(function (game, index) {
        var item = document.createElement("div");
        item.className = "top-game";
        item.innerHTML = "<span class='place'>0" + (index + 1) + "</span>" +
          "<span class='game-name'></span><span class='game-hours'></span>" +
          "<span class='game-track'><i></i></span>";
        item.querySelector(".game-name").textContent = game.name;
        item.querySelector(".game-hours").textContent = Math.round(game.hours) + " ч";
        item.querySelector(".game-track i").style.setProperty("--width", Math.max(4, game.hours / max * 100) + "%");
        topThree.appendChild(item);
      });
    }
    var topTen = document.getElementById("steam-top-ten");
    if (topTen) {
      topTen.textContent = "";
      games.slice(0, 10).forEach(function (game) {
        var li = document.createElement("li");
        var name = document.createElement("b");
        var hours = document.createElement("span");
        name.textContent = game.name;
        hours.textContent = Math.round(game.hours) + " ч";
        li.appendChild(name); li.appendChild(hours); topTen.appendChild(li);
      });
    }
  }
  function renderPsn(data) {
    var trophies = data.trophies || {};
    setText("psn-id", data.psnId || "ankkui");
    setText("psn-level", trophies.level);
    setText("trophy-total", trophies.total);
    setText("trophy-platinum", trophies.platinum);
    setText("trophy-gold", trophies.gold);
    setText("trophy-silver", trophies.silver);
    setText("trophy-bronze", trophies.bronze);
    var source = document.getElementById("psn-source");
    if (source) source.innerHTML = "PSN ID<br>" + safeText(data.psnId, "ankkui") +
      " · " + (data.source === "api" ? "API" : "резерв");
    var library = document.getElementById("psn-library");
    if (!library) return;
    var games = Array.isArray(data.library) ? data.library : [];
    setText("psn-library-count", games.length);
    library.textContent = "";
    games.forEach(function (game) {
      var progress = Math.max(0, Math.min(100, Number(game.trophyProgress || 0)));
      var row = document.createElement("div");
      row.className = "library-game";
      row.innerHTML = "<img loading='lazy' alt=''><b></b><span></span><div class='progress'><i></i></div>";
      row.querySelector("img").src = game.iconUrl || game.icon || "";
      row.querySelector("img").alt = "Обложка " + safeText(game.title, "игры");
      row.querySelector("b").textContent = safeText(game.title, "Игра");
      row.querySelector("span").textContent = safeText(game.platform, "PS5") + " · " + progress + "%";
      row.querySelector("i").style.setProperty("--progress", progress + "%");
      library.appendChild(row);
    });
    var toggle = document.getElementById("psn-library-toggle");
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", function () {
        var expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        toggle.textContent = expanded ? "ПОКАЗАТЬ БИБЛИОТЕКУ" : "СКРЫТЬ БИБЛИОТЕКУ";
        library.classList.toggle("is-collapsed", expanded);
      });
    }
  }
  function renderDiscord(data) {
    var username = safeText(data.username, "ankuz0");
    setText("discord-name", safeText(data.displayName, username));
    setText("discord-username", username);
    setText("discord-bio", safeText(data.bio, "Discord — единственный активный канал связи."));
    document.querySelectorAll("[data-copy]").forEach(function (button) {
      button.setAttribute("data-copy", username);
    });
    var avatar = document.getElementById("discord-avatar");
    if (avatar && data.avatarUrl) {
      avatar.textContent = "";
      var image = document.createElement("img");
      image.src = data.avatarUrl;
      image.alt = "Аватар Discord " + username;
      image.loading = "lazy";
      avatar.appendChild(image);
    }
    var banner = document.getElementById("discord-banner");
    if (banner && data.bannerUrl) banner.style.backgroundImage = "url('" + data.bannerUrl + "')";
    var decoration = document.getElementById("discord-decoration");
    if (decoration && data.decorationUrl) decoration.src = data.decorationUrl;
    var presence = document.getElementById("discord-presence");
    if (presence) presence.className = "discord-presence " + safeText(data.presence, "offline");
    var badges = document.getElementById("discord-badges");
    if (badges) {
      badges.textContent = "";
      (Array.isArray(data.badges) ? data.badges : []).forEach(function (badge) {
        var el = document.createElement("span");
        el.className = "discord-badge";
        el.textContent = badge;
        badges.appendChild(el);
      });
    }
  }
  function loadPublicData() {
    return Promise.all([
      loadJson("./data/steam.json", steamMockData).then(renderSteam),
      loadJson("./data/psn.json", psnMockData).then(renderPsn),
      loadJson("./data/discord.json", discordMockData).then(renderDiscord)
    ]);
  }

  /* ---------- init ---------- */
  function init() { bindReveals(); bindPresence(); scheduleGlitch(); loadPublicData(); }
  if (document.body.classList.contains("ready")) init();
  else window.addEventListener("ankuzo:ready", init, { once: true });
  setTimeout(function () { if (!document.querySelector(".rv.in")) { bindReveals(); bindPresence(); } }, 4500);
})();
