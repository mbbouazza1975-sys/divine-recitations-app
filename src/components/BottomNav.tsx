import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Brain, Home, Sparkles, User } from "lucide-react";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/lecture", label: "Lecture", icon: BookOpen },
  { to: "/quiz", label: "Quiz", icon: Brain },
  { to: "/progres", label: "Progrès", icon: Sparkles },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="bg-card/95 fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-[520px] border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      {items.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                active ? "bg-primary-soft scale-105" : ""
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.6 : 2} />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
