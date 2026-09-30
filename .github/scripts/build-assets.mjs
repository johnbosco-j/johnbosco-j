#!/usr/bin/env node
// Builds the SVGs in assets/ from profile.config.mjs.
//
// GitHub shows README images without web fonts, so all Latin text is drawn as vector
// outlines with opentype.js and the fonts from @fontsource (run `npm ci` first).
// Static images always build; stats (overview, languages, skyline) need GITHUB_TOKEN
// and are skipped without one, keeping the committed files.

import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import opentype from "opentype.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cfg = (await import(pathToFileURL(join(ROOT, "profile.config.mjs")).href)).default;
const ASSETS = join(ROOT, "assets");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

// ── palette ───────────────────────────────────────────────────────────────────
const C = {
  night: "#070A1F", deep: "#0B1030", indigo: "#151C4B", blue: "#2F6BFF", sky: "#8FB2FF",
  red: "#E63946", seal: "#D62839", gold: "#FFC857", ink: "#1A1530", brown: "#8A6A55",
  text: "#F2F5FF", soft: "#C9D1F7", muted: "#8C96C8", dim: "#5F6AA0", green: "#3DDC97", sakura: "#FF9EB5",
};
const JP = "'Hiragino Mincho ProN','Yu Mincho','YuMincho','Noto Serif JP','Noto Serif CJK JP','MS Mincho',serif";

// ── fonts: text becomes <use> references to glyph outlines ───────────────────
const FONT_FILES = {
  d: "space-grotesk/files/space-grotesk-latin-700-normal.woff", // display
  s: "geist-sans/files/geist-sans-latin-400-normal.woff", // body
  sm: "geist-sans/files/geist-sans-latin-500-normal.woff",
  ss: "geist-sans/files/geist-sans-latin-600-normal.woff",
  m: "geist-mono/files/geist-mono-latin-500-normal.woff", // labels
  i: "instrument-serif/files/instrument-serif-latin-400-italic.woff", // accents
};
const FONTS = Object.fromEntries(
  Object.entries(FONT_FILES).map(([key, file]) => {
    const buf = readFileSync(join(ROOT, "node_modules/@fontsource", file));
    return [key, opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))];
  }),
);

let glyphs = new Map(); // glyph id -> outline, collected per document
const r2 = (n) => Math.round(n * 100) / 100;

function layout(str, font, size, spacing, register) {
  // Plain character-to-glyph mapping: Latin needs no shaping, and opentype.js's GSUB
  // support chokes on some of these fonts' contextual lookups.
  const f = FONTS[font], k = size / f.unitsPerEm, list = [...str].map((ch) => f.charToGlyph(ch)), out = [];
  let x = 0;
  list.forEach((g, i) => {
    const id = `${font}${g.index}`;
    if (register && !glyphs.has(id)) glyphs.set(id, g.getPath(0, 0, f.unitsPerEm).toPathData(0));
    if (!register || glyphs.get(id)) out.push([id, x]);
    x += g.advanceWidth * k + spacing;
    if (i < list.length - 1) x += f.getKerningValue(g, list[i + 1]) * k;
  });
  return { out, width: list.length ? x - spacing : 0 };
}

const measure = (str, size, font = "s", spacing = 0) => layout(str, font, size, spacing, false).width;

/** Draws a line of text as glyph outlines. `max` shrinks it to fit a width. */
function text(str, { x = 0, y = 0, size = 16, font = "s", fill = C.text, anchor = "start", spacing = 0, max = Infinity, opacity, cls, style } = {}) {
  const w = measure(str, size, font, spacing);
  if (w > max) (size *= max / w), (spacing *= max / w);
  const { out, width } = layout(str, font, size, spacing, true);
  const x0 = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  const k = size / FONTS[font].unitsPerEm;
  const attrs = `${opacity != null ? ` fill-opacity="${opacity}"` : ""}${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""}`;
  return `<g fill="${fill}"${attrs}>${out.map(([id, gx]) => `<use href="#${id}" transform="translate(${r2(x0 + gx)} ${r2(y)}) scale(${r2(k * 1000) / 1000})"/>`).join("")}</g>`;
}

