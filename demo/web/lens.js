const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const nice = (n) => String(Number(n.toFixed(4))).replace("-", "−");
let selectedX;
let selectedRun;
function observation(probe) {
  return probe.points.find((p) => p.x === selectedX) || probe.example;
}
export function selectX(x) {
  selectedX = x;
}
const names = {
  probe: "a derivative claim",
  power: "a power-rule step",
  lost: "division by a variable",
  kept: "checking both roots",
  started: "setting up a derivative",
  unclear: "no reliable match",
};
export function agentRecord(review) {
  const seen = review.trace || [];
  const entries = [];
  if (seen.some((e) => e.action === "match_strategy") && review.strategy)
    entries.push([
      "Read the line",
      review.strategy.strategy === "unclear"
        ? "MiniLM found no clear match in the course examples."
        : "MiniLM matched this to " + names[review.strategy.strategy] + ".",
    ]);
  if (seen.some((e) => e.action === "check_slope"))
    entries.push([
      "Tested the claim",
      review.probe?.status === "match"
        ? "Compared the polynomial coefficients; they agree."
        : review.probe?.status === "mismatch"
          ? "Found a point where the proposed slope differs from the curve."
          : "No supported polynomial derivative could be verified.",
    ]);
  if (review.source)
    entries.push(["Consulted the course", review.source.title]);
  if (
    seen.some(
      (e) => e.action === "recall_practice" && e.result === "previous_hint",
    )
  )
    entries.push([
      "Used the last attempt",
      "Selected a different prompt from the previous hint.",
    ]);
  if (seen.some((e) => e.action === "record_step"))
    entries.push([
      "Updated the tutor’s view",
      review.followUp === "power"
        ? "Suggested a fresh power-rule question."
        : review.followUp === "factor"
          ? "Suggested a question that tests for a lost root."
          : "Suggested a question with different factors.",
    ]);
  if (review.handoff)
    entries.push([
      "Requested a tutor review",
      "The submission needs clarification before it can be grouped.",
    ]);
  return entries
    .map(
      ([title, detail]) =>
        `<li><strong>${esc(title)}</strong><span>${esc(detail)}</span></li>`,
    )
    .join("");
}
export function lensPanel(review) {
  const probe = review.probe;
  if (!probe?.example) return "";
  if (selectedRun !== review.runId) {
    selectedRun = review.runId;
    selectedX = probe.example.x;
  }
  const obs = observation(probe);
  return `<div class="slope-instrument">
    <div class="instrument-head"><b>Slope test</b><label>Test at x = <select id="probe-x" aria-label="Test point">${probe.points
      .concat(
        probe.points.some((p) => p.x === probe.example.x)
          ? []
          : [probe.example],
      )
      .map(
        (p) =>
          `<option value="${p.x}" ${p.x === obs.x ? "selected" : ""}>${nice(p.x)}</option>`,
      )
      .join("")}</select></label></div>
    <div class="instrument-plot"><canvas id="slope-plot" role="img" aria-label="At x = ${obs.x}, your line predicts slope ${obs.predicted}; the curve has slope ${obs.measured}."></canvas></div>
    <div class="measurements"><div><small><i class="swatch claim"></i>Your proposed slope</small><b>${nice(obs.predicted)}</b></div><div><small><i class="swatch actual"></i>The curve’s slope</small><b>${nice(obs.measured)}</b></div></div>
    ${probe.status === "mismatch" && obs.predicted === obs.measured ? `<p class="point-note">The two slopes coincide here. At x = ${probe.example.x} they differ, so this agreement is only local.</p>` : ""}</div>`;
}
export function paintProbe(review) {
  const c = document.getElementById("slope-plot");
  if (!c || !review?.probe?.example) return;
  const p = observation(review.probe),
    { width: w, height: h } = c.getBoundingClientRect();
  if (w < 10 || h < 10) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = w * dpr;
  c.height = h * dpr;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const f = (x) => review.probe.curve.reduceRight((a, b) => a * x + b, 0);
  const span = 0.68,
    ends = [p.x - span, p.x + span];
  const vals = ends
    .flatMap((x) => [
      f(x),
      p.height + (x - p.x) * p.predicted,
      p.height + (x - p.x) * p.measured,
    ])
    .concat(p.height);
  const min = Math.min(...vals) - 0.18,
    max = Math.max(...vals) + 0.18;
  const X = (x) => 24 + ((x - ends[0]) / (2 * span)) * (w - 48),
    Y = (y) => h - 22 - ((y - min) / (max - min)) * (h - 40);
  g.strokeStyle = "#e7e2d6";
  g.lineWidth = 1;
  for (let x = 24; x < w; x += 30) {
    g.beginPath();
    g.moveTo(x, 8);
    g.lineTo(x, h - 17);
    g.stroke();
  }
  for (let y = 18; y < h - 12; y += 25) {
    g.beginPath();
    g.moveTo(16, y);
    g.lineTo(w - 16, y);
    g.stroke();
  }
  function path(fn, color, dash, width) {
    g.beginPath();
    g.strokeStyle = color;
    g.setLineDash(dash);
    g.lineWidth = width;
    for (let i = 0; i <= 90; i++) {
      let x = ends[0] + (i / 90) * 2 * span;
      if (i === 0) g.moveTo(X(x), Y(fn(x)));
      else g.lineTo(X(x), Y(fn(x)));
    }
    g.stroke();
  }
  path(f, "#2e6459", [], 3);
  path((x) => p.height + (x - p.x) * p.predicted, "#bb4b2c", [6, 4], 2.5);
  g.setLineDash([]);
  g.fillStyle = "#273a31";
  g.beginPath();
  g.arc(X(p.x), Y(p.height), 4, 0, 2 * Math.PI);
  g.fill();
  g.font = "12px system-ui";
  g.textAlign = "center";
  g.fillText("x = " + nice(p.x), X(p.x), h - 4);
}
