/**
 * Keep user HTML sanitized without stripping the styles KaTeX needs for fractions
 * and matrices. Only the math library's output bypasses the Markdown sanitizer;
 * untrusted LaTeX commands remain disabled by KaTeX's trust:false setting.
 * Dependencies are injected so the same renderer can be tested in Node.
 */
export function createMarkdownRenderer({ Marked, markedKatex, sanitize }) {
  return function markdown(value) {
    const formulas = [];
    const prefix = `MATH${crypto.randomUUID().replaceAll('-', '')}TOKEN`;
    const extension = markedKatex({
      nonStandard: true,
      throwOnError: false,
      trust: false,
      maxExpand: 1000,
      maxSize: 20,
    });

    for (const tokenizer of extension.extensions) {
      const renderMath = tokenizer.renderer;
      tokenizer.renderer = token => {
        const placeholder = `${prefix}${formulas.length}END`;
        formulas.push(renderMath(token));
        return placeholder + (tokenizer.level === 'block' ? '\n' : '');
      };
    }

    const parser = new Marked({
      gfm: true, breaks: true,
      renderer: {
        // Use static accessible text instead of enabling user-supplied form inputs.
        checkbox: ({ checked }) => `<span class="task-state" role="img" aria-label="${checked ? 'Completed' : 'Not completed'}">${checked ? '☑' : '☐'}</span> `,
      },
    }, extension);
    const cleanHtml = sanitize(parser.parse(value || ''), {
      FORBID_TAGS: ['img','style','form','input','button','iframe','video','audio'],
      FORBID_ATTR: ['style'],
    });
    return cleanHtml.replace(new RegExp(`${prefix}(\\d+)END`, 'g'), (_match, index) => formulas[Number(index)]);
  };
}
