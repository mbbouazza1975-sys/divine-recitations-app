import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Search } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SURAHS } from "@/data/quran";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/lecture")({
  head: () => ({
    meta: [
      { title: "Les 37 sourates du Juz 'Amma — Hifz" },
      {
        name: "description",
        content:
          "Parcours les 37 sourates du Juz 'Amma : texte arabe avec tajwîd coloré, traduction française et audio Warsh.",
      },
      { property: "og:title", content: "Les 37 sourates du Juz 'Amma" },
      {
        property: "og:description",
        content: "Texte arabe, tajwîd coloré, traduction et audio Warsh pour chaque sourate.",
      },
    ],
  }),
  component: Lecture,
});

const FILTERS = ["Toutes", "En cours", "Mémorisées", "À découvrir"] as const;

function Lecture() {
  const { stat } = useProgress();
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]>("Toutes");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return SURAHS.filter((s) => {
      const st = stat(s.num);
      if (f === "Mémorisées" && !st.memorized) return false;
      if (f === "En cours" && (st.memorized || st.listens === 0)) return false;
      if (f === "À découvrir" && st.listens > 0) return false;
      if (!needle) return true;
      return (
        s.fr.toLowerCase().includes(needle) ||
        s.fr2.toLowerCase().includes(needle) ||
        String(s.num).includes(needle)
      );
    });
  }, [q, f, stat]);

  return (
    <Shell title="Juz 'Amma" subtitle="37 sourates · Warsh 'an Nâfi'">
      <div className="relative">
        <Search size={16} className="text-muted-foreground absolute top-3.5 left-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher une sourate…"
          className="bg-card focus:ring-primary/40 w-full rounded-2xl border py-3 pr-3 pl-9 text-sm font-semibold outline-none focus:ring-2"
        />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((x) => (
          <button
            key={x}
            onClick={() => setF(x)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
              f === x ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {x}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {list.map((s) => {
          const st = stat(s.num);
          return (
            <Link
              key={s.num}
              to="/sourate/$num"
              params={{ num: String(s.num) }}
              className="surface flex items-center gap-3 p-3"
            >
              <span className="bg-secondary text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black">
                {s.num}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-extrabold">{s.fr}</span>
                  {st.memorized && (
                    <Check size={13} className="text-primary shrink-0" strokeWidth={3.5} />
                  )}
                </span>
                <span className="text-muted-foreground block truncate text-[11px] font-semibold">
                  {s.fr2} · {s.versets} versets
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="arabic block text-base leading-none">{s.ar}</span>
                <span className="mt-1 block text-[10px]">
                  {"⭐".repeat(st.stars)}
                </span>
              </span>
            </Link>
          );
        })}
        {list.length === 0 && (
          <p className="text-muted-foreground py-10 text-center text-sm font-semibold">
            Aucune sourate ne correspond.
          </p>
        )}
      </div>
    </Shell>
  );
}
