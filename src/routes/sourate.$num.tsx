import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  MoveVertical,
  Pause,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import {
  AYAH_RECITERS,
  REPEATS,
  SPEEDS,
  ayahUrl,
  getAyahReciter,
  getSurah,
  type Verse,
} from "@/data/quran";
import { getModerne } from "@/data/moderne";
import { getContexte } from "@/data/contexte";
import { useProgress } from "@/lib/progress";
import { tajwidHtml } from "@/lib/tajwid";
import { downloadSurah, isOffline, removeSurah } from "@/lib/offline";

export const Route = createFileRoute("/sourate/$num")({
  head: ({ params }) => {
    const s = getSurah(Number(params.num));
    const title = s ? `${s.fr} (${s.fr2}) — Hifz` : "Sourate — Hifz";
    const desc = s
      ? `${s.fr} : ${s.versets} versets en Warsh, tajwîd coloré, traduction française, tafsir et audio.`
      : "Sourate du Juz 'Amma en Warsh.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  loader: ({ params }): { num: number } => {
    const s = getSurah(Number(params.num));
    if (!s) throw notFound();
    return { num: s.num };
  },
  component: SurahPage,
});

type Mode = "lecture" | "memo" | "test";

/** Scroll de la fenêtre vers le verset, sans scrollIntoView. */
function scrollToVerse(n: number) {
  const card = document.getElementById(`vc${n}`);
  if (!card) return;
  const r = card.getBoundingClientRect();
  if (r.top >= 90 && r.bottom <= window.innerHeight - 190) return;
  window.scrollTo({ top: window.scrollY + r.top - 100, behavior: "smooth" });
}