/** Word-wraps to a pixel width. */
function wrap(str, size, font, maxW) {
  const lines = [""];
  for (const word of str.split(" ")) {
    const next = `${lines.at(-1)} ${word}`.trim();
    if (lines.at(-1) && measure(next, size, font) > maxW) lines.push(word);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

// ── document helpers ──────────────────────────────────────────────────────────
const BASE_CSS = `
.spin{animation:spin 1.6s linear infinite;transform-box:fill-box;transform-origin:center}
.tw{animation:tw ease-in-out infinite alternate}
.fade{opacity:0;animation:fadeUp .8s ease-out forwards}
.pulse{animation:pulse 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.flk{animation:flk 2.4s ease-in-out infinite alternate}
.petal{animation:fall linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes tw{from{opacity:.12}to{opacity:.95}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
@keyframes flk{0%{opacity:.5}40%{opacity:1}70%{opacity:.7}100%{opacity:.95}}
@keyframes fall{from{transform:translate(0,0) rotate(0deg)}to{transform:translate(-260px,820px) rotate(600deg)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.fade{opacity:1}}`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const fmt = (n) => Number(n).toLocaleString("en-US");

function doc(w, h, title, body, css = "") {
  const defs = [...glyphs].filter(([, d]) => d).map(([id, d]) => `<path id="${id}" d="${d}"/>`).join("");
  glyphs = new Map();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${BASE_CSS}${css}</style>
<defs>${defs}</defs>
${body}
</svg>
`;
}

async function write(rel, content) {
  const file = join(ASSETS, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
  console.log(`  ✓ assets/${rel} (${(content.length / 1024).toFixed(0)} KB)`);
}

// ── shared shapes ─────────────────────────────────────────────────────────────
const SHURIKEN =
  "M0 -14 L3.6 -3.6 L14 0 L3.6 3.6 L0 14 L-3.6 3.6 L-14 0 L-3.6 -3.6 Z M2.6 0 A2.6 2.6 0 1 0 -2.6 0 A2.6 2.6 0 1 0 2.6 0 Z";
const PETAL = "M0 0 C3 -7 11 -8 11 -1 C11 5 4 8 0 0 Z";
const STAR = "M0 -6 L1.8 -1.9 L6 -1.9 L2.6 0.8 L3.8 5 L0 2.5 L-3.8 5 L-2.6 0.8 L-6 -1.9 L-1.8 -1.9 Z";

/** A leaping chibi ninja in a hood, facing left, centred on its body. Ribbons flutter. */
function ninja(fill = "#04061A", eye = "#FFFFFF", face = "#222A62") {
  const flutter = (a, b, dur) =>
    `<path d="${a}"><animate attributeName="d" values="${a};${b};${a}" dur="${dur}s" repeatCount="indefinite"/></path>`;
  const limb = (d, w) => `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round"/>`;
  return `<g fill="${fill}">
  ${limb("M-4 22 L34 -50", 6)}${limb("M22 -41 L33 -33", 5)}${limb("M30 -44 L40 -62", 8)}
  ${flutter("M18 -64 C32 -76 48 -64 66 -74 C56 -60 38 -58 20 -58 Z", "M18 -64 C32 -68 48 -74 66 -66 C56 -54 38 -62 20 -58 Z", 0.7)}
  ${flutter("M18 -60 C30 -56 44 -46 60 -52 C50 -40 34 -44 18 -54 Z", "M18 -60 C30 -50 44 -54 60 -44 C48 -36 32 -46 18 -54 Z", 0.9)}
  ${flutter("M18 18 C30 22 42 16 56 24 C46 32 32 32 16 26 Z", "M18 18 C30 16 42 24 56 18 C48 30 32 28 16 26 Z", 0.8)}
  ${limb("M8 26 Q22 40 40 46", 14)}<ellipse cx="45" cy="48" rx="9" ry="6" transform="rotate(25 45 48)"/>
  ${limb("M-6 28 Q-18 40 -32 40", 14)}<ellipse cx="-38" cy="41" rx="9" ry="6"/>
  <path d="M-21 -6 C-25 14 -13 33 4 33 C22 33 29 14 23 -6 C12 -15 -12 -15 -21 -6 Z"/>
  ${limb("M16 2 Q30 12 42 12", 12)}<circle cx="45" cy="12" r="7"/>
  ${limb("M-14 -2 Q-30 -8 -44 -24", 12)}<circle cx="-46" cy="-27" r="7"/>
  <circle cx="0" cy="-32" r="32"/>
  <circle cx="16" cy="-61" r="7.5"/>
  <ellipse cx="-8" cy="-28" rx="20" ry="18" fill="${face}"/>
  <ellipse cx="-16" cy="-31" rx="5" ry="6.5" fill="${eye}"/><ellipse cx="-2" cy="-32" rx="5" ry="6.5" fill="${eye}"/>
  <circle cx="-17.5" cy="-30" r="2.4"/><circle cx="-3.5" cy="-31" r="2.4"/>
</g>`;
}

function stars(n, seed, w, h) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const d = (2 + r() * 3).toFixed(2);
    out += `<circle class="tw" cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.5 + r() * 1.2).toFixed(2)}" fill="#fff" style="animation-duration:${d}s;animation-delay:-${(r() * 4).toFixed(2)}s"/>`;
  }
  return out;
}

function petals(n, seed, x0, x1) {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < n; i++) {
    const d = 9 + r() * 8;
    out += `<g transform="translate(${(x0 + r() * (x1 - x0)).toFixed(0)} -20) scale(${(0.6 + r() * 0.8).toFixed(2)})"><path class="petal" d="${PETAL}" fill="${C.sakura}" fill-opacity=".85" style="animation-duration:${d.toFixed(1)}s;animation-delay:-${(r() * d).toFixed(1)}s"/></g>`;
  }
  return out;
}

/** A Japanese roof with upturned eaves, sitting on y. */
const eave = (cx, y, w, rise = 16) =>
  `<path d="M${cx - w / 2} ${y} Q${cx - w / 2 + 10} ${y - 6} ${cx - w / 2 + 18} ${y - rise} L${cx + w / 2 - 18} ${y - rise} Q${cx + w / 2 - 10} ${y - 6} ${cx + w / 2} ${y} Q${cx} ${y - 5} ${cx - w / 2} ${y} Z"/>`;

const house = (x, w, h, base) =>
  `<rect x="${x}" y="${base - h}" width="${w}" height="${h}"/>${eave(x + w / 2, base - h + 2, w + 26, 18)}`;

function pagoda(cx, base) {
  const tiers = [[80, 55, 124], [60, 34, 100], [44, 30, 80]];
  let y = base, out = "";
  for (const [bw, bh, rw] of tiers) {
    out += `<rect x="${cx - bw / 2}" y="${y - bh}" width="${bw}" height="${bh}"/>${eave(cx, y - bh, rw, 16)}`;
    y -= bh + 12;
  }
  return out + `<rect x="${cx - 2}" y="${y - 30}" width="4" height="44"/><circle cx="${cx}" cy="${y - 32}" r="4"/>`;
}

const torii = (cx, base, color) => `<g fill="${color}">
  <rect x="${cx - 40}" y="${base - 90}" width="9" height="90"/><rect x="${cx + 31}" y="${base - 90}" width="9" height="90"/>
  <rect x="${cx - 48}" y="${base - 76}" width="96" height="7"/>
  <path d="M${cx - 58} ${base - 96} Q${cx} ${base - 104} ${cx + 58} ${base - 96} L${cx + 54} ${base - 86} Q${cx} ${base - 92} ${cx - 54} ${base - 86} Z"/>
  <rect x="${cx - 3}" y="${base - 88}" width="6" height="14"/>
</g>`;

const cloud = (x, y, s, delay) =>
  `<g class="drift" style="animation-delay:${delay}s"><g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="62" ry="9"/><ellipse cx="42" cy="-6" rx="46" ry="8"/><ellipse cx="-38" cy="4" rx="42" ry="6"/></g></g>`;

const STAMP_CSS = `.stamp{animation:stamp .6s cubic-bezier(.2,1.4,.4,1) both;transform-box:fill-box;transform-origin:center}
@keyframes stamp{from{opacity:0;transform:scale(1.9) rotate(-14deg)}to{opacity:1;transform:rotate(-6deg)}}`;

