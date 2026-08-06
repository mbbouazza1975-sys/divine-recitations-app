import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  BookOpen,
  Check,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Palette,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { getSurah, getReciter, RECITERS, type Verse } from "@/data/quran";
import { useProgress } from "@/lib/progress";
import { wrapWords } from "@/lib/tajwid";
import { downloadSurah, isOffline, removeSurah, resolveAudio } from "@/lib/offline";

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
  loader: ({ params }) => {
    const s = getSurah(Number(params.num));
    if (!s) throw notFound();
    return { num: s.num };
  },
  component: SurahPage,
});

type Mode = "lecture" | "masque" | "sens";

function SurahPage() {
  const { num } = Route.useLoaderData();
  const surah = getSurah(num)!;
  const { state, stat, setSurah, addXp } = useProgress();
  const st = stat(num);

  const [mode, setMode] = useState<Mode>("lecture");
  const [tajwid, setTajwid] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const counted = useRef(false);

  const reciter = getReciter(state.reciter);

  useEffect(() => setSaved(isOffline(state.reciter, num)), [state.reciter, num]);

  useEffect(() => {
    const a = audioRef.current;
    return () => {
      a?.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    setBusy(true);
    try {
      if (!a.src) a.src = await resolveAudio(state.reciter, num);
      a.playbackRate = rate;
      await a.play();
      setPlaying(true);
      if (!counted.current) {
        counted.current = true;
        setSurah(num, { listens: st.listens + 1 });
        addXp(5, 0);
      }
    } catch {
      toast.error("Lecture impossible. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  };

  // Changement de récitateur -> recharger la source
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.removeAttribute("src");
    setPlaying(false);
  }, [state.reciter]);

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
      <audio ref={audioRef} preload="none" onEnded={() => setPlaying(false)} />

      <section className="surface enter p-4">
        <p className="text-sm leading-relaxed font-semibold">{surah.intro}</p>
        <p className="bg-accent-soft mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed font-semibold">
          💡 {surah.valeur}
        </p>
      </section>

      <div className="surface sticky top-[68px] z-30 mt-4 flex items-center gap-2 p-2.5">
        <button
          onClick={toggle}
          className="bg-primary text-primary-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          aria-label={playing ? "Pause" : "Écouter"}
        >
          {busy ? (
            <Loader2 size={19} className="animate-spin" />
          ) : playing ? (
            <Pause size={19} fill="currentColor" />
          ) : (
            <Play size={19} fill="currentColor" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black">{reciter.emoji} {reciter.name}</p>
          <p className="text-muted-foreground truncate text-[10px] font-semibold">
            {reciter.detail}
          </p>
        </div>
        <button
          onClick={() => setRate(rate === 1 ? 0.75 : rate === 0.75 ? 0.5 : 1)}
          className="bg-secondary shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-black"
        >
          ×{rate}
        </button>
        <button
          onClick={download}
          className={`shrink-0 rounded-full p-2 ${saved ? "bg-primary-soft text-primary" : "bg-secondary"}`}
          aria-label="Hors ligne"
        >
          {saved ? <Trash2 size={16} /> : <Download size={16} />}
        </button>
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["lecture", "Lecture", BookOpen],
            ["masque", "Masqué", EyeOff],
            ["sens", "Sens & tafsir", Eye],
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
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
            tajwid ? "bg-accent-soft text-accent-foreground" : "bg-secondary"
          }`}
        >
          <Palette size={13} /> Tajwîd
        </button>
      </div>

      <div className={`mt-4 space-y-3 ${tajwid ? "" : "no-tajwid"}`}>
        {surah.verses.map((v) => (
          <VerseCard
            key={v.n}
            v={v}
            mode={mode}
            open={open === v.n}
            onToggle={() => setOpen(open === v.n ? null : v.n)}
          />
        ))}
      </div>

      <div className="surface mt-5 p-4">
        <p className="text-xs leading-relaxed font-semibold">🕋 {surah.hadith}</p>
      </div>

      <button
        onClick={finish}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black ${
          st.memorized
            ? "bg-primary-soft text-primary"
            : "grad-emerald text-primary-foreground shadow-lift"
        }`}
      >
        <Check size={17} strokeWidth={3} />
        {st.memorized ? "Mémorisée ✓ (annuler)" : "J'ai mémorisé cette sourate"}
      </button>
    </Shell>
  );
}

function VerseCard({
  v,
  mode,
  open,
  onToggle,
}: {
  v: Verse;
  mode: Mode;
  open: boolean;
  onToggle: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const html = useMemo(() => (mode === "masque" ? wrapWords(v.ar) : v.ar), [v.ar, mode]);

  return (
    <article className="surface p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="bg-primary-soft text-primary flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black">
          {v.n}
        </span>
        {v.icon && <span className="text-lg">{v.icon}</span>}
      </div>

      <p
        dir="rtl"
        onClick={() => mode === "masque" && setRevealed((r) => !r)}
        className={`arabic text-2xl ${mode === "masque" && !revealed ? "hide-words" : ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {mode === "masque" && (
        <p className="text-muted-foreground mt-2 text-center text-[11px] font-bold">
          {revealed ? "Touche pour masquer" : "Touche le verset pour révéler"}
        </p>
      )}

      {mode !== "masque" && (
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed font-semibold">{v.tr}</p>
      )}

      {mode === "sens" && (
        <>
          {v.sens && (
            <p className="bg-secondary mt-3 rounded-xl px-3 py-2 text-xs font-bold">✨ {v.sens}</p>
          )}
          {(v.tafsir || v.dico?.length) && (
            <button
              onClick={onToggle}
              className="text-primary mt-3 text-xs font-black"
              type="button"
            >
              {open ? "− Masquer l'explication" : "+ Explication & vocabulaire"}
            </button>
          )}
          {open && (
            <div className="mt-2 space-y-2">
              {v.tafsir && (
                <p className="text-xs leading-relaxed font-semibold">{v.tafsir}</p>
              )}
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
        </>
      )}
    </article>
  );
}
