import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Brain, Check, Headphones, Play, RotateCcw, Trophy, X } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SURAHS, audioUrl, type QuizQ, type Surah } from "@/data/quran";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/quiz")({
  head: () => ({
    meta: [
      { title: "Quiz & jeux du Juz 'Amma — Hifz" },
      {
        name: "description",
        content:
          "Teste ta mémorisation : quiz audio Warsh, verset caché et questions de compréhension sur le Juz 'Amma.",
      },
      { property: "og:title", content: "Quiz & jeux du Juz 'Amma" },
      {
        property: "og:description",
        content: "Quiz audio, verset caché et compréhension pour ancrer ta mémorisation.",
      },
    ],
  }),
  component: QuizPage,
});

type Q = { kind: "audio" | "verset" | "sens"; prompt: string; arabic?: string; surah: number; opts: string[]; rep: number; exp: string };

const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

function buildAudio(): Q {
  const s = pick(SURAHS);
  const wrong = shuffle(SURAHS.filter((x) => x.num !== s.num)).slice(0, 3);
  const opts = shuffle([s, ...wrong]);
  return {
    kind: "audio",
    prompt: "Quelle sourate entends-tu ?",
    surah: s.num,
    opts: opts.map((o) => o.fr),
    rep: opts.findIndex((o) => o.num === s.num),
    exp: `C'était ${s.fr} (${s.fr2}) — ${s.versets} versets.`,
  };
}

function buildVerset(): Q {
  const s = pick(SURAHS.filter((x) => x.verses.length > 1));
  const v = pick(s.verses);
  const others = shuffle(SURAHS.flatMap((x) => x.verses).filter((o) => o.tr !== v.tr)).slice(0, 3);
  const opts = shuffle([v, ...others]);
  return {
    kind: "verset",
    prompt: "Que signifie ce verset ?",
    arabic: v.ar,
    surah: s.num,
    opts: opts.map((o) => o.tr),
    rep: opts.findIndex((o) => o.tr === v.tr),
    exp: `${s.fr}, verset ${v.n}.`,
  };
}

function buildSens(pool: { s: Surah; q: QuizQ }[]): Q | null {
  if (!pool.length) return null;
  const { s, q } = pick(pool);
  return {
    kind: "sens",
    prompt: q.q,
    surah: s.num,
    opts: q.opts,
    rep: q.rep,
    exp: q.exp,
  };
}