/** Small red square + mono caption, used as the title on stat cards. */
const label = (x, y, str) =>
  `<rect x="${x}" y="${y - 10}" width="10" height="10" rx="2" fill="${C.red}"/>${text(str, { x: x + 18, y, size: 12.5, font: "m", spacing: 2.5, fill: C.muted })}`;

/** Dark rounded card with an optional light travelling round its border. */
function card(w, h, accent, inner, { comet = true } = {}) {
  const per = 2 * (w + h);
  return `<defs>
  <clipPath id="cardclip"><rect width="${w}" height="${h}" rx="20"/></clipPath>
  <linearGradient id="cardbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.deep}"/><stop offset="1" stop-color="${C.indigo}"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="${accent}" stop-opacity=".16"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
</defs>
<g clip-path="url(#cardclip)"><rect width="${w}" height="${h}" fill="url(#cardbg)"/><circle cx="${w}" cy="0" r="${h * 0.8}" fill="url(#glow)"/>${inner}</g>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="19" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1.5"/>
${comet ? `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="19" fill="none" stroke="${accent}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="130 ${per - 130}"><animate attributeName="stroke-dashoffset" from="0" to="-${per}" dur="7s" repeatCount="indefinite"/></rect>` : ""}`;
}

// ── banner ────────────────────────────────────────────────────────────────────
function banner() {
  const W = 1200, H = 460, MX = 900, MY = 190, base = 460;
  const { first, last } = cfg.name;
  const nameW = Math.min(610, measure(first, 104, "d", 1));
  const pillW = measure(cfg.tag, 12, "m", 2.5) + 52;

  let cx = 70;
  const chips = cfg.chips
    .map((c) => {
      const w = measure(c, 11.5, "m", 1.5) + 28;
      const g = `<g transform="translate(${cx} 326)"><rect width="${w}" height="28" rx="14" fill="${C.blue}" fill-opacity=".14" stroke="${C.blue}" stroke-opacity=".55"/>${text(c, { x: w / 2, y: 18.5, size: 11.5, font: "m", spacing: 1.5, fill: "#BFD0FF", anchor: "middle" })}</g>`;
      cx += w + 10;
      return g;
    })
    .join("");

  const houses = [[12, 84, 40], [106, 64, 30], [178, 100, 50], [296, 76, 36], [382, 92, 46], [486, 70, 32], [566, 96, 54], [812, 90, 44], [918, 70, 30], [996, 60, 40], [1128, 70, 34]];
  const lanterns = [[228, 42], [431, 36], [614, 44], [857, 38], [1030, 30]]
    .map(([x, y], i) => `<g class="flk" style="animation-delay:-${i * 0.7}s"><circle cx="${x}" cy="${base - y}" r="11" fill="#FFB347" fill-opacity=".22"/><circle cx="${x}" cy="${base - y}" r="4" fill="#FFB347"/></g>`)
    .join("");
  const name = (fill, d = 0) => text(first, { x: 70 + d, y: 216 + d, size: 104, font: "d", spacing: 1, max: 610, fill });

  const css = `
.halo{animation:halo 5s ease-in-out infinite}
.bob{animation:bob 3.2s ease-in-out infinite}
.drift{animation:drift 70s linear infinite}
.throw{animation:throw 7s linear infinite;opacity:0}
@keyframes halo{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-1500px)}}
@keyframes throw{0%{transform:translate(831px,160px);opacity:0}3%{opacity:1}15%{transform:translate(430px,40px);opacity:1}30%{transform:translate(-80px,30px);opacity:1}30.1%,100%{transform:translate(-80px,30px);opacity:0}}
${STAMP_CSS}`;

  return doc(W, H, `${cfg.name.full} — ${cfg.role.replace(/\s+/g, " ")}`, `
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#050818"/><stop offset=".5" stop-color="#111947"/><stop offset=".82" stop-color="#321C4F"/><stop offset="1" stop-color="#5E2140"/>
  </linearGradient>
  <radialGradient id="moon" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".6" stop-color="#FFE7A8"/><stop offset="1" stop-color="#F2BE62"/></radialGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="#FFD98A" stop-opacity=".5"/><stop offset=".5" stop-color="#FFD98A" stop-opacity=".12"/><stop offset="1" stop-color="#FFD98A" stop-opacity="0"/></radialGradient>
  <radialGradient id="horizon" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="${C.red}" stop-opacity=".42"/><stop offset="1" stop-color="${C.red}" stop-opacity="0"/></radialGradient>
  <linearGradient id="nameFill" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="218"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#BFD0FF"/></linearGradient>
  <linearGradient id="shine" gradientUnits="userSpaceOnUse" x1="70" y1="0" x2="${70 + nameW}" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".44" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset=".56" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    <animateTransform attributeName="gradientTransform" type="translate" values="-${nameW} 0;${nameW} 0;${nameW} 0" keyTimes="0;.3;1" dur="7s" begin="2s" repeatCount="indefinite"/>
  </linearGradient>
  <clipPath id="reveal"><rect x="40" y="118" width="0" height="124"><animate attributeName="width" from="0" to="740" dur="1.1s" begin=".35s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".75 0 .25 1"/></rect></clipPath>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <ellipse cx="600" cy="470" rx="760" ry="200" fill="url(#horizon)"/>
  ${stars(70, 7, W, 340)}
  <circle class="halo" cx="${MX}" cy="${MY}" r="240" fill="url(#halo)"/>
  <circle cx="${MX}" cy="${MY}" r="118" fill="url(#moon)"/>
  <g fill="#E4B866" fill-opacity=".35"><circle cx="${MX - 40}" cy="${MY - 46}" r="14"/><circle cx="${MX + 52}" cy="${MY + 30}" r="20"/><circle cx="${MX + 18}" cy="${MY - 70}" r="7"/><circle cx="${MX - 62}" cy="${MY + 52}" r="9"/></g>
  <g fill="#0E1440" fill-opacity=".78">${cloud(1300, 150, 1.1, -19)}${cloud(1300, 262, 1.4, -42)}${cloud(1300, 96, 0.8, -60)}</g>
  <g transform="translate(${MX} ${MY + 10}) scale(1.5)"><g class="bob">${ninja()}</g></g>
  <g class="throw"><path class="spin" style="animation-duration:.45s" d="${SHURIKEN}" fill="#D9E2FF" fill-rule="evenodd"/></g>

  <path d="M0 402 C150 372 260 392 380 382 S620 362 760 386 S1000 366 1200 380 L1200 460 L0 460 Z" fill="#141A48"/>
  <g fill="#0C1133">${pagoda(1085, base)}</g>
  ${torii(735, base, "#7E1B2A")}
  <g fill="#05071A">${houses.map(([x, w, h]) => house(x, w, h, base)).join("")}<rect y="452" width="${W}" height="8"/></g>
  ${lanterns}
  ${petals(10, 3, 80, 1260)}

  <g transform="translate(70 86)">
    <rect width="${pillW}" height="30" rx="15" fill="${C.red}" fill-opacity=".14" stroke="${C.red}" stroke-opacity=".55"/>
    <circle class="pulse" cx="19" cy="15" r="4.5" fill="#FF4D5A"/>
    ${text(cfg.tag, { x: 34, y: 19.5, size: 12, font: "m", spacing: 2.5, fill: "#FF9AA2" })}
  </g>
  <g clip-path="url(#reveal)">${name(C.red, 5)}${name("url(#nameFill)")}${name("url(#shine)")}</g>
  <rect x="40" y="116" width="4" height="128" fill="#fff" opacity="0">
    <animate attributeName="x" from="40" to="780" dur="1.1s" begin=".35s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".75 0 .25 1"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="1.1s" begin=".35s" fill="freeze"/>
  </rect>
  <g transform="translate(${70 + nameW + 26} 142)"><g class="stamp" style="animation-delay:1.3s">
    <rect width="64" height="64" rx="11" fill="${C.seal}"/><rect x="5" y="5" width="54" height="54" rx="8" fill="none" stroke="#fff" stroke-opacity=".45"/>
    <text x="32" y="45" text-anchor="middle" font-family="${JP}" font-size="37" font-weight="700" fill="#FFF3EC">忍</text>
  </g></g>
  ${text(last, { x: 72, y: 266, size: 40, font: "i", fill: C.sky, cls: "fade", style: "animation-delay:1.2s" })}
  ${text(cfg.role, { x: 72, y: 306, size: 19, font: "s", fill: "#D5DCFF", max: 640, cls: "fade", style: "animation-delay:1.45s" })}
  <g class="fade" style="animation-delay:1.7s">${chips}</g>
</g>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="23.5" fill="none" stroke="${C.blue}" stroke-opacity=".35" stroke-width="1.5"/>`, css);
}

