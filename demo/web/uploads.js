// Loaded only when someone picks a file. OCR and PDF rendering run on their device.
function pageImage(canvas) {
  return canvas.toDataURL("image/jpeg", 0.78);
}
async function photo(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(
      1,
      1700 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return pageImage(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function recognize(image, onProgress) {
  onProgress("Loading text recognition");
  const { default: reader } = await import("/reader/ocr.mjs");
  const worker = await reader.createWorker(["eng", "ita"], 1, {
    workerPath: "/reader/worker.js",
    corePath: "/reader/tesseract-core-lstm.wasm.js",
    langPath: "/reader",
    logger: (event) => {
      if (event.status === "recognizing text")
        onProgress(
          "Reading text in the image",
          Math.round(event.progress * 100),
        );
    },
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}
export async function openFile(file) {
  if (file.size > 16 * 1024 * 1024) throw Error("Choose a file under 16 MB.");
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
    const pdfjs = await import("/reader/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/reader/pdf.worker.mjs";
    const loading = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loading.promise;
    return {
      name: file.name,
      pages: pdf.numPages,
      dispose: () => loading.destroy(),
      async page(n) {
        const page = await pdf.getPage(n),
          base = page.getViewport({ scale: 1 }),
          viewport = page.getViewport({
            scale: Math.min(2, 1500 / Math.max(base.width, base.height)),
          });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({
          canvas,
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise;
        const text = (await page.getTextContent()).items
          .map((i) => i.str + (i.hasEOL ? "\n" : " "))
          .join("")
          .trim();
        page.cleanup();
        return { text, image: pageImage(canvas) };
      },
    };
  }
  if (/\.(md|txt)$/i.test(file.name) || file.type === "text/plain") {
    const text = await file.text();
    return {
      name: file.name,
      pages: 1,
      page: async () => ({ text, image: null }),
    };
  }
  const image = await photo(file);
  return { name: file.name, pages: 1, page: async () => ({ text: "", image }) };
}
export function splitQuestions(text) {
  const lines = text
    .trim()
    .split(
      /\n\s*(?=(?:(?:exercise|question|problem|esercizio|domanda)\s+\d+\b|\d{1,2}[.)]\s+\S))/i,
    );
  return lines.map((s) => s.trim()).filter((s) => s.length >= 5);
}
