import katex from "katex";

export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// Work on the original text, escaping prose separately. Only explicit TeX
// delimiters opt into rendering; a pair of prices such as "$5 or $10" is prose.
const delimited =
  /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<![\\$])\$\$([\s\S]*?)\$\$|(?<![\\$])\$(?![\s$])((?:\\.|[^$\\\n])*?)(?<![\s\\])\$(?![\d$])/g;
const cache = new Map();
export function mathText(value) {
  const text = String(value ?? "");
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
          katex.renderToString(tex, {
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
  const protectedText = String(value ?? "").replace(delimited, (literal) => {
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