// ── divider ───────────────────────────────────────────────────────────────────
function divider() {
  return doc(1200, 40, "", `
<defs>
  <linearGradient id="dl" x1="0" x2="1"><stop offset="0" stop-color="${C.blue}" stop-opacity="0"/><stop offset=".3" stop-color="${C.blue}"/><stop offset=".5" stop-color="${C.red}"/><stop offset=".7" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></linearGradient>
  <linearGradient id="trail" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".9"/></linearGradient>
</defs>
<rect x="0" y="19" width="1200" height="2" rx="1" fill="url(#dl)" opacity=".7"/>
<g class="run"><rect x="-90" y="19" width="90" height="2" fill="url(#trail)"/><circle cy="20" r="3" fill="#fff"/></g>
<g transform="translate(600 20)"><rect x="-8" y="-8" width="16" height="16" transform="rotate(45)" fill="${C.night}" stroke="${C.red}" stroke-width="2"/><circle r="2.5" fill="${C.red}"/></g>`,
    `.run{animation:run 5s cubic-bezier(.6,0,.4,1) infinite}@keyframes run{from{transform:translateX(-20px)}to{transform:translateX(1300px)}}`);
}

// ── about card ────────────────────────────────────────────────────────────────
function about() {
  const W = 1200, H = 600, P0 = 58, P1 = 1142;
  const r = rng(11);
  let fibres = "";
  for (let i = 0; i < 46; i++) {
    const x = P0 + r() * (P1 - P0 - 80), y = 64 + r() * 470;
    fibres += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(20 + r() * 30).toFixed(0)} ${(r() * 6 - 3).toFixed(1)} ${(40 + r() * 60).toFixed(0)} ${(r() * 4 - 2).toFixed(1)}"/>`;
  }
  let motif = "";
  for (let x = P0 + 30; x < P1 - 20; x += 44) motif += `<rect x="${x}" y="-4" width="8" height="8" transform="rotate(45 ${x + 4} 0)"/>`;

  const top = 200, gap = cfg.about.length > 6 ? 46 : 52;
  const rows = cfg.about
    .map(([name, value], i) => {
      const y = top + i * gap;
      const begin = (1.9 + i * 0.22).toFixed(2);
      return `<clipPath id="row${i}"><rect x="96" y="${y - 30}" width="0" height="46"><animate attributeName="width" from="0" to="780" dur=".7s" begin="${begin}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".6 0 .2 1"/></rect></clipPath>
<g clip-path="url(#row${i})">
  ${text(String(i + 1).padStart(2, "0"), { x: 100, y, size: 13, font: "m", fill: C.seal })}
  ${text(name, { x: 140, y: y - 1, size: 12, font: "m", spacing: 2.5, fill: C.brown })}
  ${text(value, { x: 290, y, size: 19, font: "sm", fill: C.ink, max: 540 })}
  <line x1="100" y1="${y + 15}" x2="840" y2="${y + 15}" stroke="${C.brown}" stroke-opacity=".22" stroke-dasharray="2 5"/>
</g>`;
    })
    .join("\n");

  const roller = (x) => `<rect x="${x}" y="24" width="34" height="552" rx="10" fill="url(#wood)"/>
<rect x="${x - 6}" y="10" width="46" height="18" rx="6" fill="url(#brass)"/><rect x="${x - 6}" y="572" width="46" height="18" rx="6" fill="url(#brass)"/>`;

  // Ensō (an almost-closed brush circle) around a monogram.
  const ex = 990, ey = 286, er = 104;
  const pt = (deg) => [ex + er * Math.cos((deg * Math.PI) / 180), ey + er * Math.sin((deg * Math.PI) / 180)].map((n) => n.toFixed(1));
  const [ax, ay] = pt(-70), [bx, by] = pt(-100);
  const motto = wrap(`“${cfg.motto}”`, 23, "i", 165);

  return doc(W, H, `About ${cfg.name.full}: ${cfg.about.map(([l, v]) => `${l.toLowerCase()} ${v}`).join("; ")}`, `
<defs>
  <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8EED8"/><stop offset="1" stop-color="#EEDDBD"/></linearGradient>
  <linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#3E120B"/><stop offset=".45" stop-color="#8C3A22"/><stop offset="1" stop-color="#3A0F09"/></linearGradient>
  <linearGradient id="brass" x1="0" x2="1"><stop offset="0" stop-color="#9C6F22"/><stop offset=".5" stop-color="#F2D27A"/><stop offset="1" stop-color="#8E6420"/></linearGradient>
  <clipPath id="unroll"><rect x="600" y="0" width="0" height="${H}">
    <animate attributeName="x" from="600" to="${P0}" dur="1.5s" begin="0s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".6 0 .2 1"/>
    <animate attributeName="width" from="0" to="${P1 - P0}" dur="1.5s" begin="0s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".6 0 .2 1"/>
  </rect></clipPath>
</defs>
<g clip-path="url(#unroll)">
  <rect x="${P0}" y="36" width="${P1 - P0}" height="528" fill="url(#paper)"/>
  <g fill="none" stroke="${C.brown}" stroke-opacity=".08">${fibres}</g>
  <rect x="${P0}" y="36" width="${P1 - P0}" height="26" fill="#1B2A6B"/><rect x="${P0}" y="538" width="${P1 - P0}" height="26" fill="#1B2A6B"/>
  <g stroke="#E6C36A" stroke-opacity=".7"><line x1="${P0}" y1="40" x2="${P1}" y2="40"/><line x1="${P0}" y1="58" x2="${P1}" y2="58"/><line x1="${P0}" y1="542" x2="${P1}" y2="542"/><line x1="${P0}" y1="560" x2="${P1}" y2="560"/></g>
  <g fill="#E6C36A" fill-opacity=".55"><g transform="translate(0 49)">${motif}</g><g transform="translate(0 551)">${motif}</g></g>

  ${text(cfg.name.full, { x: 100, y: 124, size: 34, font: "d", fill: C.ink })}
  <path d="M100 142 Q320 136 600 144" fill="none" stroke="${C.seal}" stroke-width="3" stroke-linecap="round" stroke-opacity=".75" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur=".8s" begin="1.5s" fill="freeze"/></path>
  ${rows}

  <path d="M${ax} ${ay} A${er} ${er} 0 1 1 ${bx} ${by}" fill="none" stroke="${C.ink}" stroke-width="16" stroke-linecap="round" stroke-opacity=".9" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.4s" begin="1.8s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".5 0 .3 1"/></path>
  <path d="M${ax} ${ay} A${er + 7} ${er + 7} 0 1 1 ${bx} ${by}" fill="none" stroke="${C.ink}" stroke-width="3" stroke-opacity=".35" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.4s" begin="1.9s" fill="freeze"/></path>
  ${text("J", { x: ex - 6, y: ey + 48, size: 150, font: "i", fill: C.seal, anchor: "middle", cls: "fade", style: "animation-delay:3s" })}
  <g class="fade" style="animation-delay:3.4s">${motto.map((line, i) => text(line, { x: ex, y: 446 + i * 27, size: 23, font: "i", fill: C.ink, anchor: "middle" })).join("")}</g>
  ${text(`— ${cfg.mottoBy}`, { x: ex, y: 446 + motto.length * 27 + 6, size: 11, font: "m", spacing: 4, fill: C.brown, anchor: "middle", cls: "fade", style: "animation-delay:3.6s" })}
</g>
<g><animateTransform attributeName="transform" type="translate" from="${600 - 40 - 17} 0" to="0 0" dur="1.5s" begin="0s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".6 0 .2 1"/>${roller(40)}</g>
<g><animateTransform attributeName="transform" type="translate" from="${600 - 1126 - 17} 0" to="0 0" dur="1.5s" begin="0s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".6 0 .2 1"/>${roller(1126)}</g>`);
}

