import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { ProgressProvider } from "../lib/progress";
import { Splash } from "../components/Splash";
import { scheduleReminder } from "../lib/notify";

function NotFoundComponent() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl">🕌</div>
        <h1 className="text-foreground mt-4 text-2xl font-extrabold">Page introuvable</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="bg-primary text-primary-foreground mt-6 inline-flex rounded-full px-5 py-2.5 text-sm font-bold"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-foreground text-xl font-bold">Cette page n&apos;a pas pu se charger</h1>
        <p className="text-muted-foreground mt-2 text-sm">Réessaie ou reviens à l&apos;accueil.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-bold"
          >
            Réessayer
          </button>
          <a href="/" className="border-input rounded-full border px-5 py-2.5 text-sm font-bold">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no",
      },
      { title: "Hifz — Mémoriser Juz 'Amma en Warsh" },
      {
        name: "description",
        content:
          "Application ludique pour mémoriser le Juz 'Amma : audio Warsh, tajwîd coloré, quiz, séries et mode hors ligne.",
      },
      { name: "theme-color", content: "#2D5A27" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Hifz" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "Hifz — Mémoriser Juz 'Amma en Warsh" },
      {
        property: "og:description",
        content: "Audio Warsh, tajwîd coloré, quiz audio, séries et hors ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    scheduleReminder();
    void import("../lib/register-sw").then((m) => m.registerServiceWorker());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProgressProvider>
          <Splash />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="top-center" richColors />
        </ProgressProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
