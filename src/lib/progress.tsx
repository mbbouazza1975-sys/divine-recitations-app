import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ORDER } from "@/data/quran";

export type SurahStat = { memorized: boolean; stars: number; bestQuiz: number; listens: number };
export type State = {
  xp: number;
  streak: number;
  lastDay: string | null;
  reciter: string;
  dailyGoal: number;
  surahs: Record<number, SurahStat>;
  days: Record<string, { verses: number; xp: number }>;
  badges: string[];
};

const EMPTY: State = {
  xp: 0,
  streak: 0,
  lastDay: null,
  reciter: "qari",
  dailyGoal: 10,
  surahs: {},
  days: {},
  badges: [],
};

const KEY = "hifz.state";
export const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);

export const BADGES: { code: string; label: string; emoji: string; hint: string }[] = [
  { code: "first-step", label: "Premier pas", emoji: "🌱", hint: "Écouter une première sourate" },
  { code: "streak-3", label: "Régulier", emoji: "🔥", hint: "3 jours d'affilée" },
  { code: "streak-7", label: "Semaine sacrée", emoji: "🏅", hint: "7 jours d'affilée" },
  { code: "quiz-perfect", label: "Sans faute", emoji: "🎯", hint: "100 % à un quiz" },
  { code: "memo-5", label: "Cinq trésors", emoji: "💎", hint: "5 sourates mémorisées" },
  { code: "memo-all", label: "Hâfiz de Juz 'Amma", emoji: "👑", hint: "Les 37 sourates mémorisées" },
];

export const levelOf = (xp: number) => Math.floor(xp / 250) + 1;
export const levelProgress = (xp: number) => (xp % 250) / 250;

type Ctx = {
  state: State;
  ready: boolean;
  stat: (n: number) => SurahStat;
  addXp: (amount: number, verses?: number) => void;
  setSurah: (n: number, patch: Partial<SurahStat>) => void;
  setReciter: (id: string) => void;
  setGoal: (n: number) => void;
  memorizedCount: number;
  todayXp: number;
};

const C = createContext<Ctx | null>(null);
const blank: SurahStat = { memorized: false, stars: 0, bestQuiz: 0, listens: 0 };

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chargement local
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setState({ ...EMPTY, ...JSON.parse(s) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: State) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  // Synchro descendante à la connexion
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: sp }, { data: bd }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("surah_progress").select("*").eq("user_id", user.id),
        supabase.from("badges").select("code").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      setState((local) => {
        const surahs = { ...local.surahs };
        for (const r of sp ?? []) {
          const cur = surahs[r.surah] ?? blank;
          surahs[r.surah] = {
            memorized: cur.memorized || r.memorized,
            stars: Math.max(cur.stars, r.stars),
            bestQuiz: Math.max(cur.bestQuiz, r.best_quiz),
            listens: Math.max(cur.listens, r.listens),
          };
        }
        const merged: State = {
          ...local,
          xp: Math.max(local.xp, profile?.xp ?? 0),
          streak: Math.max(local.streak, profile?.streak ?? 0),
          reciter: profile?.reciter ?? local.reciter,
          dailyGoal: profile?.daily_goal ?? local.dailyGoal,
          surahs,
          badges: Array.from(new Set([...local.badges, ...(bd ?? []).map((b) => b.code)])),
        };
        try {
          localStorage.setItem(KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return merged;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Synchro montante (anti-rebond)
  useEffect(() => {
    if (!user || !ready) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void (async () => {
        await supabase.from("profiles").upsert({
          id: user.id,
          xp: state.xp,
          streak: state.streak,
          reciter: state.reciter,
          daily_goal: state.dailyGoal,
          last_active_day: state.lastDay,
          updated_at: new Date().toISOString(),
        });
        const rows = Object.entries(state.surahs).map(([n, s]) => ({
          user_id: user.id,
          surah: Number(n),
          memorized: s.memorized,
          stars: s.stars,
          best_quiz: s.bestQuiz,
          listens: s.listens,
          updated_at: new Date().toISOString(),
        }));
        if (rows.length) await supabase.from("surah_progress").upsert(rows);
        const d = state.days[today()];
        if (d)
          await supabase
            .from("daily_activity")
            .upsert({ user_id: user.id, day: today(), verses: d.verses, xp: d.xp });
        if (state.badges.length)
          await supabase
            .from("badges")
            .upsert(state.badges.map((code) => ({ user_id: user.id, code })));
      })();
    }, 1200);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [state, user, ready]);

  const withBadges = useCallback((s: State): State => {
    const memo = Object.values(s.surahs).filter((x) => x.memorized).length;
    const add = new Set(s.badges);
    if (Object.values(s.surahs).some((x) => x.listens > 0)) add.add("first-step");
    if (s.streak >= 3) add.add("streak-3");
    if (s.streak >= 7) add.add("streak-7");
    if (Object.values(s.surahs).some((x) => x.bestQuiz >= 100)) add.add("quiz-perfect");
    if (memo >= 5) add.add("memo-5");
    if (memo >= ORDER.length) add.add("memo-all");
    return { ...s, badges: Array.from(add) };
  }, []);

  const addXp = useCallback(
    (amount: number, verses = 0) => {
      setState((prev) => {
        const d = today();
        const streak =
          prev.lastDay === d ? prev.streak : prev.lastDay === yesterday() ? prev.streak + 1 : 1;
        const day = prev.days[d] ?? { verses: 0, xp: 0 };
        const next = withBadges({
          ...prev,
          xp: prev.xp + amount,
          streak,
          lastDay: d,
          days: { ...prev.days, [d]: { verses: day.verses + verses, xp: day.xp + amount } },
        });
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [withBadges],
  );

  const setSurah = useCallback(
    (n: number, patch: Partial<SurahStat>) => {
      setState((prev) => {
        const cur = prev.surahs[n] ?? blank;
        const next = withBadges({
          ...prev,
          surahs: { ...prev.surahs, [n]: { ...cur, ...patch } },
        });
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [withBadges],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      stat: (n) => state.surahs[n] ?? blank,
      addXp,
      setSurah,
      setReciter: (id) => persist({ ...state, reciter: id }),
      setGoal: (n) => persist({ ...state, dailyGoal: n }),
      memorizedCount: Object.values(state.surahs).filter((s) => s.memorized).length,
      todayXp: state.days[today()]?.xp ?? 0,
    }),
    [state, ready, addXp, setSurah, persist],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useProgress() {
  const c = useContext(C);
  if (!c) throw new Error("useProgress hors ProgressProvider");
  return c;
}