// ── section headers (one per GitHub theme) ────────────────────────────────────
function header(title, index, theme) {
  const dark = theme === "dark";
  const num = String(index).padStart(2, "0");
  const lx = Math.min(72 + measure(title, 36, "d") + 28, 1080);
  return doc(1200, 84, title, `
<defs><linearGradient id="ln" gradientUnits="userSpaceOnUse" x1="${lx}" y1="0" x2="1176" y2="0"><stop offset="0" stop-color="${C.red}"/><stop offset=".55" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/></linearGradient></defs>
${text(num, { x: 24, y: 54, size: 15, font: "m", fill: C.red, cls: "fade" })}
${text(title, { x: 70, y: 56, size: 36, font: "d", fill: dark ? C.text : C.night, cls: "fade", style: "animation-delay:.1s" })}
<path d="M${lx} 44 L1176 44" stroke="url(#ln)" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.2s" begin=".3s" fill="freeze"/></path>`);
}

// ── project cards ─────────────────────────────────────────────────────────────
function project(m) {
  const W = 600, H = 340;
  const tone = { live: C.green, gold: C.gold, done: C.sky }[m.status.tone];
  const icon = {
    live: `<circle class="pulse" cx="17" cy="13" r="4" fill="${tone}"/>`,
    gold: `<path d="${STAR}" transform="translate(17 13)" fill="${tone}"/>`,
    done: `<path d="M12.5 13.2 L15.8 16.4 L21.5 9.8" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  }[m.status.tone];
  const pillW = measure(m.status.text, 11, "m", 1.2) + 44;
  const summary = wrap(m.summary, 16, "s", W - 56)
    .slice(0, 3)
    .map((l, i) => text(l, { x: 28, y: 134 + i * 23, size: 16, font: "s", fill: C.soft }))
    .join("");
  const metrics = m.metrics
    .map(([v, l], i) => `<g transform="translate(${28 + i * 184} 0)"><g class="fade" style="animation-delay:${0.3 + i * 0.15}s">
  ${text(v, { y: 236, size: 28, font: "d", fill: m.accent, max: 170 })}
  ${text(l, { y: 258, size: 11, font: "m", fill: C.muted, max: 170 })}</g></g>`)
    .join("");
  let x = 28;
  const chips = m.stack
    .map((s) => {
      const w = measure(s, 12, "sm") + 24;
      if (x + w > W - 28) return "";
      const g = `<g transform="translate(${x} 286)"><rect width="${w}" height="26" rx="13" fill="#fff" fill-opacity=".06" stroke="#fff" stroke-opacity=".12"/>${text(s, { x: w / 2, y: 17.5, size: 12, font: "sm", fill: C.soft, anchor: "middle" })}</g>`;
      x += w + 8;
      return g;
    })
    .join("");

  return doc(W, H, `${m.title} — ${m.summary}`, card(W, H, m.accent, `
<g transform="translate(28 28)">
  <rect width="56" height="56" rx="14" fill="${m.accent}" fill-opacity=".14" stroke="${m.accent}" stroke-opacity=".55"/>
  ${text(m.title[0], { x: 28, y: 38, size: 28, font: "d", fill: m.accent, anchor: "middle" })}
</g>
${text(m.title, { x: 100, y: 62, size: 30, font: "d", fill: C.text, max: W - 128 - pillW })}
${text(m.kind, { x: 101, y: 86, size: 11, font: "m", spacing: 1.2, fill: C.muted, max: W - 130 })}
<g transform="translate(${W - 28 - pillW} 30)">
  <rect width="${pillW}" height="26" rx="13" fill="${tone}" fill-opacity=".12" stroke="${tone}" stroke-opacity=".5"/>
  ${icon}
  ${text(m.status.text, { x: 30, y: 17.2, size: 11, font: "m", spacing: 1.2, fill: tone })}
</g>
${summary}
<line x1="28" y1="194" x2="${W - 28}" y2="194" stroke="#fff" stroke-opacity=".08"/>
${metrics}
${chips}`));
}

// ── achievements ──────────────────────────────────────────────────────────────
function achievements() {
  const W = 1200, H = 260, list = cfg.achievements;
  const tints = [C.gold, C.sky, C.red, "#B69CFF", C.green];
  const step = (W - 80) / list.length;
  const medals = list
    .map(([big, title, small], i) => {
      const cx = 40 + step * (i + 0.5), cy = 104, t = tints[i % tints.length];
      return `<g class="fade" style="animation-delay:${0.15 * i}s">
  <circle cx="${cx}" cy="${cy}" r="76" fill="none" stroke="${t}" stroke-opacity=".45" stroke-width="2" stroke-dasharray="3 7"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="${24 + i * 3}s" repeatCount="indefinite"/></circle>
  <circle cx="${cx}" cy="${cy}" r="64" fill="${C.night}" stroke="${t}" stroke-width="7"/>
  <circle cx="${cx}" cy="${cy}" r="54" fill="none" stroke="${t}" stroke-opacity=".3"/>
  <clipPath id="m${i}"><circle cx="${cx}" cy="${cy}" r="60"/></clipPath>
  <g clip-path="url(#m${i})"><rect x="${cx - 110}" y="${cy - 70}" width="36" height="140" fill="#fff" fill-opacity=".14" transform="rotate(20 ${cx} ${cy})"><animate attributeName="x" values="${cx - 150};${cx + 110};${cx + 110}" keyTimes="0;.35;1" dur="5s" begin="${i * 0.6}s" repeatCount="indefinite"/></rect></g>
  ${text(big, { x: cx, y: cy + 13, size: 38, font: "d", fill: t, anchor: "middle", max: 96 })}
  ${text(title, { x: cx, y: 208, size: 16, font: "ss", fill: C.text, anchor: "middle", max: step - 16 })}
  ${text(small, { x: cx, y: 230, size: 11, font: "m", spacing: 1, fill: C.muted, anchor: "middle" })}
</g>`;
    })
    .join("\n");
  return doc(W, H, `Achievements: ${list.map(([b, t]) => `${b} ${t}`).join(", ")}`, card(W, H, C.gold, `${stars(30, 5, W, H)}${medals}`, { comet: false }));
}

// ── footer ────────────────────────────────────────────────────────────────────
function footer() {
  const W = 1200, H = 240, wall = 192;
  let tiles = "";
  for (let x = 0; x < W; x += 16) tiles += `<path d="M${x} ${wall} a8 6 0 0 1 16 0 Z"/>`;
  return doc(W, H, `Thanks for visiting — ${cfg.footer}`, `
<defs>
  <clipPath id="fr"><rect width="${W}" height="${H}" rx="24"/></clipPath>
  <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050818"/><stop offset="1" stop-color="#1B1650"/></linearGradient>
</defs>
<g clip-path="url(#fr)">
  <rect width="${W}" height="${H}" fill="url(#fsky)"/>
  ${stars(50, 13, W, 180)}
  <circle cx="110" cy="62" r="30" fill="#FFE7A8"/><circle cx="124" cy="54" r="27" fill="#07091F"/>
  ${text("Thanks for visiting", { x: 600, y: 68, size: 30, font: "d", fill: C.text, anchor: "middle" })}
  ${text(cfg.footer, { x: 600, y: 100, size: 16, font: "s", fill: C.soft, anchor: "middle" })}
  ${text(`© ${new Date().getFullYear()}`, { x: 600, y: 126, size: 11, font: "m", spacing: 2, fill: C.dim, anchor: "middle" })}
  <g fill="#0B0E2A">${tiles}</g>
  <rect y="${wall}" width="${W}" height="10" fill="#1D2250"/>
  <rect y="${wall + 10}" width="${W}" height="${H - wall - 10}" fill="#E9DFC8" fill-opacity=".92"/>
  <g fill="#C9BDA2">${Array.from({ length: 12 }, (_, i) => `<rect x="${60 + i * 100}" y="${wall + 20}" width="42" height="16" rx="3"/>`).join("")}</g>
  <g class="runx"><g class="hop"><g transform="scale(-.42 .42)">${ninja()}</g></g></g>
  ${petals(10, 21, 100, 1300)}
</g>`,
    `.runx{animation:runx 11s linear infinite}.hop{animation:hop .9s ease-in-out infinite}
@keyframes runx{from{transform:translate(-80px,169px)}to{transform:translate(1280px,169px)}}
@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}`);
}

// ── stats from GitHub ─────────────────────────────────────────────────────────
async function gql(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-assets" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub GraphQL ${res.status}: ${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

async function fetchStats(login) {
  const { user } = await gql(
    `query($login:String!){ user(login:$login){
      contributionsCollection{
        totalCommitContributions restrictedContributionsCount totalPullRequestContributions
        totalIssueContributions totalPullRequestReviewContributions
        contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount contributionLevel } } }
      }
    } }`,
    { login },
  );
  const repos = [];
  for (let after = null; ; ) {
    const data = await gql(
      `query($login:String!,$after:String){ user(login:$login){ repositories(first:100, after:$after, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC){
        pageInfo{hasNextPage endCursor}
        nodes{ stargazerCount languages(first:12, orderBy:{field:SIZE, direction:DESC}){ edges{ size node{ name color } } } }
      } } }`,
      { login, after },
    );
    const page = data.user.repositories;
    repos.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }

  const cc = user.contributionsCollection;
  const weeks = cc.contributionCalendar.weeks.map((w) => w.contributionDays);
  const days = weeks.flat();

  let longest = 0, run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0, i = days.length - 1;
  if (i >= 0 && days[i].contributionCount === 0) i--; // today may still be empty
  for (; i >= 0 && days[i].contributionCount > 0; i--) current++;

  const bytes = new Map();
  const skip = new Set(cfg.excludeLanguages.map((l) => l.toLowerCase()));
  for (const repo of repos)
    for (const { size, node } of repo.languages.edges) {
      if (skip.has(node.name.toLowerCase())) continue;
      const prev = bytes.get(node.name) ?? { size: 0, color: node.color };
      bytes.set(node.name, { size: prev.size + size, color: node.color ?? prev.color });
    }
  const total = [...bytes.values()].reduce((a, b) => a + b.size, 0);
  const languages = [...bytes.entries()]
    .map(([name, v]) => ({ name, color: v.color ?? C.sky, pct: total ? (v.size / total) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct);

  return {
    total: cc.contributionCalendar.totalContributions,
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: cc.totalPullRequestContributions,
    issues: cc.totalIssueContributions,
    reviews: cc.totalPullRequestReviewContributions,
    repos: repos.length,
    stars: repos.reduce((a, r) => a + r.stargazerCount, 0),
    activeDays: days.filter((d) => d.contributionCount > 0).length,
    bestDay: Math.max(0, ...days.map((d) => d.contributionCount)),
    totalDays: days.length,
    current, longest, weeks, languages,
  };
}

const stamp = () => `updated ${new Date().toISOString().slice(0, 10)}`;

function overview(s) {
  const W = 600, H = 340, cx = 132, cy = 184, r = 78, circ = 2 * Math.PI * r;
  const p = s.totalDays ? s.activeDays / s.totalDays : 0;
  // Always-meaningful rows first; the rest only once they are non-zero.
  const rows = [
    ["COMMITS", fmt(s.commits)], ["ACTIVE DAYS", fmt(s.activeDays)], ["PUBLIC REPOS", fmt(s.repos)],
    ["CURRENT STREAK", `${s.current} d`], ["LONGEST STREAK", `${s.longest} d`], ["BEST DAY", fmt(s.bestDay)],
    ...[["PULL REQUESTS", s.prs], ["ISSUES", s.issues], ["CODE REVIEWS", s.reviews], ["STARS EARNED", s.stars]]
      .filter(([, v]) => v > 0)
      .map(([l, v]) => [l, fmt(v)]),
  ]
    .slice(0, 8)
    .map(([l, v], i) => {
      const y = 94 + i * 29;
      return `<g class="fade" style="animation-delay:${0.2 + i * 0.08}s">${text(l, { x: 262, y, size: 11.5, font: "m", spacing: 1.5, fill: C.muted })}
