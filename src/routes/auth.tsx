import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Hifz Juz 'Amma" },
      {
        name: "description",
        content:
          "Connecte-toi pour synchroniser ta progression de mémorisation du Juz 'Amma sur tous tes appareils.",
      },
      { property: "og:title", content: "Connexion — Hifz Juz 'Amma" },
      { property: "og:description", content: "Synchronise ta progression sur tous tes appareils." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pwd,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Vérifie ta boîte mail pour confirmer ton compte ✉️");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        toast.success("Bienvenue 🌙");
        void nav({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Mon compte" subtitle="Synchronise ta progression" back="/profil" nav={false}>
      <div className="surface enter p-5">
        <div className="bg-secondary mb-5 flex rounded-full p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2 text-xs font-black ${
                mode === m ? "bg-card shadow" : "text-muted-foreground"
              }`}
            >
              {m === "in" ? "Connexion" : "Créer un compte"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Adresse e-mail"
            className="bg-background focus:ring-primary/40 w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none focus:ring-2"
          />
          <input
            type="password"
            required
            minLength={6}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Mot de passe"
            className="bg-background focus:ring-primary/40 w-full rounded-xl border px-3 py-3 text-sm font-semibold outline-none focus:ring-2"
          />
          <button
            disabled={busy}
            className="grad-emerald text-primary-foreground w-full rounded-xl py-3 text-sm font-black disabled:opacity-60"
          >
            {busy ? "…" : mode === "in" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>


      </div>

      <p className="text-muted-foreground mt-4 text-center text-[11px] font-semibold">
        Ta progression locale est conservée et fusionnée à la connexion.
      </p>
    </Shell>
  );
}
