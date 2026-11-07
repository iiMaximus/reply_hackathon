import { francAll } from "franc-min";

const options = { only: ["eng", "fra", "ita", "spa", "deu"], minLength: 8 };
export function needsEnglish(text) {
  const prose = String(text ?? "")
    .replace(/\\[a-z]+|\$[^$]*\$/gi, " ")
    .trim();
  if ((prose.match(/\p{L}+/gu) || []).length < 3) return false;
  const ranking = francAll(prose, options);
  if (ranking[0]?.[0] === "eng" || ranking[0]?.[0] === "und") return false;
  const english = ranking.find(([lang]) => lang === "eng");
  return english ? ranking[0][1] - english[1] > 0.12 : false;
}