${text(v, { x: 572, y: y + 1, size: 18, font: "d", fill: C.text, anchor: "end" })}
<line x1="262" y1="${y + 10}" x2="572" y2="${y + 10}" stroke="#fff" stroke-opacity=".06"/></g>`;
    })
    .join("");
  return doc(W, H, `GitHub overview: ${s.total} contributions in the last 12 months, active on ${s.activeDays} days`, card(W, H, C.red, `
<defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.blue}"/><stop offset="1" stop-color="${C.red}"/></linearGradient></defs>
${label(28, 44, "GITHUB OVERVIEW")}
${text("LAST 12 MONTHS", { x: 572, y: 44, size: 10.5, font: "m", spacing: 2, fill: C.dim, anchor: "end" })}
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="14"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="14" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${circ.toFixed(1)}"><animate attributeName="stroke-dashoffset" from="${circ.toFixed(1)}" to="${(circ * (1 - Math.min(1, p))).toFixed(1)}" dur="1.6s" begin=".3s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/></circle>
${text(fmt(s.total), { x: cx, y: cy + 10, size: 40, font: "d", fill: C.text, anchor: "middle" })}
${text("CONTRIBUTIONS", { x: cx, y: cy + 32, size: 9.5, font: "m", spacing: 2, fill: C.muted, anchor: "middle" })}
${text(`Active on ${fmt(s.activeDays)} of ${fmt(s.totalDays)} days`, { x: cx, y: cy + r + 44, size: 14, font: "sm", fill: C.soft, anchor: "middle" })}
${rows}
${text(stamp(), { x: 572, y: H - 16, size: 9.5, font: "m", fill: C.dim, anchor: "end" })}`));
}

function languages(s) {
  const W = 600, H = 340, top = s.languages.slice(0, 6);
  const rows = top
    .map((l, i) => {
      const y = 96 + i * 38, w = (544 * l.pct) / 100;
      return `${text(l.name, { x: 28, y, size: 15, font: "ss", fill: C.text })}
