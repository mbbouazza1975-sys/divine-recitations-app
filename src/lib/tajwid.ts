/** Enveloppe chaque mot arabe dans un <span class="qw"> sans casser les balises tajwîd. */
export function wrapWords(html: string): string {
  return html.replace(/(?:<[^>]+>|[^\s<]+)+/g, (m) => `<span class="qw">${m}</span>`);
}

const HARAKAT = "\u064B-\u0652\u0670\u0653\u0654\u0655\u06DF-\u06ED";
const isMark = (c: string) => new RegExp(`[${HARAKAT}]`).test(c);

const QALQALA = "قطبجد";
const TAFKHIM = "خصضطظغق";
const SUKUN = "\u0652";
const SHADDA = "\u0651";
const MADD_MARK = "\u0653"; // maddah
const TANWIN = "\u064B\u064C\u064D";
const FATHA = "\u064E";
const DAMMA = "\u064F";
const KASRA = "\u0650";

type Cls = "madd" | "ghunna" | "qalqala" | "tafkhim" | null;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Découpe un mot arabe en lettres (lettre + ses signes) puis colore selon les règles Warsh. */
function colorWord(word: string): string {
  // groupes : une lettre de base suivie de ses diacritiques
  const groups: string[] = [];
  for (const ch of word) {
    if (isMark(ch) && groups.length) groups[groups.length - 1] += ch;
    else groups.push(ch);
  }

  const cls: Cls[] = groups.map(() => null);

  groups.forEach((g, i) => {
    const base = g[0]!;
    const marks = g.slice(1);
    const prev = groups[i - 1] ?? "";
    const prevMarks = prev.slice(1);
    const last = i === groups.length - 1;

    // Tafkhim : lettres emphatiques + râ' ouvert
    if (TAFKHIM.includes(base)) cls[i] = "tafkhim";
    if (base === "ر" && !marks.includes(KASRA)) cls[i] = "tafkhim";

    // Qalqala : lettre de qalqala avec sukûn ou en fin de mot
    if (QALQALA.includes(base) && (marks.includes(SUKUN) || (last && !marks))) cls[i] = "qalqala";

    // Ghunna : mîm ou nûn avec shadda, tanwîn, nûn/mîm sâkinah
    if ((base === "ن" || base === "م") && (marks.includes(SHADDA) || marks.includes(SUKUN)))
      cls[i] = "ghunna";
    if ([...TANWIN].some((t) => marks.includes(t))) cls[i] = "ghunna";

    // Madd : alif maddah, signe maddah, ou lettre de prolongation
    if (base === "آ" || marks.includes(MADD_MARK)) cls[i] = "madd";
    if (base === "ا" && !marks && prevMarks.includes(FATHA)) cls[i] = "madd";
    if (base === "و" && !marks && prevMarks.includes(DAMMA)) cls[i] = "madd";
    if (base === "ى" && !marks && prevMarks.includes(KASRA)) cls[i] = "madd";
    if (base === "ي" && !marks && prevMarks.includes(KASRA)) cls[i] = "madd";
    if (base === "\u0670") cls[i] = "madd";
  });

  let out = "";
  let i = 0;
  while (i < groups.length) {
    const c = cls[i];
    let j = i;
    while (j < groups.length && cls[j] === c) j++;
    const chunk = esc(groups.slice(i, j).join(""));
    out += c ? `<span class="w-${c}">${chunk}</span>` : chunk;
    i = j;
  }
  return out;
}

/** Texte arabe brut -> HTML avec un <span class="w-word qw"> par mot et couleurs tajwîd Warsh. */
export function tajwidHtml(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => `<span class="w-word qw">${colorWord(w)}</span>`)
    .join(" ");
}
