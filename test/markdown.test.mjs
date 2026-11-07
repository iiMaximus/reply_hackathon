import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { createMarkdownRenderer } from '../public/markdown.mjs';

const window = new JSDOM('').window;
const purifier = createDOMPurify(window);
const markdown = createMarkdownRenderer({ Marked, markedKatex, sanitize: (html, options) => purifier.sanitize(html, options) });
const documentFor = text => new JSDOM(markdown(text)).window.document;

test('inline and display math render without Markdown consuming TeX syntax', () => {
  const document = documentFor(String.raw`Inline: $x_1^2 + \sqrt{y}$ and($a+b$).

$$
\delta = \frac{FL^3}{3EI}
$$

Same-line display: $$\frac{a}{b}$$`);
  assert.equal(document.querySelectorAll('.katex').length, 4);
  assert.equal(document.querySelectorAll('.katex-display').length, 2);
  assert.ok(document.querySelector('math mfrac'), 'Accessible MathML fraction is retained.');
  assert.ok(document.querySelector('.katex-html [style]'), 'KaTeX layout styles survive sanitization.');
  assert.ok(!document.querySelector('em'), 'TeX subscripts must not turn into Markdown emphasis.');
});

test('code fences, inline code and escaped dollars remain literal; GFM still works', () => {
  const document = documentFor('`$x^2$`\n\n```latex\n$$x^2$$\n```\n\n\\$20\n\n| Formula |\n| --- |\n| $x^2$ |');
  assert.equal(document.querySelector('p code').textContent, '$x^2$');
  assert.equal(document.querySelector('pre code').textContent.trim(), '$$x^2$$');
  assert.equal(document.querySelectorAll('.katex').length, 1);
  assert.ok(document.querySelector('td .katex'));
  assert.match(document.body.textContent, /\$20/);
});

test('malformed TeX does not crash the page, and neither Markdown nor TeX can inject scripts', () => {
  const document = documentFor(String.raw`<img src=x onerror="alert(1)"><script>alert(1)</script>
<span style="position:fixed" onclick="alert(1)">Text</span>

$\notARealCommand{x}$

$\frac{1}{$

$\href{javascript:alert(1)}{click}$

$\htmlClass{untrusted}{x}$`);
  assert.equal(document.querySelectorAll('script,img,iframe,[onclick],[onerror]').length, 0);
  assert.equal(document.querySelectorAll('a[href^="javascript:"],.untrusted').length, 0);
  assert.ok(document.querySelector('.katex-error'), 'Invalid TeX is displayed as a readable error.');
  assert.equal(document.querySelector('span').getAttribute('style'), null, 'User-authored styles are still stripped.');
});