${text(`${l.pct.toFixed(1)}%`, { x: 572, y, size: 12.5, font: "m", fill: C.muted, anchor: "end" })}
<rect x="28" y="${y + 9}" width="544" height="8" rx="4" fill="#fff" fill-opacity=".07"/>
<rect x="28" y="${y + 9}" width="0" height="8" rx="4" fill="${l.color}"><animate attributeName="width" from="0" to="${Math.max(w, 4).toFixed(1)}" dur="1.1s" begin="${(0.2 + i * 0.12).toFixed(2)}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"/></rect>`;
    })
    .join("");
  return doc(W, H, `Top languages: ${top.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}`, card(W, H, C.blue, `
${label(28, 44, "TOP LANGUAGES")}
${text("BY BYTES · PUBLIC REPOS", { x: 572, y: 44, size: 10.5, font: "m", spacing: 2, fill: C.dim, anchor: "end" })}
${rows || text("No public code yet.", { x: 300, y: 180, size: 16, font: "s", fill: C.muted, anchor: "middle" })}
${text(`${s.languages.length} languages across ${s.repos} public repos`, { x: 28, y: H - 16, size: 9.5, font: "m", fill: C.dim })}
${text(stamp(), { x: 572, y: H - 16, size: 9.5, font: "m", fill: C.dim, anchor: "end" })}`));
}

/** The last year of contributions as a skyline: a building per week, a window per day. */
function skyline(s) {
  const W = 1200, H = 330, ground = 282, x0 = 28, x1 = 1172;
  const weeks = s.weeks, slot = (x1 - x0) / weeks.length, bw = Math.max(6, slot - 4);
  const totals = weeks.map((w) => w.reduce((a, d) => a + d.contributionCount, 0));
  const max = Math.max(1, ...totals);
  const LIT = { NONE: "#1A2150", FIRST_QUARTILE: "#7A5C1E", SECOND_QUARTILE: "#B8862B", THIRD_QUARTILE: "#F2B63D", FOURTH_QUARTILE: "#FFE08A" };
  const flicker = rng(17), jitter = rng(41);

  const tops = [];
  let buildings = "", windows = "", months = "", lastMonth = -1;
  weeks.forEach((days, i) => {
    const x = x0 + i * slot + (slot - bw) / 2;
    // A quiet week is still a building; contributions make it taller.
    const h = 88 + Math.round(jitter() * 22) + Math.round(96 * Math.sqrt(totals[i] / max));
    const top = ground - h;
    tops.push([x + bw / 2, top]);
    buildings += `<rect x="${x.toFixed(1)}" y="${top}" width="${bw.toFixed(1)}" height="${h}" fill="${i % 2 ? "#0E1336" : "#111846"}"/>
