/* ============================================================
   ANKUZO_OS — interface behaviour
   SYSTEM CORE (3D) · reveals · nav · copy · presence · marquee
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BAR = 44;

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
  function setActive(go) {
    railLinks.forEach(function (a) {
      var active = a.getAttribute("data-go") === go;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }
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
      return navigator.clipboard.writeText(str).catch(function () {
        if (!fallbackCopy(str)) throw new Error("Копирование недоступно");
      });
    }
    return fallbackCopy(str) ? Promise.resolve() : Promise.reject(new Error("Копирование недоступно"));
  }
  function fallbackCopy(str) {
    var ta;
    try {
      ta = document.createElement("textarea");
      ta.value = str; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      return document.execCommand("copy");
    } catch (e) {
      return false;
    } finally {
      if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
    }
  }
  // Discord copy buttons (have .done state + label swap)
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var label = btn.querySelector("span:first-child");
    var original = label ? label.textContent : "";
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy"))
        .then(function () {
          showToast("СКОПИРОВАНО · " + btn.getAttribute("data-copy"));
          btn.classList.add("done");
          if (label) label.textContent = "СКОПИРОВАНО";
          clearTimeout(btn._t);
          btn._t = setTimeout(function () {
            btn.classList.remove("done");
            if (label) label.textContent = original;
          }, 1800);
        })
        .catch(function () { showToast("НЕ УДАЛОСЬ СКОПИРОВАТЬ"); });
    });
  });
  // PSN copy targets
  ["psn-copy", "psn-copy-2"].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", function () {
      copyText("ankkui")
        .then(function () { showToast("СКОПИРОВАНО · ankkui"); })
        .catch(function () { showToast("НЕ УДАЛОСЬ СКОПИРОВАТЬ"); });
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
    decorationUrl: "",
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
  function formatDate(value) {
    var date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "дата неизвестна";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(date);
  }
  function setSource(id, heading, data) {
    var el = document.getElementById(id);
    if (!el) return;
    var live = data.source === "api" && data.status !== "unavailable";
    el.replaceChildren(
      document.createTextNode(heading),
      document.createElement("br"),
      document.createTextNode((live ? "API · " : "резерв · ") +
        formatDate(live ? (data.lastSuccessfulAt || data.updatedAt) : data.lastSuccessfulAt))
    );
    el.classList.toggle("source-stale", !live);
  }
  function normalizeTitle(value) {
    return safeText(value, "").toLocaleLowerCase("ru-RU")
      .replace(/[™®©]/g, "")
      .replace(/[^a-zа-яё0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
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
    setSource("steam-source", "данные", data);

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
        var fallbackAvatar = index ? "./assets/steam-b2.jpg" : "./assets/steam-b1.jpg";
        avatar.src = profile.avatarUrl || fallbackAvatar;
        avatar.loading = "lazy";
        avatar.alt = "Аватар Steam " + safeText(profile.nickname, "профиля");
        avatar.addEventListener("error", function () { avatar.src = fallbackAvatar; }, { once: true });
        card.querySelector("small").textContent = "STEAM УЗЕЛ_0" + (index + 1);
        card.querySelector("h3").textContent = safeText(profile.nickname, "Профиль " + (index + 1));
        card.querySelector("p").textContent = profile.online ? "В СЕТИ" : "НЕ В СЕТИ";
        card.querySelector("strong").textContent = profile.totalHours === null || profile.totalHours === undefined
          ? "—" : Math.round(profile.totalHours).toLocaleString("ru-RU");
        var link = card.querySelector("a");
        if (profile.profileUrl) link.href = profile.profileUrl;
        else link.remove();
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
    setSource("psn-source", "PSN · " + safeText(data.psnId, "ankkui"), data);
    var library = document.getElementById("psn-library");
    if (!library) return;
    var uniqueGames = new Map();
    (Array.isArray(data.library) ? data.library : []).forEach(function (game) {
      var key = normalizeTitle(game.title) + "|" + normalizeTitle(game.platform);
      if (key !== "|" && !uniqueGames.has(key)) uniqueGames.set(key, game);
    });
    var games = Array.from(uniqueGames.values());
    var progressLooksUnknown = games.length > 0 && games.every(function (game) {
      return Number(game.trophyProgress || 0) === 0 && game.trophyMatched !== true;
    });
    setText("psn-library-count", games.length);
    library.textContent = "";
    library.hidden = true;
    function renderLibrary() {
      if (library.dataset.rendered) return;
      var fragment = document.createDocumentFragment();
      games.forEach(function (game) {
        var rawProgress = game.trophyProgress;
        var known = !progressLooksUnknown && rawProgress !== null && rawProgress !== undefined;
        var progress = known ? Math.max(0, Math.min(100, Number(rawProgress))) : 0;
        var row = document.createElement("div");
        row.className = "library-game" + (known ? "" : " progress-unknown");
        row.innerHTML = "<img loading='lazy' alt=''><b></b><span></span><div class='progress'><i></i></div>";
        var image = row.querySelector("img");
        var imageUrl = game.iconUrl || game.icon || "";
        if (imageUrl) image.src = imageUrl;
        else image.hidden = true;
        image.alt = "Обложка " + safeText(game.title, "игры");
        image.addEventListener("error", function () { image.hidden = true; }, { once: true });
        row.querySelector("b").textContent = safeText(game.title, "Игра");
        row.querySelector("span").textContent = safeText(game.platform, "PlayStation") +
          " · " + (known ? progress + "%" : "нет данных");
        row.querySelector("i").style.setProperty("--progress", progress + "%");
        fragment.appendChild(row);
      });
      library.appendChild(fragment);
      library.dataset.rendered = "true";
    }
    var toggle = document.getElementById("psn-library-toggle");
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", function () {
        var expanded = toggle.getAttribute("aria-expanded") === "true";
        if (!expanded) renderLibrary();
        toggle.setAttribute("aria-expanded", String(!expanded));
        toggle.textContent = expanded ? "ПОКАЗАТЬ БИБЛИОТЕКУ" : "СКРЫТЬ БИБЛИОТЕКУ";
        library.hidden = expanded;
      });
    }
  }
  function renderDiscord(data) {
    var username = safeText(data.username, "ankuz0");
    setText("discord-name", safeText(data.displayName, username));
    setText("discord-username", username);
    setText("discord-bio", safeText(data.bio, "Discord — единственный активный канал связи."));
    setSource("signal-source", "Discord", data);
    var live = data.source === "api" && data.status !== "unavailable";
    setText("discord-signal-state", live ? "сигнал актуален" : "резервные данные");
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
      image.addEventListener("error", function () {
        avatar.textContent = username.slice(0, 2).toUpperCase();
      }, { once: true });
      avatar.appendChild(image);
    }
    var banner = document.getElementById("discord-banner");
    if (banner && data.bannerUrl) {
      banner.style.backgroundImage = "url('" + data.bannerUrl + "'),url('./assets/discord-banner.webp')";
    }
    var decoration = document.getElementById("discord-decoration");
    if (decoration && data.decorationUrl) {
      decoration.src = data.decorationUrl;
      decoration.addEventListener("error", function () { decoration.hidden = true; }, { once: true });
    }
    var presence = document.getElementById("discord-presence");
    if (presence) {
      var presenceValue = safeText(data.presence, "offline");
      presence.className = "discord-presence " + presenceValue;
      presence.setAttribute("aria-label", "Статус Discord: " + presenceValue);
    }
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
  function init() { bindReveals(); loadPublicData(); }
  if (document.body.classList.contains("ready")) init();
  else window.addEventListener("ankuzo:ready", init, { once: true });
  setTimeout(function () { if (!document.querySelector(".rv.in")) bindReveals(); }, 4500);
})();

/* ---------- showcase motion layer ---------- */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var progress = document.getElementById("scroll-progress-fill");
  var core = document.querySelector(".core-stage");
  var ticking = false;

  function updateScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.setProperty("--scroll-progress", Math.min(100, window.scrollY / max * 100) + "%");
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  updateScroll();

  if (!fine || reduce) return;

  document.addEventListener("pointermove", function (event) {
    document.body.style.setProperty("--pointer-x", event.clientX + "px");
    document.body.style.setProperty("--pointer-y", event.clientY + "px");
    if (core && window.scrollY < window.innerHeight) {
      var dx = (event.clientX / window.innerWidth - .5) * 12;
      var dy = (event.clientY / window.innerHeight - .5) * 10;
      core.style.transform = "translate3d(" + dx + "px," + dy + "px,0)";
    }

    var card = event.target.closest(".metric,.steam-account,.trophy,.discord-card");
    if (!card) return;
    card.classList.add("tilt-card");
    var rect = card.getBoundingClientRect();
    var px = (event.clientX - rect.left) / rect.width;
    var py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty("--tilt-x", ((.5 - py) * 5).toFixed(2) + "deg");
    card.style.setProperty("--tilt-y", ((px - .5) * 6).toFixed(2) + "deg");
    card.style.setProperty("--glare-x", (px * 100).toFixed(1) + "%");
    card.style.setProperty("--glare-y", (py * 100).toFixed(1) + "%");
  }, { passive: true });

  document.addEventListener("pointerout", function (event) {
    var card = event.target.closest(".tilt-card");
    if (!card || (event.relatedTarget && card.contains(event.relatedTarget))) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
})();
