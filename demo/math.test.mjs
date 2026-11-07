import test from "node:test";
import assert from "node:assert/strict";
import MarkdownIt from "markdown-it";
import { classroomMarkdown, mathText } from "./web/math.js";

test("the imported bare limit renders as one operator with the entire polynomial on every view", () => {
  globalThis.window = { markdownit: MarkdownIt };
  const prompt = "Evaluate lim_{x→2} (8 − 3x + 12x²), if it exists.";
  for (const render of [mathText, classroomMarkdown]) {
    const html = render(prompt);
    assert.match(html, /<mi>lim<\/mi>/);
    assert.match(html, /12x\^\{2\}/);
    assert.equal(html.match(/<math /g).length, 1);
    assert.ok(html.includes(", if it exists."));
    assert.equal(
      render(String.raw`Use $\lim_{x\to 2}x$ and \(\frac{1}{2}\).`).match(
        /<math /g,
      ).length,
      2,
    );
    assert.ok(!render("Pay $5 or $10.").includes("<math "));
  }
});