<path d="M${(x - 3).toFixed(1)} ${top} L${(x + bw + 3).toFixed(1)} ${top} L${(x + bw - 1).toFixed(1)} ${top - 5} Q${(x + bw / 2).toFixed(1)} ${top - 10} ${(x + 1).toFixed(1)} ${top - 5} Z" fill="#1A2160"/>`;
    days.forEach((d, j) => {
      const lit = d.contributionLevel !== "NONE";
      const cls = lit && flicker() < 0.12 ? ` class="flk" style="animation-delay:-${(flicker() * 2).toFixed(1)}s"` : "";
      windows += `<rect${cls} x="${(x + 3).toFixed(1)}" y="${top + 12 + j * 10}" width="${(bw - 6).toFixed(1)}" height="6" rx="1" fill="${LIT[d.contributionLevel] ?? LIT.NONE}"><title>${d.date}: ${d.contributionCount}</title></rect>`;
    });
    const month = new Date(`${days[0].date}T00:00:00Z`).getUTCMonth();
    if (month !== lastMonth) {
      const name = new Date(Date.UTC(2000, month, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
      if (lastMonth !== -1) months += text(name, { x, y: ground + 24, size: 10, font: "m", spacing: 1, fill: C.dim });
      lastMonth = month;
    }
  });

  const hop = tops.filter((_, i) => i % 3 === 0 || i === tops.length - 1).map(([x, y]) => [x, y - 30]);
  let path = `M${hop[0][0].toFixed(1)} ${hop[0][1]}`;
  for (let i = 1; i < hop.length; i++) {
    const [ax, ay] = hop[i - 1], [bx, by] = hop[i];
    path += ` Q${((ax + bx) / 2).toFixed(1)} ${Math.min(ay, by) - 36} ${bx.toFixed(1)} ${by}`;
  }
  const dur = (hop.length * 0.5).toFixed(1);
  const caption = "CONTRIBUTIONS · LAST 12 MONTHS";
  const capW = measure(caption, 10.5, "m", 1.5);

  return doc(W, H, `Contribution skyline: ${s.total} contributions in the last 12 months, one building per week`, card(W, H, C.gold, `
${stars(60, 29, W, 170)}
<circle cx="1110" cy="70" r="60" fill="#FFD98A" fill-opacity=".08"/><circle cx="1110" cy="70" r="26" fill="#FFE7A8"/>
${label(28, 42, "CONTRIBUTION SKYLINE")}
${text("each building is a week · each lit window is a day with contributions", { x: 28, y: 64, size: 10.5, font: "m", fill: C.dim })}
${text(fmt(s.total), { x: 1060 - capW - 8, y: 42, size: 18, font: "d", fill: C.gold, anchor: "end" })}
${text(caption, { x: 1060, y: 42, size: 10.5, font: "m", spacing: 1.5, fill: C.muted, anchor: "end" })}
${buildings}
${windows}
<rect y="${ground}" width="${W}" height="${H - ground}" fill="#05071A"/>
<line x1="0" y1="${ground}" x2="${W}" y2="${ground}" stroke="${C.red}" stroke-opacity=".35"/>
${months}
<g><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.03;.97;1" dur="${dur}s" repeatCount="indefinite"/><g transform="scale(-.36 .36)">${ninja("#04061A", "#FFE08A")}</g></g>
${text(stamp(), { x: W - 28, y: H - 14, size: 9.5, font: "m", fill: C.dim, anchor: "end" })}`, { comet: false }));
}

// ── build ─────────────────────────────────────────────────────────────────────
console.log("Building static images");
await write("banner.svg", banner());
await write("divider.svg", divider());
await write("about.svg", about());
await write("achievements.svg", achievements());
await write("footer.svg", footer());
let n = 0;
for (const [key, title] of Object.entries(cfg.headers)) {
  n++;
  await write(`headers/${key}-dark.svg`, header(title, n, "dark"));
  await write(`headers/${key}-light.svg`, header(title, n, "light"));
}
for (const m of cfg.projects) await write(`projects/${m.file}.svg`, project(m));

if (!TOKEN) {
  console.log("No GITHUB_TOKEN — skipping stats (overview, languages, skyline)");
} else {
  console.log(`Reading GitHub stats for ${cfg.login}`);
  const s = await fetchStats(cfg.login);
  await write("stats/overview.svg", overview(s));
  await write("stats/languages.svg", languages(s));
  await write("stats/skyline.svg", skyline(s));
}