function SurahPage() {
  const params = Route.useParams();
  const num = Number(params.num);
  const surah = getSurah(num)!;
  const moderne = getModerne(num);
  const ctx = getContexte(num);
  const { state, stat, setSurah, setReciter, addXp } = useProgress();
  const st = stat(num);

  const [mode, setMode] = useState<Mode>("lecture");
  const [tajwid, setTajwid] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [pickReciter, setPickReciter] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [reps, setReps] = useState<number>(1);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [known, setKnown] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repLeft = useRef(1);
  const counted = useRef(false);

  const reciterId = AYAH_RECITERS.some((r) => r.id === state.reciter)
    ? state.reciter
    : AYAH_RECITERS[0]!.id;
  const reciter = getAyahReciter(reciterId);

  useEffect(() => setSaved(isOffline(state.reciter, num)), [state.reciter, num]);

  useEffect(() => {
    const a = audioRef.current;
    return () => {
      if (hlRef.current) clearInterval(hlRef.current);
      a?.pause();
    };
  }, []);

  /** Surlignement mot par mot : démarré 250 ms après le rendu du verset. */
  const startHighlight = useCallback((n: number) => {
    if (hlRef.current) clearInterval(hlRef.current);
    setTimeout(() => {
      const card = document.getElementById(`vc${n}`);
      if (!card) return;
      const words = Array.from(card.querySelectorAll<HTMLElement>(".w-word"));
      if (!words.length) return;
      let last = -1;
      hlRef.current = setInterval(() => {
        const a = audioRef.current;
        if (!a || a.paused || a.ended) {
          if (hlRef.current) clearInterval(hlRef.current);
          words.forEach((w) => w.classList.remove("hl"));
          return;
        }
        const wi = Math.min(
          Math.floor((a.currentTime / (a.duration || 1)) * words.length),
          words.length - 1,
        );
        if (wi !== last) {
          words.forEach((w) => w.classList.remove("hl"));
          words[wi]?.classList.add("hl");
          last = wi;
        }
      }, 80);
    }, 250);
  }, []);

  const playVerse = useCallback(
    async (n: number, keepReps = false) => {
      const a = audioRef.current;
      if (!a) return;
      if (!keepReps) repLeft.current = reps;
      setBusy(true);
      try {
        a.src = ayahUrl(reciterId, num, n);
        a.playbackRate = rate;
        setCurrent(n);
        await a.play();
        setPlaying(true);
        startHighlight(n);
        if (autoScroll) setTimeout(() => scrollToVerse(n), 200);
        if (!counted.current) {
          counted.current = true;
          setSurah(num, { listens: st.listens + 1 });
          addXp(5, 0);
        }
      } catch {
        setPlaying(false);
        toast.error("Lecture impossible. Vérifie ta connexion.");
      } finally {
        setBusy(false);
      }
    },
    [reciterId, num, rate, reps, autoScroll, startHighlight, setSurah, st.listens, addXp],
  );

  const onEnded = () => {
    repLeft.current -= 1;
    if (repLeft.current > 0 && current != null) {
      void playVerse(current, true);
      return;
    }
    const idx = surah.verses.findIndex((v) => v.n === current);
    const next = surah.verses[idx + 1];
    if (next) {
      void playVerse(next.n);
    } else {
      setPlaying(false);
      setCurrent(null);
      setPct(0);
    }
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    if (current != null && a.src) {
      void a.play().then(() => {
        setPlaying(true);
        startHighlight(current);
      });
      return;
    }
    void playVerse(surah.verses[0]!.n);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const download = async () => {
    setBusy(true);
    try {
      if (saved) {
        await removeSurah(state.reciter, num);
        setSaved(false);
        toast("Audio retiré du hors ligne");
      } else {
        await downloadSurah(state.reciter, num);
        setSaved(true);
        toast.success("Disponible hors ligne 🎧");
      }
    } catch {
      toast.error("Téléchargement impossible");
    } finally {
      setBusy(false);
    }
  };

  const toggleKnown = (n: number) => {
    setKnown((k) => {
      const has = k.includes(n);
      const next = has ? k.filter((x) => x !== n) : [...k, n];
      if (!has) addXp(3, 1);
      return next;
    });
  };

  const finish = () => {
    if (st.memorized) {
      setSurah(num, { memorized: false });
      return;
    }
    setSurah(num, { memorized: true, stars: Math.max(st.stars, 2) });
    addXp(50, surah.versets);
    toast.success(`${surah.fr} marquée mémorisée · +50 pts 🌟`);
  };

  return (
    <Shell
      title={surah.fr}
      subtitle={`${surah.fr2} · ${surah.versets} versets`}
      back="/lecture"
      right={
        <span className="arabic text-primary-foreground shrink-0 text-xl leading-none">
          {surah.ar}
        </span>
      }
    >
      <audio
        ref={audioRef}
        preload="none"
        onEnded={onEnded}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setPct(a.duration ? (a.currentTime / a.duration) * 100 : 0);
        }}
      />

      <section className="surface enter p-4">
        <p className="text-sm leading-relaxed font-semibold">{surah.intro}</p>
        <p className="bg-accent-soft mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold">
          💡 {surah.valeur}
        </p>
      </section>

      {ctx && (
        <section className="surface enter mt-3 p-4">
          <h2 className="mb-2 text-xs font-black">🏺 Contexte historique</h2>
          <p className="bg-secondary mb-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-black">
            {ctx.periode}
          </p>
          <p className="text-sm leading-relaxed font-semibold">{ctx.circonstances}</p>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed font-semibold">
            {ctx.lien}
          </p>
          <p className="bg-primary-soft mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold">
            🎓 {ctx.nak}
          </p>
        </section>
      )}

      {moderne && (
        <section className="surface enter mt-3 p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-black">
            <Sparkles size={14} className="text-primary" /> En clair
          </h2>
          <p className="text-sm leading-relaxed font-semibold">{moderne.simple}</p>
          <h3 className="text-muted-foreground mt-3 mb-1 text-[11px] font-black tracking-wider uppercase">
            Et aujourd&apos;hui ?
          </h3>
          <p className="bg-accent-soft rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold">
            {moderne.aujourdhui}
          </p>
        </section>
      )}

      {/* Légende tajwîd */}
      <div className="surface mt-3 flex flex-wrap gap-2 p-3">
        {(
          [
            ["w-madd", "Madd · son long"],
            ["w-ghunna", "Ghunna · nasal"],
            ["w-qalqala", "Qalqala · rebond"],
            ["w-tafkhim", "Tafkhîm · emphatique"],
          ] as const
        ).map(([c, label]) => (
          <span key={c} className={`bg-secondary rounded-full px-2.5 py-1 text-[10px] font-black`}>
            <span className={c}>●</span> {label}
          </span>
        ))}
      </div>

      {/* Modes */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["lecture", "Lecture", BookOpen],
            ["memo", "Mémo", Eye],
            ["test", "Test", EyeOff],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
              mode === id ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        <button
          onClick={() => setTajwid((v) => !v)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${
            tajwid ? "bg-accent-soft text-accent-foreground" : "bg-secondary"
          }`}
        >
          Tajwîd
        </button>
        <button
          onClick={() => setAutoScroll((v) => !v)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
            autoScroll ? "bg-primary-soft text-primary" : "bg-secondary"
          }`}
        >
          <MoveVertical size={13} /> Auto-scroll
        </button>
        <button
          onClick={download}
          className={`shrink-0 rounded-full p-2 ${saved ? "bg-primary-soft text-primary" : "bg-secondary"}`}
          aria-label="Hors ligne"
        >
          {saved ? <Trash2 size={14} /> : <Download size={14} />}
        </button>
      </div>

      <div className={`mt-4 space-y-3 ${tajwid ? "" : "no-tajwid"}`}>
        {surah.verses.map((v) => (
          <VerseCard
            key={v.n}
            v={v}
            mode={mode}
            active={current === v.n}
            known={known.includes(v.n)}
            onPlay={() => void playVerse(v.n)}
            onKnown={() => toggleKnown(v.n)}
          />
        ))}
      </div>

      <div className="surface mt-5 p-4">
        <p className="text-xs leading-relaxed font-semibold">🕋 {surah.hadith}</p>
      </div>

      <button
        onClick={finish}
        className={`mt-4 mb-24 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black ${
          st.memorized
            ? "bg-primary-soft text-primary"
            : "grad-emerald text-primary-foreground shadow-lift"
        }`}
      >
        <Check size={17} strokeWidth={3} />
        {st.memorized ? "Mémorisée ✓ (annuler)" : "J'ai mémorisé cette sourate"}
      </button>

      {/* Player fixe, hors du flux de scroll */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+62px)] z-40 flex justify-center px-3">
        <div className="surface pointer-events-auto w-full max-w-[494px] p-2.5 shadow-lift">
          {pickReciter && (
            <div className="mb-2 grid gap-1.5">
              {AYAH_RECITERS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setReciter(r.id);
                    setPickReciter(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left ${
                    reciterId === r.id ? "bg-primary-soft text-primary" : "bg-secondary"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-extrabold">{r.name}</span>
                    <span className="text-muted-foreground block truncate text-[10px] font-semibold">
                      {r.detail}
                    </span>
                  </span>
                  {reciterId === r.id && <span className="text-xs font-black">✓</span>}
                </button>
              ))}
            </div>
          )}

          <div className="bg-secondary mb-2 h-1 overflow-hidden rounded-full">
            <div className="bg-accent h-full transition-[width]" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              aria-label={playing ? "Pause" : "Écouter"}
            >
              {busy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : playing ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
            </button>
            <button onClick={() => setPickReciter((v) => !v)} className="min-w-0 flex-1 text-left">
              <p className="flex items-center gap-1 truncate text-[11px] font-black">
                {reciter.emoji} {reciter.name}
                <ChevronDown size={12} className={pickReciter ? "rotate-180" : ""} />
              </p>
              <p className="text-muted-foreground truncate text-[10px] font-semibold">
                {current ? `Verset ${current}` : reciter.detail}
              </p>
            </button>
            <button
              onClick={() =>
                setRate(SPEEDS[((SPEEDS as readonly number[]).indexOf(rate) + 1) % SPEEDS.length]!)
              }
              className="bg-secondary shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-black"
              aria-label="Vitesse"
            >
              ×{rate}
            </button>
            <button
              onClick={() =>
                setReps(REPEATS[((REPEATS as readonly number[]).indexOf(reps) + 1) % REPEATS.length]!)
              }
              className={`shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-black ${
                reps > 1 ? "bg-accent-soft text-accent-foreground" : "bg-secondary"
              }`}
              aria-label="Répétitions"
            >
              ↻{reps}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

type Tab = "sens" | "tafsir" | "dico";

function VerseCard({
  v,
  mode,
  active,
  known,
  onPlay,
  onKnown,
}: {
  v: Verse;
  mode: Mode;
  active: boolean;
  known: boolean;
  onPlay: () => void;
  onKnown: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [tab, setTab] = useState<Tab | null>(null);
  const html = useMemo(() => tajwidHtml(v.ar), [v.ar]);
  const hidden = mode === "test" && !revealed;
  const blurred = mode === "memo" && !revealed;

  return (
    <article
      id={`vc${v.n}`}
      className={`surface p-4 transition-colors ${active ? "ring-primary bg-primary-soft ring-2" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="bg-primary-soft text-primary flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black">
          {v.n}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPlay}
            className="bg-secondary rounded-full p-1.5"
            aria-label={`Écouter le verset ${v.n}`}
          >
            <Play size={13} fill="currentColor" />
          </button>
          <button
            onClick={onKnown}
            className={`rounded-full p-1.5 ${known ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
            aria-label="Je connais ce verset"
          >
            <Heart size={13} fill={known ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <p
        dir="rtl"
        onClick={() => (mode !== "lecture" ? setRevealed((r) => !r) : undefined)}
        className={`arabic text-2xl ${hidden ? "hide-words" : ""} ${blurred ? "blur-words" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {mode !== "lecture" && (
        <p className="text-muted-foreground mt-2 text-center text-[11px] font-bold">
          {revealed ? "Touche pour masquer" : "Touche le verset pour révéler"}
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed font-semibold">{v.tr}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {v.sens && (
          <TabBtn on={tab === "sens"} onClick={() => setTab(tab === "sens" ? null : "sens")}>
            💡 Sens
          </TabBtn>
        )}
        {v.tafsir && (
          <TabBtn on={tab === "tafsir"} onClick={() => setTab(tab === "tafsir" ? null : "tafsir")}>
            📖 Explication
          </TabBtn>
        )}
        {!!v.dico?.length && (
          <TabBtn on={tab === "dico"} onClick={() => setTab(tab === "dico" ? null : "dico")}>
            🔤 Dictionnaire
          </TabBtn>
        )}
      </div>

      {tab === "sens" && v.sens && (
        <p className="bg-secondary mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed font-bold">
          {v.sens}
        </p>
      )}
      {tab === "tafsir" && v.tafsir && (
        <p className="bg-secondary mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold">
          {v.tafsir}
        </p>
      )}
      {tab === "dico" && (
        <div className="mt-2 space-y-2">
          {v.dico?.map((d, i) => (
            <div key={i} className="bg-secondary rounded-xl p-3">
              <p className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-black">{d.simple}</span>
                <span className="arabic text-base">{d.ar}</span>
              </p>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed font-semibold">
                {d.img}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TabBtn({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
        on ? "bg-primary text-primary-foreground" : "bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}
