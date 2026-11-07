import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
export const directory = new URL("../../.model-cache/", import.meta.url);
const base =
  "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/751bff37182d3f1213fa05d7196b954e230abad9/";
const files = [
  [
    "model.onnx",
    "onnx/model_quantized.onnx",
    "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1",
  ],
  ["tokenizer.json", "tokenizer.json"],
  ["tokenizer_config.json", "tokenizer_config.json"],
];
const digest = (b) => createHash("sha256").update(b).digest("hex");
async function prepare() {
  await mkdir(directory, { recursive: true });
  for (const [name, path, sha] of files) {
    const target = new URL(name, directory);
    try {
      const bytes = await readFile(target);
      if (sha ? digest(bytes) === sha : JSON.parse(bytes)) continue;
    } catch {}
    const response = await fetch(base + path, {
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok)
      throw Error(
        "Model download failed: " + name + " (" + response.status + ")",
      );
    const bytes = Buffer.from(await response.arrayBuffer());
    if (sha && digest(bytes) !== sha) throw Error("Model checksum mismatch");
    if (!sha) JSON.parse(bytes);
    const temp = fileURLToPath(target) + "." + process.pid + ".tmp";
    await writeFile(temp, bytes);
    await rename(temp, target);
    console.log("Prepared " + name + " (" + bytes.length + " bytes)");
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await prepare();
