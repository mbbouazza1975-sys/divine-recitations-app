// Génère le service worker (précache + runtime caching) APRÈS le build complet.
//
// Pourquoi ce script existe : ce projet utilise TanStack Start (build multi-environnements
// client/ssr + nitro). Les assets finaux hashés (JS/CSS/icônes) n'atterrissent jamais dans
// le dossier `dist/` que vite-plugin-pwa scanne par défaut — ils sont écrits directement dans
// `.output/public/`. Résultat avec vite-plugin-pwa seul : sw.js était généré dans dist/ (jamais
// copié dans le build final → 404 en prod) et son manifest de précache était vide (0 entrée),
// car il ne trouvait aucun fichier à `globDirectory`. On appelle donc workbox-build directement,
// après la fin du build nitro, en pointant sur le vrai dossier de sortie.
import { generateSW } from "workbox-build";
import { existsSync } from "node:fs";

const globDirectory = ".output/public";

if (!existsSync(globDirectory)) {
  console.error(`[generate-sw] ${globDirectory} introuvable — le build nitro a-t-il échoué ?`);
  process.exit(1);
}

const { count, size, warnings } = await generateSW({
  swDest: `${globDirectory}/sw.js`,
  globDirectory,
  // Precache l'app-shell : JS/CSS/HTML/icônes/police locales. Les mp3 audio ne sont
  // volontairement PAS précachés ici (trop lourd) — ils passent par le runtime caching
  // CacheFirst ci-dessous, déclenché à l'écoute (cf. src/lib/offline.ts pour le
  // téléchargement explicite « hors ligne » d'une sourate entière).
  globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
  globIgnores: ["**/node_modules/**/*", "sw.js", "workbox-*.js"],
  navigateFallback: "/",
  navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
      handler: "NetworkFirst",
      options: { cacheName: "hifz-pages", networkTimeoutSeconds: 4 },
    },
    {
      urlPattern: ({ url }) => url.hostname.endsWith("mp3quran.net"),
      handler: "CacheFirst",
      options: {
        cacheName: "hifz-audio-runtime",
        expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 },
        cacheableResponse: { statuses: [0, 200] },
        rangeRequests: true,
      },
    },
    {
      urlPattern: ({ url }) => url.hostname.endsWith("everyayah.com"),
      handler: "CacheFirst",
      options: {
        cacheName: "hifz-audio-ayah-runtime",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 60 },
        cacheableResponse: { statuses: [0, 200] },
        rangeRequests: true,
      },
    },
    {
      urlPattern: ({ url }) => url.hostname.includes("fonts.g"),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "hifz-fonts" },
    },
  ],
});

if (warnings.length) {
  console.warn("[generate-sw] warnings:", warnings);
}
console.log(
  `[generate-sw] OK — ${count} fichiers précachés (${(size / 1024).toFixed(1)} KiB) → ${globDirectory}/sw.js`,
);
