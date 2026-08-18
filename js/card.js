/* ============================================================
   ANKUZO — карточка профиля
   ============================================================ */

/* ------------------------------------------------------------
   ФОН. Чтобы поставить свою гифку или видео:
   1. положи файл в assets/ (например assets/background.mp4);
   2. впиши путь в background.src ниже;
   3. mp4/webm предпочтительнее gif — вес меньше в разы.
   Пустой src оставляет сгенерированный фон.
   ------------------------------------------------------------ */
const background = {
  src: "",
  opacity: 0.5,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;
const $ = (id) => document.getElementById(id);

const setText = (id, value) => {
  const node = $(id);
  if (node && value !== null && value !== undefined) node.textContent = value;
};

/* ---------- фоновое медиа ---------- */

function mountBackground() {
  const src = String(background.src || "").trim();
  if (!src) return;

  const opacity = Math.min(Math.max(Number(background.opacity) || 0.5, 0), 1);
  const isVideo = /\.(mp4|webm|ogv)(\?|$)/i.test(src);
  const node = isVideo ? $("bg-video") : $("bg-image");
  if (!node) return;

  node.style.setProperty("--bg-media-opacity", String(opacity));
  node.addEventListener(isVideo ? "loadeddata" : "load", () => {
    node.classList.add("on");
    document.body.classList.add("has-bg-media");
  }, { once: true });
  node.addEventListener("error", () => {
    console.warn(`[ankuzo] фон не загрузился: ${src}`);
  }, { once: true });

  node.src = src;
  if (isVideo) {
    node.muted = true;
    node.play().catch(() => {});
  }
}

/* ---------- частицы ---------- */

function mountParticles() {
  const canvas = $("bg-canvas");
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const pointer = { x: -9999, y: -9999 };
  let dots = [];
  let width = 0;
  let height = 0;
  let frame = 0;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = Math.min(Math.round((width * height) / 16000), 110);
    dots = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.5 + 0.5,
      blue: Math.random() < 0.28,
    }));
  };

  const draw = () => {
    frame = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, width, height);

    for (const dot of dots) {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.x < -20) dot.x = width + 20;
      if (dot.x > width + 20) dot.x = -20;
      if (dot.y < -20) dot.y = height + 20;
      if (dot.y > height + 20) dot.y = -20;

      const dx = dot.x - pointer.x;
      const dy = dot.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const near = distance < 170;
      if (near) {
        dot.x += (dx / distance) * 0.5;
        dot.y += (dy / distance) * 0.5;
      }

      const alpha = near ? 0.75 : 0.34;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fillStyle = dot.blue ? `rgba(111,123,247,${alpha})` : `rgba(194,255,26,${alpha})`;
      ctx.fill();
    }

    for (let i = 0; i < dots.length; i += 1) {
      for (let j = i + 1; j < dots.length; j += 1) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance > 128) continue;
        ctx.beginPath();
        ctx.moveTo(dots[i].x, dots[i].y);
        ctx.lineTo(dots[j].x, dots[j].y);
        ctx.strokeStyle = `rgba(194,255,26,${(1 - distance / 128) * 0.13})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  };

  const stop = () => cancelAnimationFrame(frame);
  const start = () => { stop(); frame = requestAnimationFrame(draw); };

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else start();
  });

  resize();
  start();
}

/* ---------- курсор ---------- */

function mountCursor() {
  const cursor = $("cursor");
  if (!cursor || coarse) return;

  const dot = cursor.querySelector(".cursor-dot");
  const ring = cursor.querySelector(".cursor-ring");
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let ringX = x;
  let ringY = y;

  window.addEventListener("pointermove", (event) => {
    x = event.clientX;
    y = event.clientY;
    document.body.style.setProperty("--pointer-x", `${x}px`);
    document.body.style.setProperty("--pointer-y", `${y}px`);
  }, { passive: true });

  document.addEventListener("pointerover", (event) => {
    const target = event.target;
    const hot = target instanceof Element && target.closest("a, button, [role='button']");
    cursor.classList.toggle("hot", Boolean(hot));
  });

  const loop = () => {
    ringX += (x - ringX) * 0.16;
    ringY += (y - ringY) * 0.16;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(loop);
  };
  loop();
}

/* ---------- вход ---------- */

function mountEnter() {
  const gate = $("enter");
  if (!gate) return;

  const open = () => {
    if (document.body.classList.contains("entered")) return;
    document.body.classList.add("entered");
    const video = $("bg-video");
    if (video && video.src) video.play().catch(() => {});
  };

  gate.addEventListener("click", open);
  gate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
}

/* ---------- наклон карточки ---------- */

function mountTilt() {
  const card = $("card");
  if (!card || coarse || reduceMotion) return;

  window.addEventListener("pointermove", (event) => {
    if (!document.body.classList.contains("entered")) return;
    const rx = (event.clientY / window.innerHeight - 0.5) * -5;
    const ry = (event.clientX / window.innerWidth - 0.5) * 6;
    card.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  });
}

/* ---------- часы ---------- */

function mountClock() {
  const tick = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    setText("clock", `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`);
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- копирование ---------- */

let toastTimer = 0;

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("on"), 2200);
}

async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    const ok = document.execCommand("copy");
    helper.remove();
    return ok;
  }
}

function mountCopy() {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy || "";
      const label = button.dataset.copyLabel || "скопировано";
      showToast(await copyValue(value) ? label : `не удалось — ${value}`);
    });
  });
}

/* ---------- данные ---------- */

const numberFormat = new Intl.NumberFormat("ru-RU");
const pluralRules = new Intl.PluralRules("ru-RU");

/** «1 игра», «2 игры», «32 игры», «150 игр» */
const plural = (count, forms) => forms[pluralRules.select(count)] || forms.other;

const loadJson = async (name) => {
  try {
    const response = await fetch(`data/${name}.json`, { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    return await response.json();
  } catch {
    return null;
  }
};

function countUp(id, target) {
  const node = $(id);
  if (!node || !Number.isFinite(target)) return;
  if (reduceMotion) {
    node.textContent = numberFormat.format(Math.round(target));
    return;
  }
  const duration = 1100;
  const started = performance.now();
  const step = (now) => {
    const progress = Math.min((now - started) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    node.textContent = numberFormat.format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function applySteam(steam) {
  if (!steam) return null;
  countUp("stat-hours", Number(steam.stats?.totalHours));
  countUp("stat-games", Number(steam.stats?.totalGames));

  const profiles = Array.isArray(steam.profiles) ? steam.profiles : [];
  profiles.slice(0, 2).forEach((profile, index) => {
    const line = $(`steam-${index + 1}-line`);
    const anchor = $(`link-steam-${index + 1}`);
    if (anchor && profile.profileUrl) anchor.href = profile.profileUrl;
    if (!line) return;
    const hours = Number(profile.totalHours);
    const parts = [profile.nickname || `профиль ${index + 1}`];
    if (Number.isFinite(hours)) parts.push(`${numberFormat.format(Math.round(hours))} ч`);
    const games = Number(profile.gameCount);
    if (Number.isFinite(games)) parts.push(`${games} ${plural(games, { one: "игра", few: "игры", many: "игр" })}`);
    line.textContent = parts.join(" · ");
  });

  const playing = profiles.find((profile) => profile.currentGame);
  const top = Array.isArray(steam.top) ? steam.top[0] : null;
  if (playing) return `${playing.currentGame} · в игре`;
  if (top?.name) return `${top.name} · ${numberFormat.format(Math.round(top.hours))} ч всего`;
  return null;
}

function applyPsn(psn) {
  if (!psn) return;
  countUp("stat-trophies", Number(psn.trophies?.total));
  countUp("stat-platinum", Number(psn.trophies?.platinum));

  const line = $("psn-line");
  if (line) {
    const id = psn.psnId || "ankkui";
    const level = Number(psn.trophies?.level);
    line.textContent = Number.isFinite(level) ? `${id} · уровень ${level}` : `${id} — скопировать ID`;
  }

  const library = Array.isArray(psn.library) ? psn.library.length : 0;
  if (library) {
    const games = plural(library, { one: "игра", few: "игры", many: "игр" });
    setText("cta-sub", `топ игр Steam, трофеи и ${library} ${games} PlayStation`);
  }
}

function applyDiscord(discord) {
  if (!discord) return;

  setText("display-name", discord.displayName || "anku");
  const name = $("display-name");
  if (name) name.dataset.text = name.textContent;
  setText("username", discord.username || "ankuz0");
  setText("bio", discord.bio);

  const avatar = $("avatar");
  if (avatar && discord.avatarUrl) {
    avatar.addEventListener("error", () => { avatar.src = "assets/discord-avatar.webp"; }, { once: true });
    avatar.src = discord.avatarUrl;
  }

  const deco = $("avatar-deco");
  if (deco && discord.decorationUrl) {
    deco.addEventListener("load", () => deco.classList.add("on"), { once: true });
    deco.src = discord.decorationUrl;
  }

  const banner = $("card-banner");
  if (banner && discord.bannerUrl) banner.style.backgroundImage = `url("${discord.bannerUrl}")`;

  const presence = $("presence");
  if (presence) {
    const state = String(discord.presence || "offline").toLowerCase();
    presence.className = `presence ${["online", "idle", "dnd"].includes(state) ? state : ""}`.trim();
    presence.title = `Discord: ${state}`;
  }

  const badges = $("badges");
  if (badges) {
    const labels = {
      HOUSE_BRAVERY: ["дом отваги", "accent"],
      HOUSE_BRILLIANCE: ["дом блеска", "accent"],
      HOUSE_BALANCE: ["дом баланса", "accent"],
      NITRO: ["nitro", "blue"],
      ACTIVE_DEVELOPER: ["разработчик", ""],
    };
    const list = Array.isArray(discord.badges) ? discord.badges : [];
    badges.replaceChildren(...list.map((badge) => {
      const [label, tone] = labels[badge] || [String(badge).toLowerCase().replace(/_/g, " "), ""];
      const span = document.createElement("span");
      span.className = `badge ${tone}`.trim();
      span.textContent = label;
      return span;
    }));
  }

  const line = $("discord-line");
  if (line) line.textContent = `${discord.username || "ankuz0"} — скопировать`;
}

function applyStatus(sources) {
  const known = sources.filter(Boolean);
  const dot = $("data-dot");
  const live = known.length > 0 && known.every((source) => source.source === "api");
  const partial = known.some((source) => source.source === "api");

  if (dot) dot.className = `dot ${live ? "live" : partial ? "stale" : ""}`.trim();

  if (!known.length) {
    setText("data-status", "данные недоступны");
    return;
  }

  const latest = known
    .map((source) => Date.parse(source.lastSuccessfulAt || source.updatedAt || ""))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  const when = Number.isFinite(latest)
    ? new Date(latest).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
    : "—";

  setText("data-status", live ? `данные live · ${when}` : `данные от ${when}`);
}

async function mountData() {
  const [steam, psn, discord] = await Promise.all([loadJson("steam"), loadJson("psn"), loadJson("discord")]);
  const nowPlaying = applySteam(steam);
  applyPsn(psn);
  applyDiscord(discord);
  applyStatus([steam, psn, discord]);
  if (nowPlaying) setText("now-value", nowPlaying);
}

/* ---------- запуск ---------- */

mountBackground();
mountParticles();
mountCursor();
mountEnter();
mountTilt();
mountClock();
mountCopy();
mountData();
