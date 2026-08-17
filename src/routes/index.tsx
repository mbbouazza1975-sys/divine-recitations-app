import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Play, Sparkles, Brain, Headphones, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SURAHS, totalVerses } from "@/data/quran";
import { levelOf, levelProgress, useProgress } from "@/lib/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hifz — Mémoriser le Juz 'Amma en Warsh" },
      {
        name: "description",
        content:
          "Ton tableau de bord de mémorisation : série de jours, objectif quotidien, sourates et quiz audio en Warsh.",
      },
      { property: "og:title", content: "Hifz — Mémoriser le Juz 'Amma en Warsh" },
      {
        property: "og:description",
        content: "Série, objectif du jour, audio Warsh et quiz : tout pour mémoriser Juz 'Amma.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { state, stat, memorizedCount, todayXp } = useProgress();
  const level = levelOf(state.xp);
  const pct = Math.round(levelProgress(state.xp) * 100);
  const goalPct = Math.min(100, Math.round((todayXp / (state.dailyGoal * 10)) * 100));

  const next = SURAHS.find((s) => !stat(s.num).memorized) ?? SURAHS[0]!;
  const recent = SURAHS.filter((s) => stat(s.num).listens > 0).slice(0, 4);

  const [greet, setGreet] = useState("As-salâmu ʿalaykum");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreet(
      hour < 12 ? "Sabâh al-khayr" : hour < 18 ? "Bonne après-midi" : "Masâ' al-khayr",
    );
  }, []);

  return (
    <div className="bg-background mx-auto flex min-h-screen max-w-[520px] flex-col">
      <header className="grad-emerald text-primary-foreground rounded-b-[32px] px-5 pt-[calc(env(safe-area-inset-top)+1.2rem)] pb-8">
        <p className="text-primary-foreground/70 text-xs font-bold tracking-wide uppercase">
          {greet}
        </p>
        <h1 className="mt-1 text-2xl font-black">Prêt pour ta révision ?</h1>

        <div className="mt-5 flex gap-3">
          <div className="bg-primary-foreground/12 flex-1 rounded-2xl px-3 py-2.5 backdrop-blur">
            <div className="flex items-center gap-1.5 text-lg font-black">
              <Flame size={17} className="text-accent" />
              {state.streak}
            </div>
            <p className="text-primary-foreground/70 text-[10px] font-bold">jours de suite</p>
          </div>
          <div className="bg-primary-foreground/12 flex-1 rounded-2xl px-3 py-2.5 backdrop-blur">
            <div className="text-lg font-black">{memorizedCount}/37</div>
            <p className="text-primary-foreground/70 text-[10px] font-bold">mémorisées</p>
          </div>
          <div className="bg-primary-foreground/12 flex-1 rounded-2xl px-3 py-2.5 backdrop-blur">
            <div className="text-lg font-black">{state.xp}</div>
            <p className="text-primary-foreground/70 text-[10px] font-bold">points</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[11px] font-bold">
            <span>Niveau {level}</span>
            <span className="text-primary-foreground/70">{pct}%</span>
          </div>
          <div className="bg-primary-foreground/20 h-2 overflow-hidden rounded-full">
            <div className="grad-gold h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-28">
        <section className="surface enter overflow-hidden p-0">
          <div className="flex items-center gap-3 p-4">
            <div className="bg-primary-soft flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl">
              {next.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-[10px] font-black tracking-wider uppercase">
                À travailler maintenant
              </p>
              <h2 className="truncate text-base font-extrabold">
                {next.num}. {next.fr}
              </h2>
              <p className="text-muted-foreground truncate text-xs font-semibold">{next.theme}</p>
            </div>
            <Link
              to="/sourate/$num"
              params={{ num: String(next.num) }}
              className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lift"
              aria-label={`Ouvrir ${next.fr}`}
            >
              <Play size={20} fill="currentColor" />
            </Link>
          </div>
          <div className="bg-secondary/60 border-t px-4 py-2.5">
            <div className="mb-1 flex justify-between text-[11px] font-bold">
              <span>Objectif du jour</span>
              <span className="text-muted-foreground">{goalPct}%</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link to="/quiz" className="surface enter flex flex-col gap-2 p-4">
            <span className="bg-accent-soft flex h-10 w-10 items-center justify-center rounded-xl">
              <Brain size={19} className="text-accent-foreground" />
            </span>
            <span className="text-sm font-extrabold">Quiz & jeux</span>
            <span className="text-muted-foreground text-[11px] font-semibold">
              Audio, verset caché, ordre
            </span>
          </Link>
          <Link to="/lecture" className="surface enter flex flex-col gap-2 p-4">
            <span className="bg-primary-soft flex h-10 w-10 items-center justify-center rounded-xl">
              <Headphones size={19} className="text-primary" />
            </span>
            <span className="text-sm font-extrabold">Les 37 sourates</span>
            <span className="text-muted-foreground text-[11px] font-semibold">
              {totalVerses} versets en Warsh
            </span>
          </Link>
        </div>

        {recent.length > 0 && (
          <section className="mt-6">
            <h3 className="text-muted-foreground mb-2 text-[11px] font-black tracking-wider uppercase">
              Reprendre
            </h3>
            <div className="space-y-2">
              {recent.map((s) => (
                <Link
                  key={s.num}
                  to="/sourate/$num"
                  params={{ num: String(s.num) }}
                  className="surface flex items-center gap-3 p-3"
                >
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{s.fr}</span>
                    <span className="text-muted-foreground block text-[11px] font-semibold">
                      {"⭐".repeat(stat(s.num).stars) || "Pas encore d'étoile"}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="text-muted-foreground mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold">
          <Sparkles size={13} /> Récitation Warsh &apos;an Nâfi&apos; · 4 récitateurs
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
