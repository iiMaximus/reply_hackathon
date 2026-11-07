// Ascending powers of x. This reads polynomials, never evaluates user code.
const curve = [0, 0, -1 / 2, 1 / 3];
const slope = curve.slice(1).map((c, i) => c * (i + 1));
const valueAt = (p, x) => p.reduceRight((sum, c) => sum * x + c, 0);
const round = (n) => Number(n.toFixed(5));
function multiply(a, b) {
  const out = Array(a.length + b.length - 1).fill(0);
  if (out.length > 9) throw Error();
  a.forEach((v, i) => b.forEach((w, j) => (out[i + j] += v * w)));
  return out;
}
export function polynomial(source) {
  const expr = source
    .toLowerCase()
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replaceAll("⁴", "^4")
    .replace(/[−–]/g, "-")
    .replace(/[·×]/g, "*")
    .replaceAll("**", "^")
    .replace(/\s+/g, "");
  if (!expr || expr.length > 120) return null;
  const tokens = expr.match(/(?:\d+(?:\.\d+)?|\.\d+)|[x+*/^()-]/g) || [];
  if (tokens.join("") !== expr || tokens.length > 70) return null;
  let i = 0;
  function atom() {
    let out;
    const t = tokens[i++];
    if (t === "(") {
      out = sum();
      if (tokens[i++] !== ")") throw Error();
    } else if (t === "x") out = [0, 1];
    else if (t && /^(\d|\.)/.test(t)) out = [Number(t)];
    else throw Error();
    if (tokens[i] === "^") {
      i++;
      const e = tokens[i++];
      if (!/^[0-6]$/.test(e || "")) throw Error();
      const base = out;
      out = [1];
      for (let k = 0; k < Number(e); k++) out = multiply(out, base);
    }
    return out;
  }
  function signed() {
    const t = tokens[i];
    if (t === "-" || t === "+") {
      i++;
      return signed().map((v) => (t === "-" ? -v : v));
    }
    return atom();
  }
  function term() {
    let a = signed();
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === "*" || t === "/") {
        i++;
        const b = signed();
        if (t === "/") {
          if (b.length !== 1 || b[0] === 0) throw Error();
          a = a.map((c) => c / b[0]);
        } else a = multiply(a, b);
      } else if (t === "x" || t === "(") a = multiply(a, signed());
      else break;
    }
    return a;
  }
  function sum() {
    let a = term();
    while (tokens[i] === "+" || tokens[i] === "-") {
      const sign = tokens[i++] === "+" ? 1 : -1;
      const b = term();
      a = Array.from(
        { length: Math.max(a.length, b.length) },
        (_, j) => (a[j] || 0) + sign * (b[j] || 0),
      );
    }
    return a;
  }
  try {
    const p = sum();
    return i === tokens.length &&
      p.every((c) => Number.isFinite(c) && Math.abs(c) < 1e7)
      ? p
      : null;
  } catch {
    return null;
  }
}
export function derivativeLine(text = "") {
  const prefix =
    /(?:^|[\s:])(?:f\s*['’′]\s*(?:\(\s*x\s*\))?|dy\s*\/\s*dx|derivativ[ea])\s*=\s*/i;
  for (const line of text.split(/[\n;→]/).reverse()) {
    const match = prefix.exec(line);
    if (!match) continue;
    const rhs = line
      .slice(match.index + match[0].length)
      .split(/[,=]|\.(?=\s|$)/)[0]
      .trim();
    return { line: line.trim().slice(0, 300), rhs };
  }
  return null;
}
export function probeDerivative(text) {
  const claim = derivativeLine(text);
  if (!claim) return null;
  const poly = polynomial(claim.rhs);
  if (!poly) return { status: "unsupported", line: claim.line };
  const matches = Array.from(
    { length: Math.max(poly.length, slope.length) },
    (_, i) => Math.abs((poly[i] || 0) - (slope[i] || 0)) < 1e-9,
  ).every(Boolean);
  const samples = [2, -1, 3, -2, 4, -3, 5, -4, 6].map((x) => ({
    x,
    predicted: round(valueAt(poly, x)),
    measured: round(valueAt(slope, x)),
    height: round(valueAt(curve, x)),
  }));
  const first = matches
    ? samples[0]
    : samples.find((s) => Math.abs(s.predicted - s.measured) > 1e-5);
  if (!first) return { status: "unsupported", line: claim.line };
  return {
    status: matches ? "match" : "mismatch",
    line: claim.line,
    rhs: claim.rhs,
    curve,
    example: first,
    points: samples.filter((s) => Math.abs(s.x) <= 3),
    cubicTermMatches: Math.abs((poly[2] || 0) - 1) < 1e-9,
  };
}