function QuizPage() {
  const { addXp, setSurah, stat } = useProgress();
  const [mode, setMode] = useState<"menu" | "audio" | "mix">("menu");
  const [qs, setQs] = useState<Q[]>([]);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const pool = useMemo(
    () => SURAHS.flatMap((s) => (s.quiz ?? []).map((q) => ({ s, q }))),
    [],
  );

  const start = useCallback(
    (m: "audio" | "mix") => {
      const list: Q[] = [];
      for (let k = 0; k < 8; k++) {
        if (m === "audio") list.push(buildAudio());
        else {
          const r = Math.random();
          const q = r < 0.34 ? buildAudio() : r < 0.67 ? buildVerset() : buildSens(pool);
          list.push(q ?? buildVerset());
        }
      }
      setQs(list);
      setI(0);
      setScore(0);
      setChosen(null);
      setMode(m);
    },
    [pool],
  );

  const q = qs[i];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    if (q?.kind === "audio") {
      a.src = audioUrl("qari", q.surah);
      a.currentTime = 0;
    }
  }, [q]);

  useEffect(() => {
    const a = audioRef.current;
    return () => a?.pause();
  }, []);

  const answer = (k: number) => {
    if (chosen !== null || !q) return;
    setChosen(k);
    audioRef.current?.pause();
    if (k === q.rep) {
      setScore((s) => s + 1);
      addXp(10, 1);
    }
  };

  const next = () => {
    if (i + 1 < qs.length) {
      setI(i + 1);
      setChosen(null);
      return;
    }
    const pct = Math.round((score / qs.length) * 100);
    const s = qs[0]!.surah;
    const cur = stat(s);
    if (pct > cur.bestQuiz)
      setSurah(s, { bestQuiz: pct, stars: pct === 100 ? Math.max(cur.stars, 3) : cur.stars });
    setI(qs.length);
  };

  if (mode === "menu")
    return (
      <Shell title="Quiz & jeux" subtitle="Ancre ta mémorisation en jouant">
        <button onClick={() => start("mix")} className="surface enter flex w-full items-center gap-3 p-4 text-left">
          <span className="bg-primary-soft flex h-12 w-12 items-center justify-center rounded-2xl">
            <Brain size={22} className="text-primary" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">Défi mixte</span>
            <span className="text-muted-foreground block text-[11px] font-semibold">
              8 questions : audio, sens des versets, compréhension
            </span>
          </span>
        </button>
        <button onClick={() => start("audio")} className="surface enter mt-3 flex w-full items-center gap-3 p-4 text-left">
          <span className="bg-accent-soft flex h-12 w-12 items-center justify-center rounded-2xl">
            <Headphones size={22} className="text-accent-foreground" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-extrabold">Blind test Warsh</span>
            <span className="text-muted-foreground block text-[11px] font-semibold">
              Reconnais la sourate à l&apos;oreille
            </span>
          </span>
        </button>
        <p className="text-muted-foreground mt-6 text-center text-[11px] font-semibold">
          +10 points par bonne réponse · les séries comptent 🔥
        </p>
      </Shell>
    );

  if (i >= qs.length) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <Shell title="Résultat" subtitle="Bien joué !">
        <div className="surface enter flex flex-col items-center p-8 text-center">
          <div className="grad-gold shadow-gold flex h-20 w-20 items-center justify-center rounded-full">
            <Trophy size={34} className="text-primary" />
          </div>
          <p className="mt-4 text-4xl font-black">{pct}%</p>
          <p className="text-muted-foreground text-sm font-bold">
            {score} / {qs.length} bonnes réponses · +{score * 10} points
          </p>
          <p className="mt-3 text-sm font-semibold">
            {pct === 100
              ? "Parfait ! Mâ shâ' Allah 👑"
              : pct >= 60
                ? "Solide — encore un tour pour viser le sans-faute."
                : "Réécoute les sourates puis retente 💪"}
          </p>
          <button
            onClick={() => start(mode === "audio" ? "audio" : "mix")}
            className="grad-emerald text-primary-foreground mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black"
          >
            <RotateCcw size={16} /> Rejouer
          </button>
          <button onClick={() => setMode("menu")} className="text-muted-foreground mt-3 text-xs font-bold">
            Retour au menu
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={`Question ${i + 1}/${qs.length}`} subtitle={`Score : ${score}`}>
      <audio ref={audioRef} preload="none" />
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div className="bg-primary h-full transition-all" style={{ width: `${(i / qs.length) * 100}%` }} />
      </div>

      <div className="surface enter mt-4 p-5">
        <p className="text-base leading-snug font-extrabold">{q!.prompt}</p>
        {q!.kind === "audio" && (
          <button
            onClick={() => void audioRef.current?.play()}
            className="bg-primary-soft text-primary mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black"
          >
            <Play size={18} fill="currentColor" /> Écouter l&apos;extrait
          </button>
        )}
        {q!.arabic && (
          <p
            dir="rtl"
            className="arabic mt-4 text-2xl"
            dangerouslySetInnerHTML={{ __html: q!.arabic }}
          />
        )}
      </div>

      <div className="mt-3 space-y-2">
        {q!.opts.map((o, k) => {
          const good = chosen !== null && k === q!.rep;
          const bad = chosen === k && k !== q!.rep;
          return (
            <button
              key={k}
              onClick={() => answer(k)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left text-sm font-bold transition-colors ${
                good
                  ? "border-primary bg-primary-soft text-primary"
                  : bad
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "bg-card"
              }`}
            >
              <span className="flex-1">{o}</span>
              {good && <Check size={16} strokeWidth={3} />}
              {bad && <X size={16} strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <div className="surface enter mt-3 p-4">
          <p className="text-xs leading-relaxed font-semibold">💡 {q!.exp}</p>
          <button
            onClick={next}
            className="grad-emerald text-primary-foreground mt-3 w-full rounded-2xl py-3 text-sm font-black"
          >
            {i + 1 < qs.length ? "Question suivante" : "Voir mon résultat"}
          </button>
        </div>
      )}
    </Shell>
  );
}
