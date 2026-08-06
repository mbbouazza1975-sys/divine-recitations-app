import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "./BottomNav";

export function Shell({
  title,
  subtitle,
  right,
  back,
  children,
  nav = true,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: string;
  children: ReactNode;
  nav?: boolean;
}) {
  return (
    <div className="bg-background mx-auto flex min-h-screen max-w-[520px] flex-col">
      <header className="grad-emerald text-primary-foreground sticky top-0 z-40 px-4 pt-[calc(env(safe-area-inset-top)+0.9rem)] pb-3">
        <div className="flex items-center gap-3">
          {back && (
            <Link
              to={back}
              className="bg-primary-foreground/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              aria-label="Retour"
            >
              <ChevronLeft size={18} />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg leading-tight font-extrabold">{title}</h1>
            {subtitle && (
              <p className="text-primary-foreground/70 truncate text-xs font-semibold">
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}
