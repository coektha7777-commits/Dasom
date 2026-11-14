// Reusable PptxGenJS layout kit for Korean academic talks (16:9, 13.33 x 7.5 in).
// Usage:
//   const { createDeck } = require("<skill>/scripts/deck.js");
//   const d = createDeck({ figDir: "/path/figs/", source: "Author et al. (2025) Journal 1:1", title: "..." });
//   d.titleSlide({ kicker, title, subtitle, authors, citation, presenter, notes });
//   const s = d.base("슬라이드 제목", "결과", "Fig. 1, p.4"); d.time(s, "1:00");
//   d.img(s, "fig1.png", x, y, w, h, "대체 텍스트"); d.cap(s, "Fig. 1 원본", x, y, w);
//   await d.save("/path/out.pptx");
const path = require("path");
const fs = require("fs");

function loadPptxGen() {
  const tries = ["pptxgenjs", path.join(process.cwd(), "node_modules/pptxgenjs")];
  for (const t of tries) { try { return require(t); } catch (e) { /* next */ } }
  throw new Error("pptxgenjs not found: run `npm i pptxgenjs` in the build folder (or set NODE_PATH).");
}

const PALETTE = {
  NAVY: "1F2A44", // titles, table headers, title-slide background
  AMBER: "C8902E", // accent bar, section label, highlight callouts
  RED: "B23A3A", // risk, concern, warnings
  GREEN: "2E7D5B", // safe, within limit, positive result
  PURPLE: "5B4B8A", // optional second category
  STEEL: "5A6E96", // intermediate boxes in pathway diagrams
  GREY: "5A6170", // captions, sub-bullets, footers
  LIGHT: "F4F1EA", // panel and callout background
  INK: "222222", // body text
};

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString("ascii", 1, 4) !== "PNG") throw new Error(`img(): PNG only, got ${file}`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function createDeck({ figDir = "", source = "", title = "", font = "Malgun Gothic", palette = {} } = {}) {
  const pptxgen = loadPptxGen();
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  const C = { ...PALETTE, ...palette };
  const F = font;
  const fig = (f) => (path.isAbsolute(f) ? f : path.join(figDir, f));

  function titleSlide({ kicker = "", title: t, subtitle = "", authors = "", citation = "", presenter = "발표자: [이름]  ·  [학번]  ·  [날짜]", notes = "" }) {
    const s = pptx.addSlide();
    s.background = { color: C.NAVY };
    s.addShape(pptx.ShapeType.rect, { x: 0.6, y: 2.0, w: 0.12, h: 2.75, fill: { color: C.AMBER } });
    if (kicker) s.addText(kicker, { x: 0.95, y: 1.4, w: 8, h: 0.5, fontFace: F, fontSize: 18, color: C.AMBER, bold: true });
    s.addText(t, { x: 0.95, y: 1.95, w: 11.8, h: 1.8, fontFace: F, fontSize: 32, bold: true, color: "FFFFFF", valign: "top" });
    if (subtitle) s.addText(subtitle, { x: 0.95, y: 3.95, w: 11.5, h: 0.8, fontFace: F, fontSize: 16, italic: true, color: "C9CFDB", valign: "top" });
    s.addText([{ text: authors, options: { breakLine: true } }, { text: citation }], { x: 0.95, y: 5.2, w: 11.5, h: 0.9, fontFace: F, fontSize: 14, color: "FFFFFF" });
    s.addText(presenter, { x: 0.95, y: 6.4, w: 11.5, h: 0.4, fontFace: F, fontSize: 14, color: C.AMBER });
    if (notes) s.addNotes(notes);
    return s;
  }

  function base(t, section, src) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: C.AMBER } });
    if (section) s.addText(section, { x: 0.5, y: 0.22, w: 8, h: 0.3, fontFace: F, fontSize: 12, color: C.AMBER, bold: true });
    s.addText(t, { x: 0.5, y: 0.5, w: 12.3, h: 0.75, fontFace: F, fontSize: 28, bold: true, color: C.NAVY, valign: "top" });
    s.addText(src ? `${source} · ${src}` : source, { x: 0.5, y: 7.05, w: 12.3, h: 0.3, fontFace: F, fontSize: 10, color: C.GREY });
    return s;
  }

  const time = (s, t) => s.addText(t, { x: 11.3, y: 0.22, w: 1.55, h: 0.3, fontFace: F, fontSize: 11, color: C.GREY, align: "right" });

  function img(s, file, x, y, w, h, alt) {
    if (!alt) throw new Error(`img(${file}): alt text is required`);
    const { w: iw, h: ih } = pngSize(fig(file));
    const r = Math.min(w / iw, h / ih), W = iw * r, H = ih * r;
    s.addImage({ path: fig(file), x: x + (w - W) / 2, y: y + (h - H) / 2, w: W, h: H, altText: alt });
  }

  const cap = (s, t, x, y, w) => s.addText(t, { x, y, w, h: 0.32, fontFace: F, fontSize: 10.5, color: C.GREY, align: "center" });

  function bullets(s, items, x, y, w, h, size = 16) {
    const runs = items.map((it) => {
      const t = typeof it === "string" ? { t: it } : it;
      return { text: t.t, options: { bullet: t.sub ? { indent: 22 } : { code: "25A0", indent: 22 }, indentLevel: t.sub ? 1 : 0,
        fontSize: t.sub ? size - 3 : size, color: t.color || (t.sub ? C.GREY : C.INK), bold: !!t.bold, breakLine: true, paraSpaceAfter: 8 } };
    });
    s.addText(runs, { x, y, w, h, fontFace: F, valign: "top" });
  }

  function callout(s, text, x, y, w, h, color = C.NAVY, size = 16) {
    s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.LIGHT }, line: { color, width: 0 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w: 0.08, h, fill: { color } });
    s.addText(text, { x: x + 0.2, y, w: w - 0.3, h, fontFace: F, fontSize: size, color: C.INK, valign: "middle" });
  }

  function panel(s, heading, color, x, y, w, h) {
    s.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.LIGHT } });
    if (heading) s.addText(heading, { x: x + 0.2, y: y + 0.1, w: w - 0.4, h: 0.45, fontFace: F, fontSize: 16, bold: true, color });
  }

  function table(s, rows, x, y, w, colW, size = 13) {
    const data = rows.map((r, i) => r.map((c) => {
      const o = typeof c === "object" ? c : { text: String(c) };
      return { text: o.text, options: { fontFace: F, fontSize: size, bold: i === 0 || o.bold, color: i === 0 ? "FFFFFF" : (o.color || C.INK),
        fill: { color: i === 0 ? C.NAVY : (o.fill || (i % 2 ? "FFFFFF" : "F7F7F7")) }, valign: "middle", align: o.align || "center" } };
    }));
    s.addTable(data, { x, y, w, colW, border: { type: "solid", pt: 0.5, color: "D0D0D0" }, rowH: 0.42 });
  }

  function box(s, t, x, y, w, h, fill = C.NAVY, color = "FFFFFF", size = 13) {
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, rectRadius: 0.08, line: { color: fill } });
    s.addText(t, { x, y, w, h, fontFace: F, fontSize: size, color, bold: true, align: "center", valign: "middle" });
  }

  const arrow = (s, x, y, w, color = C.GREY) => s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color, width: 2, endArrowType: "triangle" } });

  // Big number + label, e.g. stat(s, "97%", "2종 이상 동시 검출", x, y)
  function stat(s, value, label, x, y, w = 4.5, color = C.RED) {
    s.addText(value, { x, y, w, h: 1.0, fontFace: F, fontSize: 54, bold: true, color });
    s.addText(label, { x, y: y + 1.0, w, h: 0.8, fontFace: F, fontSize: 15, color: C.INK, valign: "top" });
  }

  function references(items, heading = "참고문헌 (부록)", notes = "") {
    const s = base(heading, null, null);
    s.addText(items.map((t) => ({ text: t, options: { bullet: { type: "number" }, breakLine: true, paraSpaceAfter: 6 } })),
      { x: 0.5, y: 1.4, w: 12.3, h: 5.5, fontFace: F, fontSize: 12, color: C.INK, valign: "top" });
    if (notes) s.addNotes(notes);
    return s;
  }

  const save = (fileName) => pptx.writeFile({ fileName }).then((f) => { console.log("wrote", f); return f; });

  return { pptx, C, F, titleSlide, base, time, img, cap, bullets, callout, panel, table, box, arrow, stat, references, save };
}

module.exports = { createDeck, PALETTE };
