import katex from "katex";

export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// Protect explicitly delimited math before recognizing undelimited notation.
const delimited =
  /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<![\\$])\$\$([\s\S]*?)\$\$|(?<![\\$])\$(?![\s$])((?:\\.|[^$\\\n])*?)(?<![\s\\])\$(?![\d$])/g;
// Start only at distinctive mathematical notation. The token reader stops at
// prose, preserving punctuation after the formula and ordinary prices.
const bareStart =
  /\\(?:lim|frac|dfrac|tfrac|sqrt|int|sum|prod|displaystyle)(?![A-Za-z])|\blim(?=\s*_)/g;
const mathToken =
  /[ \t]*(?:\\[A-Za-z]+|\\[,;! ]|\d+(?:\.\d+)?|[A-Za-z](?![A-Za-z])|[()[\]{}_^+*/=−–→∞×÷²³⁰¹⁴⁵⁶⁷⁸⁹-])/y;
function markBareMath(prose) {
  let out = "",
    end = 0;
  for (const start of prose.matchAll(bareStart)) {
    if (start.index < end) continue;
    let pos = start.index + start[0].length;
    let depth = 0;
    while (pos < prose.length) {
      mathToken.lastIndex = pos;
      const match = mathToken.exec(prose);
      if (!match) break;
      const token = match[0].trim();
      if (["(", "[", "{"].includes(token)) depth++;
      if ([")", "]", "}"].includes(token) && --depth < 0) break;
      pos = mathToken.lastIndex;
    }
    const formula = prose
      .slice(start.index, pos)
      .replace(/^lim(?=\s*_)/, "\\lim")
      .replace(/^\\lim(?=\s*_)/, "\\displaystyle \\lim");
    out += prose.slice(end, start.index) + "\\(" + formula + "\\)";
    end = pos;
  }
  return out + prose.slice(end);
}
function normalizedMath(value) {
  const text = String(value ?? "");
  let out = "",
    end = 0;
  for (const part of text.matchAll(delimited)) {
    out += markBareMath(text.slice(end, part.index)) + part[0];
    end = part.index + part[0].length;
  }
  return out + markBareMath(text.slice(end));
}
function normalizeTex(tex) {
  return tex
    .replace(/→/g, "\\to ")
    .replace(/[−–]/g, "-")
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
      (group) =>
        "^{" + [...group].map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(c)).join("") + "}",
    );
}
const cache = new Map();
export function mathText(value) {
  const text = normalizedMath(value);
  let html = "",
    end = 0;
  for (const token of text.matchAll(delimited)) {
    html += escapeHTML(text.slice(end, token.index));
    const literal = token[0];
    let rendered = cache.get(literal);
    if (rendered === undefined) {
      const block = token[1] !== undefined || token[3] !== undefined;
      const tex = token[1] ?? token[2] ?? token[3] ?? token[4];
      try {
        rendered =
          '<span class="math-' +
          (block ? "block" : "inline") +
          '">' +
          katex.renderToString(normalizeTex(tex), {
            displayMode: block,
            output: "htmlAndMathml",
            trust: false,
            throwOnError: true,
            strict: "ignore",
            maxExpand: 300,
            maxSize: 12,
          }) +
          "</span>";
      } catch {
        rendered = escapeHTML(literal);
      }
      if (cache.size >= 120) cache.delete(cache.keys().next().value);
      cache.set(literal, rendered);
    }
    html += rendered;
    end = token.index + literal.length;
  }
  return html + escapeHTML(text.slice(end));
}

// Keep TeX out of Markdown's emphasis and escaping rules.
export function classroomMarkdown(value) {
  const md = window
    .markdownit({ html: false, breaks: true, linkify: false })
    .disable(["image", "link"]);
  const slots = [];
  let prefix = "SHOWWORKMATHX";
  while (String(value).includes(prefix)) prefix += "X";
  const protectedText = normalizedMath(value).replace(delimited, (literal) => {
    slots.push(mathText(literal));
    return prefix + slots.length + "Z";
  });
  return md
    .render(protectedText)
    .replace(
      new RegExp(prefix + "(\\d+)Z", "g"),
      (_, i) => slots[Number(i) - 1],
    );
}
