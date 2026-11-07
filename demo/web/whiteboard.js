// Adapted from Theuntextured's pointer-driven whiteboard on ricks-version.
// Keep strokes outside the classroom DOM so a live room refresh cannot erase them.
export function createWhiteboard(changed) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 720;
  canvas.setAttribute("aria-label", "Whiteboard for your handwritten response");
  const ctx = canvas.getContext("2d");
  let strokes = [],
    pointer = null;
  function paint() {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = ctx.fillStyle = "#23283b";
    ctx.lineWidth = 4;
    ctx.lineCap = ctx.lineJoin = "round";
    for (const stroke of strokes) {
      const [first, ...rest] = stroke;
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (const point of rest) ctx.lineTo(point.x, point.y);
      if (!rest.length) ctx.lineTo(first.x + 0.1, first.y + 0.1);
      ctx.stroke();
    }
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }
  canvas.onpointerdown = (event) => {
    if (pointer !== null || event.button !== 0) return;
    event.preventDefault();
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    strokes.push([point(event)]);
    paint();
    changed();
  };
  canvas.onpointermove = (event) => {
    if (pointer !== event.pointerId) return;
    const stroke = strokes.at(-1);
    const previous = stroke.at(-1);
    const next = point(event);
    stroke.push(next);
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  };
  canvas.onpointerup =
    canvas.onpointercancel =
    canvas.onlostpointercapture =
      (event) => {
        if (pointer === event.pointerId) pointer = null;
      };
  paint();
  return {
    canvas,
    get hasInk() {
      return strokes.length > 0;
    },
    get drawing() {
      return pointer !== null;
    },
    clear() {
      pointer = null;
      strokes = [];
      paint();
      changed();
    },
    undo() {
      strokes.pop();
      paint();
      changed();
    },
    jpeg() {
      return canvas.toDataURL("image/jpeg", 0.88);
    },
  };
}
