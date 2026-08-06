import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Cloud, LogOut, Moon, Sun, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { RECITERS } from "@/data/quran";
import { useProgress } from "@/lib/progress";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { askPermission, getReminder, saveReminder, type Reminder } from "@/lib/notify";
import { offlineList } from "@/lib/offline";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil & réglages — Hifz" },
      {
        name: "description",
        content:
          "Choisis ton récitateur Warsh, ton objectif quotidien, tes rappels et gère ton compte et le mode hors ligne.",
      },
      { property: "og:title", content: "Mon profil & réglages — Hifz" },
      {
        property: "og:description",
        content: "Récitateur Warsh, objectif quotidien, rappels et synchronisation du compte.",
      },
    ],
  }),
  component: Profil,
});

function Profil() {
  const { user } = useAuth();
  const { state, setReciter, setGoal } = useProgress();
  const [rem, setRem] = useState<Reminder>({ enabled: false, hour: 19, minute: 0 });
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    setRem(getReminder());
    setSaved(offlineList());
    const stored = localStorage.getItem("hifz.theme");
    const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDark = () => {
    const v = !dark;
    setDark(v);
    localStorage.setItem("hifz.theme", v ? "dark" : "light");
    document.documentElement.classList.toggle("dark", v);
  };

  const toggleRem = async (enabled: boolean) => {
    if (enabled && !(await askPermission())) {
      toast.error("Notifications refusées par le navigateur");
      return;
    }
    const next = { ...rem, enabled };
    setRem(next);
    saveReminder(next);
    if (enabled) toast.success("Rappel quotidien activé 🔔");
  };

  const clearOffline = async () => {
    if ("caches" in window) await caches.delete("hifz-audio-v1");
    localStorage.removeItem("hifz.offline");
    setSaved([]);
    toast("Audios hors ligne supprimés");
  };

  return (
    <Shell title="Profil" subtitle="Réglages & compte">
      <section className="surface enter flex items-center gap-3 p-4">
        <div className="grad-emerald text-primary-foreground flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black">
          {(user?.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{user?.email ?? "Mode invité"}</p>
          <p className="text-muted-foreground text-[11px] font-semibold">
            {user ? "Progression synchronisée ☁️" : "Connecte-toi pour sauvegarder ta progression"}
          </p>
        </div>
        {user ? (
          <button
            onClick={() => void supabase.auth.signOut()}
            className="bg-secondary rounded-full p-2.5"
            aria-label="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        ) : (
          <Link to="/auth" className="bg-primary text-primary-foreground rounded-full px-4 py-2 text-xs font-black">
            <Cloud size={13} className="mr-1 inline" /> Connexion
          </Link>
        )}
      </section>

      <h2 className="text-muted-foreground mt-5 mb-2 text-[11px] font-black tracking-wider uppercase">
        Récitateur (Warsh 'an Nâfi')
      </h2>
      <div className="space-y-2">
        {RECITERS.map((r) => (
          <button
            key={r.id}
            onClick={() => setReciter(r.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
              state.reciter === r.id ? "border-primary bg-primary-soft" : "bg-card"
            }`}
          >
            <span className="text-xl">{r.emoji}</span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">{r.name}</span>
              <span className="text-muted-foreground block text-[11px] font-semibold">{r.detail}</span>
            </span>
            {state.reciter === r.id && <span className="text-primary text-xs font-black">✓</span>}
          </button>
        ))}
      </div>

      <h2 className="text-muted-foreground mt-5 mb-2 text-[11px] font-black tracking-wider uppercase">
        Objectif quotidien
      </h2>
      <div className="surface p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
          <Target size={16} className="text-primary" /> {state.dailyGoal} versets par jour
        </div>
        <input
          type="range"
          min={3}
          max={30}
          step={1}
          value={state.dailyGoal}
          onChange={(e) => setGoal(Number(e.target.value))}
          className="accent-primary w-full"
        />
      </div>

      <h2 className="text-muted-foreground mt-5 mb-2 text-[11px] font-black tracking-wider uppercase">
        Rappels & apparence
      </h2>
      <div className="surface divide-y">
        <div className="flex items-center gap-3 p-4">
          <Bell size={17} className="text-primary" />
          <span className="flex-1 text-sm font-bold">Rappel quotidien</span>
          <input
            type="time"
            value={`${String(rem.hour).padStart(2, "0")}:${String(rem.minute).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":");
              const next = { ...rem, hour: Number(h), minute: Number(m) };
              setRem(next);
              saveReminder(next);
            }}
            className="bg-secondary rounded-lg px-2 py-1 text-xs font-bold"
          />
          <Switch on={rem.enabled} onChange={toggleRem} />
        </div>
        <div className="flex items-center gap-3 p-4">
          {dark ? <Moon size={17} className="text-primary" /> : <Sun size={17} className="text-primary" />}
          <span className="flex-1 text-sm font-bold">Thème sombre</span>
          <Switch on={dark} onChange={toggleDark} />
        </div>
        <button onClick={clearOffline} className="flex w-full items-center gap-3 p-4 text-left">
          <Trash2 size={17} className="text-destructive" />
          <span className="flex-1 text-sm font-bold">Vider les audios hors ligne</span>
          <span className="text-muted-foreground text-xs font-bold">{saved.length}</span>
        </button>
      </div>

      <p className="text-muted-foreground mt-6 text-center text-[11px] font-semibold">
        Hifz · Juz &apos;Amma en Warsh &apos;an Nâfi&apos; — installable sur iOS et Android
      </p>
    </Shell>
  );
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`bg-card block h-5 w-5 rounded-full shadow transition-transform ${on ? "translate-x-5" : ""}`}
      />
    </button>
  );
}
