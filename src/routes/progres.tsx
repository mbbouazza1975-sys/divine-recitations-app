import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Star, Target } from "lucide-react";
import { Shell } from "@/components/Shell";
import { SURAHS } from "@/data/quran";
import { BADGES, levelOf, levelProgress, useProgress } from "@/lib/progress";

export const Route = createFileRoute("/progres")({
  head: () => ({
    meta: [
      { title: "Ma progression — Hifz Juz 'Amma" },
      {
        name: "description",
        content:
          "Suis ta série de jours, tes points, tes badges et l'avancement de chacune des 37 sourates du Juz 'Amma.",
      },
      { property: "og:title", content: "Ma progression — Hifz Juz 'Amma" },
      {
        property: "og:description",
        content: "Série, points, badges et avancement sourate par sourate.",
      },
    ],
  }),
  component: Progres,
});

const days = Array.from({ length: 28 }, (_, k) => {
  const d = new Date(Date.now() - (27 - k) * 864e5);
  return d.toISOString().slice(0, 10);
});

function Progres() {
  const { state, stat, memorizedCount } = useProgress();
  const level = levelOf(state.xp);
  const pct = Math.round(levelProgress(state.xp) * 100);
  const max = Math.max(1, ...days.map((d) => state.days[d]?.xp ?? 0));

  return (
    <Shell title="Ma progression" subtitle={`Niveau ${level} · ${state.xp} points`}>
      <section className="surface enter p-4">
        <div className="mb-2 flex justify-between text-xs font-black">
          <span>Niveau {level}</span>
          <span className="text-muted-foreground">{pct}% vers le niveau {level + 1}</span>
        </div>
        <div className="bg-muted h-2.5 overflow-hidden rounded-full">
          <div className="grad-gold h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [<Flame key="f" size={16} className="text-accent-foreground mx-auto" />, state.streak, "série"],
            [<Star key="s" size={16} className="text-accent-foreground mx-auto" />, memorizedCount, "mémorisées"],
            [<Target key="t" size={16} className="text-accent-foreground mx-auto" />, state.dailyGoal, "versets/jour"],
          ].map(([icon, val, label], k) => (
            <div key={k} className="bg-secondary rounded-xl py-2.5">
              {icon as JSX.Element}
              <p className="mt-1 text-base font-black">{val as number}</p>
              <p className="text-muted-foreground text-[10px] font-bold">{label as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface mt-4 p-4">
        <h2 className="text-xs font-black tracking-wider uppercase">28 derniers jours</h2>
        <div className="mt-3 grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
          {days.map((d) => {
            const xp = state.days[d]?.xp ?? 0;
            const o = xp === 0 ? 0.09 : 0.25 + (xp / max) * 0.75;
            return (
              <span
                key={d}
                title={`${d} · ${xp} pts`}
                className="bg-primary aspect-square rounded-[4px]"
                style={{ opacity: o }}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-muted-foreground mb-2 text-[11px] font-black tracking-wider uppercase">
          Badges
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map((b) => {
            const got = state.badges.includes(b.code);
            return (
              <div
                key={b.code}
                className={`surface flex flex-col items-center p-3 text-center ${got ? "" : "opacity-45"}`}
              >
                <span className="text-2xl">{b.emoji}</span>
                <span className="mt-1 text-[11px] leading-tight font-black">{b.label}</span>
                <span className="text-muted-foreground mt-0.5 text-[9px] leading-tight font-semibold">
                  {b.hint}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-muted-foreground mb-2 text-[11px] font-black tracking-wider uppercase">
          Sourate par sourate
        </h2>
        <div className="surface divide-y overflow-hidden">
          {SURAHS.map((s) => {
            const st = stat(s.num);
            return (
              <Link
                key={s.num}
                to="/sourate/$num"
                params={{ num: String(s.num) }}
                className="flex items-center gap-3 px-3 py-2.5"
              >
                <span className="text-muted-foreground w-6 text-[11px] font-black">{s.num}</span>
                <span className="flex-1 truncate text-xs font-bold">{s.fr}</span>
                <span className="text-[11px]">{"⭐".repeat(st.stars) || "—"}</span>
                <span
                  className={`h-2 w-2 rounded-full ${st.memorized ? "bg-primary" : st.listens ? "bg-accent" : "bg-muted"}`}
                />
              </Link>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}
