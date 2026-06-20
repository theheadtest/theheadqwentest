"use strict";
const TAU = Math.PI * 2,
  canvas = document.getElementById("explorer"),
  ctx = canvas.getContext("2d"),
  logEl = document.getElementById("log");
const $ = (id) => document.getElementById(id),
  clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  lerp = (a, b, t) => a + (b - a) * t,
  smooth = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
const ui = {
  seed: $("seed"),
  arms: $("arms"),
  dust: $("dust"),
  systemSpeed: $("systemSpeed"),
  showLabels: $("showLabels"),
  showHabitable: $("showHabitable"),
  showMoons: $("showMoons"),
  showTrails: $("showTrails"),
  renderSize: $("renderSize"),
  bodySpeed: $("bodySpeed"),
  relief: $("relief"),
  showClouds: $("showClouds"),
};
function hash(t) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
class RNG {
  constructor(s) {
    this.state = hash(s || "seed");
  }
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) {
    return a + (b - a) * this.next();
  }
  int(a, b) {
    return Math.floor(this.range(a, b + 1));
  }
  pick(a) {
    return a[Math.floor(this.next() * a.length)];
  }
  chance(p) {
    return this.next() < p;
  }
}
class Noise2 {
  constructor(seed) {
    this.seed = hash(seed);
  }
  h(x, y) {
    let h = this.seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  n(x, y) {
    const x0 = Math.floor(x),
      y0 = Math.floor(y),
      xf = this.fade(x - x0),
      yf = this.fade(y - y0);
    return lerp(
      lerp(this.h(x0, y0), this.h(x0 + 1, y0), xf),
      lerp(this.h(x0, y0 + 1), this.h(x0 + 1, y0 + 1), xf),
      yf,
    );
  }
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  fbm(x, y, o = 5) {
    let s = 0,
      a = 0.55,
      f = 1,
      n = 0;
    for (let i = 0; i < o; i++) {
      s += this.n(x * f, y * f) * a;
      n += a;
      a *= 0.5;
      f *= 2;
    }
    return s / n;
  }
}
class Perlin3D {
  constructor(seed) {
    const r = new RNG("perlin:" + seed),
      p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  grad(h, x, y, z) {
    const q = h & 15,
      u = q < 8 ? x : y,
      v = q < 4 ? y : q === 12 || q === 14 ? x : z;
    return (q & 1 ? -u : u) + (q & 2 ? -v : v);
  }
  noise(x, y, z) {
    const X = Math.floor(x) & 255,
      Y = Math.floor(y) & 255,
      Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x),
      v = this.fade(y),
      w = this.fade(z),
      A = this.p[X] + Y,
      AA = this.p[A] + Z,
      AB = this.p[A + 1] + Z,
      B = this.p[X + 1] + Y,
      BA = this.p[B] + Z,
      BB = this.p[B + 1] + Z;
    return lerp(
      lerp(
        lerp(
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z),
          u,
        ),
        lerp(
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z),
          u,
        ),
        v,
      ),
      lerp(
        lerp(
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1),
          u,
        ),
        lerp(
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1),
          u,
        ),
        v,
      ),
      w,
    );
  }
  fbm(x, y, z, o = 5, l = 2, g = 0.5) {
    let s = 0,
      a = 0.5,
      f = 1,
      m = 0;
    for (let i = 0; i < o; i++) {
      s += this.noise(x * f, y * f, z * f) * a;
      m += a;
      a *= g;
      f *= l;
    }
    return s / m;
  }
  fbm01(x, y, z, o = 5, l = 2, g = 0.5) {
    return this.fbm(x, y, z, o, l, g) * 0.5 + 0.5;
  }
  ridged(x, y, z, o = 5, l = 2, g = 0.5) {
    let s = 0,
      a = 0.55,
      f = 1,
      m = 0;
    for (let i = 0; i < o; i++) {
      const n = 1 - Math.abs(this.noise(x * f, y * f, z * f));
      s += n * n * a;
      m += a;
      a *= g;
      f *= l;
    }
    return s / m;
  }
}
const mix = (a, b, t) => [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ],
  scale = (c, a) => c.map((v) => Math.round(clamp(v * a, 0, 255))),
  add = (a, b, t) => a.map((v, i) => Math.round(clamp(v + b[i] * t, 0, 255))),
  rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`,
  norm = (x, y, z) => {
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
const starTypes = {
  M: {
    label: "M red dwarf",
    color: "#ff8b6b",
    glow: "#ef4444",
    mass: [0.12, 0.55],
    temp: [2400, 3800],
    hz: [0.18, 0.42],
  },
  K: {
    label: "K orange dwarf",
    color: "#ffb86b",
    glow: "#f97316",
    mass: [0.55, 0.85],
    temp: [3900, 5200],
    hz: [0.42, 0.82],
  },
  G: {
    label: "G yellow dwarf",
    color: "#ffe7a3",
    glow: "#facc15",
    mass: [0.85, 1.12],
    temp: [5300, 6100],
    hz: [0.82, 1.35],
  },
  F: {
    label: "F white star",
    color: "#f8fbff",
    glow: "#93c5fd",
    mass: [1.13, 1.45],
    temp: [6200, 7500],
    hz: [1.25, 2.05],
  },
  A: {
    label: "A blue-white star",
    color: "#dbeafe",
    glow: "#60a5fa",
    mass: [1.46, 2.2],
    temp: [7600, 10000],
    hz: [2, 3.35],
  },
};
const palettes = {
  scorched: [
    [50, 20, 14],
    [154, 52, 18],
    [249, 115, 22],
  ],
  desert: [
    [124, 74, 29],
    [192, 132, 63],
    [253, 230, 138],
  ],
  terrestrial: [
    [6, 78, 59],
    [22, 163, 74],
    [56, 189, 248],
  ],
  ocean: [
    [8, 47, 73],
    [2, 132, 199],
    [103, 232, 249],
  ],
  ice: [
    [219, 234, 254],
    [147, 197, 253],
    [248, 250, 252],
  ],
  gas: [
    [124, 45, 18],
    [234, 179, 8],
    [254, 215, 170],
  ],
  giant: [
    [49, 46, 129],
    [124, 58, 237],
    [196, 181, 253],
  ],
  toxic: [
    [54, 83, 20],
    [163, 230, 53],
    [132, 204, 22],
  ],
  lava: [
    [17, 24, 39],
    [220, 38, 38],
    [251, 191, 36],
  ],
  moon: [
    [80, 80, 88],
    [160, 158, 150],
    [226, 232, 240],
  ],
  forest: [
    [20, 83, 45],
    [45, 140, 72],
    [125, 211, 252],
  ],
  archipelago: [
    [7, 42, 112],
    [64, 207, 206],
    [238, 217, 151],
  ],
};
let app = {
  view: "galaxy",
  history: [],
  galaxy: null,
  system: null,
  body: null,
  hit: [],
  time: 0,
  last: 0,
  cache: { systems: new Map(), bodies: new Map() },
};
function log(t, d = "") {
  const line = `[${new Date().toLocaleTimeString()}] ${t}${d ? " — " + d : ""}`;
  logEl.textContent = line + "\n" + logEl.textContent;
  console.log(line);
}
function syncLabels() {
  armsValue.textContent = ui.arms.value;
  dustValue.textContent = Number(ui.dust.value).toFixed(2);
  systemSpeedValue.textContent = Number(ui.systemSpeed.value).toFixed(2) + "×";
  bodySpeedValue.textContent = Number(ui.bodySpeed.value).toFixed(2) + "×";
  reliefValue.textContent = Number(ui.relief.value).toFixed(2) + "×";
}
function randomSeed() {
  const r = new RNG(Date.now() + ":" + Math.random()),
    a = ["spiral", "opal", "violet", "silent", "aurora", "ember"],
    b = ["voyage", "harbor", "choir", "frontier", "garden", "archive"];
  ui.seed.value = `${r.pick(a)}-${r.pick(b)}-${r.int(100, 999)}`;
  generateGalaxy();
}
function generateGalaxy() {
  syncLabels();
  const seed = ui.seed.value.trim() || "spiral-voyage-512",
    rng = new RNG(seed),
    noise = new Noise2(seed + ":galaxy"),
    arms = Number(ui.arms.value),
    decor = [],
    stars = [],
    cx = canvas.width / 2,
    cy = canvas.height / 2,
    rx = canvas.width * 0.43,
    ry = canvas.height * 0.34;
  for (let i = 0; i < 2000; i++)
    decor.push(makeGalaxyPoint(rng, noise, arms, cx, cy, rx, ry, i, false));
  for (let i = 0; i < 100; i++) {
    const p = makeGalaxyPoint(rng, noise, arms, cx, cy, rx, ry, i, true),
      cls = pickClass(rng, p.rNorm),
      st = starTypes[cls];
    stars.push({
      ...p,
      id: `S-${String(i + 1).padStart(3, "0")}`,
      name: `${rng.pick(["Astra", "Vela", "Nereid", "Orion", "Lumen", "Cinder", "Mira", "Thal", "Eos", "Nyx"])}-${i + 1}`,
      seed: `${seed}:star:${i}`,
      classKey: cls,
      star: st,
      systemSeed: `${seed}:star:${i}:system`,
      radius: 2.8 + p.mag * 3.2,
      color: st.color,
    });
  }
  app.galaxy = { seed, arms, decor, stars, noise, dust: Number(ui.dust.value) };
  app.view = "galaxy";
  app.history = [];
  app.system = null;
  app.body = null;
  log(
    "Galaxy generated",
    `${decor.length} decorative stars, ${stars.length} catalog stars, ${arms} arms`,
  );
  updateUi();
}
function makeGalaxyPoint(rng, noise, arms, cx, cy, rx, ry, i, active) {
  const arm = rng.int(0, arms - 1),
    rNorm = active ? Math.pow(rng.next(), 0.62) : Math.pow(rng.next(), 0.72),
    twist = rNorm * 4.8,
    base = (arm * TAU) / arms,
    spread =
      rng.range(active ? -0.18 : -0.34, active ? 0.18 : 0.34) *
      (1 - rNorm * 0.3),
    n = (noise.fbm(i * 0.07, arm * 3.1, 4) - 0.5) * 0.6,
    a = base + twist + spread + n,
    halo = rng.chance(active ? 0.08 : 0.18),
    rad = halo ? rng.range(0.15, 1.06) : rNorm,
    x = cx + Math.cos(a) * rad * rx + rng.range(-8, 8),
    y = cy + Math.sin(a) * rad * ry + rng.range(-8, 8),
    mag = Math.pow(rng.next(), active ? 2.2 : 3.5);
  return {
    x,
    y,
    rNorm: rad,
    mag,
    a,
    alpha: 0.25 + mag * 0.75,
    size: active ? 2 + mag * 3 : 0.35 + mag * 1.9,
  };
}
function pickClass(rng, r) {
  const x = rng.next() + r * 0.25;
  return x < 0.35
    ? "M"
    : x < 0.57
      ? "K"
      : x < 0.78
        ? "G"
        : x < 0.92
          ? "F"
          : "A";
}
function openSystem(star) {
  app.history.push({ view: app.view, system: app.system, body: app.body });
  if (!app.cache.systems.has(star.id))
    app.cache.systems.set(star.id, generateSystem(star));
  app.system = app.cache.systems.get(star.id);
  app.view = "system";
  app.body = null;
  log("Opened star system", `${star.name} · ${star.star.label}`);
  updateUi();
}
function generateSystem(s) {
  const rng = new RNG(s.systemSeed),
    st = s.star,
    key = s.classKey,
    count = rng.int(4, 9),
    mass = rng.range(st.mass[0], st.mass[1]),
    temp = Math.round(rng.range(st.temp[0], st.temp[1])),
    planets = [];
  let orbit = rng.range(0.22, 0.42);
  for (let i = 0; i < count; i++) {
    orbit += rng.range(0.22, 0.62) * (1 + i * 0.11);
    const inHz = orbit >= st.hz[0] && orbit <= st.hz[1],
      outer = orbit > st.hz[1] * 1.8;
    let type = inHz
      ? rng.pick(["terrestrial", "ocean", "terrestrial"])
      : orbit < st.hz[0] * 0.72
        ? rng.pick(["scorched", "lava", "desert"])
        : outer && rng.chance(0.55)
          ? rng.pick(["gas", "giant", "ice"])
          : rng.pick(["desert", "ice", "toxic", "terrestrial"]);
    if (i > count * 0.55 && rng.chance(0.35)) type = rng.pick(["gas", "giant"]);
    const radius =
        type === "gas" || type === "giant"
          ? rng.range(13, 24)
          : rng.range(5.5, 12),
      moonCount =
        type === "gas" || type === "giant"
          ? rng.int(3, 7)
          : rng.chance(0.45)
            ? rng.int(1, 3)
            : 0,
      id = `${s.id}:P-${i + 1}`;
    const moons = Array.from({ length: moonCount }, (_, m) => ({
      id: `${id}:M-${m + 1}`,
      name: `${rng.pick(["Io", "Nyx", "Kora", "Thal", "Mira", "Rook"])} ${m + 1}`,
      seed: `${s.systemSeed}:planet:${i}:moon:${m}`,
      type: "moon",
      bodyType: rng.pick(["moon", "ice", "moon", "lava"]),
      orbitRadius: radius + 10 + m * 5,
      angle: rng.range(0, TAU),
      speed: rng.range(0.35, 0.9) / (m + 1),
      radius: Math.max(2, radius * 0.13 + rng.range(0.2, 1.3)),
    }));
    planets.push({
      id,
      name: `${rng.pick(["Astra", "Vela", "Nereid", "Orion", "Lumen", "Cinder", "Mira", "Thal", "Eos", "Iris"])}-${i + 1}`,
      seed: `${s.systemSeed}:planet:${i}`,
      type,
      bodyType: mapBodyType(type, rng),
      orbit,
      angle: rng.range(0, TAU),
      speed: rng.range(0.045, 0.17) / Math.sqrt(orbit),
      radius,
      moons,
      water: rng.int(0, 96),
      atmosphere: rng.pick([
        "trace",
        "thin",
        "temperate",
        "dense",
        "hazy",
        "deep bands",
      ]),
      inHz,
    });
    if (rng.chance(0.25) && i > 1 && i < count - 1)
      orbit += rng.range(0.18, 0.38);
  }
  return {
    id: s.id,
    seed: s.systemSeed,
    star: s,
    mass,
    temp,
    hz: st.hz,
    planets,
    dust: Array.from({ length: 360 }, () => ({
      x: rng.next(),
      y: rng.next(),
      a: rng.range(0.12, 0.75),
      s: rng.range(0.4, 1.5),
    })),
  };
}
function mapBodyType(t, rng) {
  return (
    {
      scorched: rng.pick(["desert", "lava"]),
      desert: "desert",
      terrestrial: rng.pick(["earthlike", "forest"]),
      ocean: rng.pick(["ocean", "archipelago"]),
      ice: "ice",
      gas: "gas",
      giant: "giant",
      toxic: "toxic",
      lava: "lava",
    }[t] || "earthlike"
  );
}
function openBody(desc) {
  app.history.push({ view: app.view, system: app.system, body: app.body });
  const key = desc.id + ":" + ui.renderSize.value;
  if (!app.cache.bodies.has(key)) app.cache.bodies.set(key, buildBody(desc));
  app.body = app.cache.bodies.get(key);
  app.view = "body";
  log("Opened body", `${desc.name} · ${desc.kind}`);
  updateUi();
}
function buildBody(d) {
  return {
    ...d,
    renderSize: Number(ui.renderSize.value),
    rotation: 0,
    noise: new Perlin3D(d.seed + ":" + d.bodyType),
    rng: new RNG(d.seed),
    craters: createCraters(new RNG(d.seed + ":craters"), 70),
  };
}
function createCraters(rng, count) {
  return Array.from({ length: count }, (_, i) => {
    const n = norm(rng.range(-1, 1), rng.range(-0.9, 0.9), rng.range(-1, 1));
    return {
      x: n[0],
      y: n[1],
      z: n[2],
      radius: rng.range(0.025, i < 10 ? 0.13 : 0.075),
      depth: rng.range(0.35, 1),
    };
  });
}
function material(body, x, y, z, lat, lon) {
  const n = body.noise,
    rel = Number(ui.relief.value);
  if (body.kind === "star") {
    const pulse = n.fbm01(x * 8 + body.rotation, y * 8, z * 8, 4),
      cell = n.ridged(x * 15, y * 15, z * 15, 4),
      base = hex(
        body.classKey === "M"
          ? "#ff8b6b"
          : body.classKey === "K"
            ? "#ffb86b"
            : body.classKey === "G"
              ? "#ffe7a3"
              : body.classKey === "F"
                ? "#f8fbff"
                : "#dbeafe",
      ),
      hot = mix(base, [255, 255, 255], 0.35 + pulse * 0.45);
    return { color: add(hot, [255, 190, 80], cell * 0.22), emissive: 1 };
  }
  let h = n.fbm01(x * 2.4, y * 2.4, z * 2.4, 6) * rel + (1 - rel) * 0.5,
    r = n.ridged(x * 5, y * 5, z * 5, 4),
    pal = palettes[body.bodyType] || palettes.terrestrial,
    water = false,
    em = 0,
    c = mix(pal[0], pal[1], h);
  if (["earthlike", "forest", "archipelago", "ocean"].includes(body.bodyType)) {
    water =
      h <
      (body.bodyType === "archipelago"
        ? 0.62
        : body.bodyType === "ocean"
          ? 0.78
          : 0.5);
    c = water ? mix([5, 35, 100], [45, 170, 205], h) : mix(pal[1], pal[2], r);
  } else if (body.bodyType === "moon") {
    let dep = 0;
    for (const cr of body.craters) {
      const dot = x * cr.x + y * cr.y + z * cr.z;
      if (dot > 0.86) dep += smooth(0.86, 1, dot) * cr.depth;
    }
    c = mix(pal[0], pal[2], clamp(h - dep * 0.25 + r * 0.12));
  } else if (body.bodyType === "lava") {
    const cracks =
      1 - smooth(0.03, 0.18, Math.abs(n.noise(x * 7, y * 7, z * 7)));
    c = mix([22, 20, 20], [95, 45, 35], h);
    if (cracks > 0.08) {
      c = mix(c, [255, 190, 36], cracks);
      em = cracks;
    }
  } else if (body.bodyType === "gas" || body.bodyType === "giant") {
    const band =
      Math.sin((lat + n.fbm(x * 3, y * 8, z * 3, 4) * 0.28) * 22) * 0.5 + 0.5;
    c = mix(pal[0], pal[2], band);
  } else c = mix(pal[0], pal[2], h * 0.65 + r * 0.35);
  return { color: c, water, emissive: em };
}
function hex(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}
function draw(ts = 0) {
  const dt = app.last ? (ts - app.last) / 1000 : 0;
  app.last = ts;
  app.time += dt;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  app.hit = [];
  if (app.view === "galaxy") drawGalaxy();
  else if (app.view === "system") drawSystem(dt);
  else drawBody(dt);
  requestAnimationFrame(draw);
}
function drawGalaxy() {
  const g = app.galaxy;
  if (!g) return;
  const grd = ctx.createRadialGradient(460, 350, 20, 460, 350, 650);
  grd.addColorStop(0, "#111b3d");
  grd.addColorStop(1, "#020617");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "lighter";
  for (const s of g.decor) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.mag > 0.75 ? "#fde68a" : "#dbeafe";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, TAU);
    ctx.fill();
  }
  for (const s of g.stars) {
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = s.star.glow;
    ctx.shadowBlur = 10 + s.mag * 12;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, TAU);
    ctx.fill();
    app.hit.push({ type: "star", x: s.x, y: s.y, r: s.radius + 8, payload: s });
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
function drawSystem(dt) {
  const sys = app.system;
  if (!sys) return;
  app.time += dt * Number(ui.systemSpeed.value);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const s of sys.dust) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(s.x * canvas.width, s.y * canvas.height, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  const cx = canvas.width / 2,
    cy = canvas.height / 2,
    max = Math.max(...sys.planets.map((p) => p.orbit), sys.hz[1]),
    sc = (Math.min(canvas.width, canvas.height) * 0.42) / max;
  if (ui.showHabitable.checked) {
    ctx.fillStyle = "rgba(34,197,94,.11)";
    ctx.beginPath();
    ctx.arc(cx, cy, sys.hz[1] * sc, 0, TAU);
    ctx.arc(cx, cy, sys.hz[0] * sc, 0, TAU, true);
    ctx.fill();
  }
  if (ui.showTrails.checked) {
    ctx.strokeStyle = "rgba(148,163,184,.24)";
    for (const p of sys.planets) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, p.orbit * sc, p.orbit * sc * 0.62, 0, 0, TAU);
      ctx.stroke();
    }
  }
  const sr = 34 + sys.mass * 9,
    gl = ctx.createRadialGradient(cx, cy, 8, cx, cy, 150);
  gl.addColorStop(0, sys.star.star.color);
  gl.addColorStop(0.25, sys.star.star.glow + "aa");
  gl.addColorStop(1, "transparent");
  ctx.fillStyle = gl;
  ctx.beginPath();
  ctx.arc(cx, cy, 150, 0, TAU);
  ctx.fill();
  ctx.fillStyle = sys.star.star.color;
  ctx.beginPath();
  ctx.arc(cx, cy, sr, 0, TAU);
  ctx.fill();
  app.hit.push({
    type: "body",
    x: cx,
    y: cy,
    r: sr + 8,
    payload: {
      kind: "star",
      ...sys.star,
      bodyType: "star",
      classKey: sys.star.classKey,
    },
  });
  for (const p of sys.planets) {
    const a = p.angle + app.time * p.speed,
      x = cx + Math.cos(a) * p.orbit * sc,
      y = cy + Math.sin(a) * p.orbit * sc * 0.62,
      pa = palettes[p.type] || palettes.terrestrial,
      gr = ctx.createRadialGradient(
        x - p.radius * 0.35,
        y - p.radius * 0.4,
        1,
        x,
        y,
        p.radius * 1.25,
      );
    gr.addColorStop(0, rgb(pa[2]));
    gr.addColorStop(0.55, rgb(pa[1]));
    gr.addColorStop(1, rgb(pa[0]));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(x, y, p.radius, 0, TAU);
    ctx.fill();
    if (p.inHz) {
      ctx.strokeStyle = "#86efac";
      ctx.beginPath();
      ctx.arc(x, y, p.radius + 4, 0, TAU);
      ctx.stroke();
    }
    app.hit.push({
      type: "body",
      x,
      y,
      r: Math.max(12, p.radius + 6),
      payload: { kind: "planet", ...p },
    });
    if (ui.showLabels.checked) {
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(p.name, x, y - p.radius - 10);
    }
    if (ui.showMoons.checked)
      for (const m of p.moons) {
        const ma = a * (2 + m.speed) + m.angle + app.time * 0.5,
          mx = x + Math.cos(ma) * m.orbitRadius,
          my = y + Math.sin(ma) * m.orbitRadius * 0.55;
        ctx.fillStyle = "rgba(226,232,240,.88)";
        ctx.beginPath();
        ctx.arc(mx, my, m.radius, 0, TAU);
        ctx.fill();
        app.hit.push({
          type: "body",
          x: mx,
          y: my,
          r: 8,
          payload: { kind: "moon", ...m },
        });
      }
  }
}
function drawBody(dt) {
  const b = app.body;
  if (!b) return;
  b.rotation += dt * Number(ui.bodySpeed.value) * 0.55;
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const size = b.renderSize,
    img = ctx.createImageData(size, size),
    data = img.data,
    rad = size * 0.475,
    cen = size / 2,
    cr = Math.cos(b.rotation),
    sr = Math.sin(b.rotation),
    light = norm(-0.48, 0.24, 0.84);
  for (let py = 0; py < size; py++)
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4,
        nx = (px + 0.5 - cen) / rad,
        ny = -(py + 0.5 - cen) / rad,
        r2 = nx * nx + ny * ny;
      if (r2 > 1) {
        data[idx + 3] = 0;
        continue;
      }
      const nz = Math.sqrt(1 - r2),
        x = nx * cr + nz * sr,
        y = ny,
        z = -nx * sr + nz * cr,
        lat = Math.asin(clamp(y, -1, 1)),
        lon = Math.atan2(x, z),
        mat = material(b, x, y, z, lat, lon);
      let col = mat.color;
      if (b.kind !== "star") {
        const dot = nx * light[0] + ny * light[1] + nz * light[2],
          day = smooth(-0.24, 0.95, dot),
          limb = Math.pow(1 - nz, 1.65);
        col = scale(col, 0.18 + 0.98 * day);
        if (mat.water && day > 0.2)
          col = add(col, [150, 220, 255], Math.pow(clamp(dot), 42) * 0.8);
        if (mat.emissive)
          col = add(col, mat.color, mat.emissive * (1 - day * 0.35));
        col = add(col, [125, 211, 252], limb * 0.22);
      } else col = add(col, [255, 220, 120], Math.pow(1 - nz, 1.5) * 0.8);
      if (
        ui.showClouds.checked &&
        b.kind !== "star" &&
        ["earthlike", "forest", "ocean", "archipelago", "toxic"].includes(
          b.bodyType,
        )
      ) {
        const cloud = b.noise.ridged(x * 4 + b.rotation, y * 4, z * 4, 4);
        if (cloud > 0.58)
          col = mix(
            col,
            b.bodyType === "toxic" ? [188, 255, 120] : [245, 250, 255],
            (cloud - 0.58) * 1.25,
          );
      }
      data[idx] = col[0];
      data[idx + 1] = col[1];
      data[idx + 2] = col[2];
      data[idx + 3] = 255;
    }
  const off = document.createElement("canvas");
  off.width = off.height = size;
  off.getContext("2d").putImageData(img, 0, 0);
  const ds = Math.min(canvas.width, canvas.height) * 0.7,
    dx = (canvas.width - ds) / 2,
    dy = (canvas.height - ds) / 2;
  ctx.shadowColor =
    b.kind === "star" ? b.star?.glow || "#facc15" : "rgba(125,211,252,.32)";
  ctx.shadowBlur = b.kind === "star" ? 55 : 24;
  ctx.drawImage(off, dx, dy, ds, ds);
  ctx.shadowBlur = 0;
}
function updateUi() {
  document
    .querySelectorAll("[data-panel]")
    .forEach(
      (p) =>
        (p.style.display =
          p.dataset.panel === app.view
            ? "block"
            : app.view === "galaxy" && p.dataset.panel === "galaxy"
              ? "block"
              : app.view === "system" && p.dataset.panel === "system"
                ? "block"
                : app.view === "body" && p.dataset.panel === "body"
                  ? "block"
                  : "none"),
    );
  modeBadge.textContent =
    app.view[0].toUpperCase() + app.view.slice(1) + " Mode";
  breadcrumbs.textContent =
    app.view === "galaxy"
      ? "Galaxy"
      : app.view === "system"
        ? `Galaxy / ${app.system.star.name}`
        : `Galaxy / ${app.system?.star.name || "?"} / ${app.body.name}`;
  metricSelection.textContent =
    app.view === "galaxy"
      ? app.galaxy?.seed
      : app.view === "system"
        ? app.system.star.name
        : app.body.name;
  metricObjects.textContent =
    app.view === "galaxy"
      ? "2,000 decorative · 100 active"
      : app.view === "system"
        ? `${app.system.planets.length} planets`
        : app.body.kind;
  metricCache.textContent = `${app.cache.systems.size} systems · ${app.cache.bodies.size} bodies`;
  hint.textContent =
    app.view === "galaxy"
      ? "Click a bright catalog star to explore its system."
      : app.view === "system"
        ? "Click the star, a planet, or a satellite to inspect its generated body."
        : "Use visual controls to adjust quality, rotation, relief, and clouds without changing the seed.";
  description.innerHTML =
    app.view === "galaxy"
      ? "A seeded spiral galaxy with 2,000 decorative stars and 100 active catalog stars. Active stars derive solar systems from their own hierarchical seeds."
      : app.view === "system"
        ? `${app.system.star.star.label} · ${app.system.temp}K · ${app.system.planets.length} generated worlds. Click any body for a stable generated portrait.`
        : `<strong>${app.body.name}</strong> uses seed <code>${app.body.seed}</code> and renderer type <code>${app.body.bodyType}</code>.`;
  renderCards();
}
function renderCards() {
  cards.innerHTML = "";
  if (app.view === "galaxy")
    cards.innerHTML = app.galaxy.stars
      .slice(0, 12)
      .map(
        (s) =>
          `<button class="card" data-star="${s.id}"><h3><span class="dot" style="background:${s.color}"></span>${s.name}</h3><p>${s.star.label} · click to open seeded system</p></button>`,
      )
      .join("");
  else if (app.view === "system")
    cards.innerHTML = [
      `<button class="card" data-starbody="1"><h3><span class="dot" style="background:${app.system.star.star.color}"></span>${app.system.star.name}</h3><p>${app.system.star.star.label} · central star</p></button>`,
      ...app.system.planets.map(
        (p) =>
          `<button class="card" data-body="${p.id}"><h3><span class="dot" style="background:${rgb((palettes[p.type] || palettes.terrestrial)[1])}"></span>${p.name}</h3><p>${p.type} · ${p.orbit.toFixed(2)} AU · ${p.moons.length} satellites</p></button>`,
      ),
    ].join("");
  cards
    .querySelectorAll("[data-star]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openSystem(app.galaxy.stars.find((s) => s.id === b.dataset.star))),
    );
  cards.querySelectorAll("[data-starbody]").forEach(
    (b) =>
      (b.onclick = () =>
        openBody({
          kind: "star",
          ...app.system.star,
          bodyType: "star",
          classKey: app.system.star.classKey,
        })),
  );
  cards.querySelectorAll("[data-body]").forEach(
    (b) =>
      (b.onclick = () =>
        openBody({
          kind: "planet",
          ...app.system.planets.find((p) => p.id === b.dataset.body),
        })),
  );
}
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect(),
    x = ((e.clientX - rect.left) * canvas.width) / rect.width,
    y = ((e.clientY - rect.top) * canvas.height) / rect.height;
  for (let i = app.hit.length - 1; i >= 0; i--) {
    const h = app.hit[i];
    if (Math.hypot(x - h.x, y - h.y) <= h.r) {
      h.type === "star" ? openSystem(h.payload) : openBody(h.payload);
      return;
    }
  }
});
$("generate").onclick = generateGalaxy;
$("randomize").onclick = randomSeed;
$("clearLog").onclick = () => (logEl.textContent = "");
$("download").onclick = () => {
  const a = document.createElement("a");
  a.download = `galaxy-explorer-${app.view}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
  log("Exported PNG", a.download);
};
$("homeView").onclick = () => {
  app.view = "galaxy";
  app.history = [];
  updateUi();
};
$("backView").onclick = () => {
  const p = app.history.pop();
  if (p) {
    app.view = p.view;
    app.system = p.system;
    app.body = p.body;
    updateUi();
  }
};
Object.values(ui).forEach((el) =>
  el.addEventListener("input", () => {
    syncLabels();
    if (["arms", "dust"].includes(el.id)) generateGalaxy();
    if (app.view === "body" && ["renderSize"].includes(el.id) && app.body)
      openBody(app.body);
    updateUi();
  }),
);
syncLabels();
generateGalaxy();
requestAnimationFrame(draw);
