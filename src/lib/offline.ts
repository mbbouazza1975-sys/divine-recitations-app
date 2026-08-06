import { audioUrl } from "@/data/quran";

const CACHE = "hifz-audio-v1";
const LIST = "hifz.offline";

const read = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LIST) ?? "[]");
  } catch {
    return [];
  }
};
const write = (v: string[]) => localStorage.setItem(LIST, JSON.stringify(v));

const key = (reciter: string, surah: number) => `${reciter}:${surah}`;

export const offlineList = read;
export const isOffline = (reciter: string, surah: number) =>
  read().includes(key(reciter, surah));

export async function downloadSurah(reciter: string, surah: number) {
  if (!("caches" in window)) throw new Error("Stockage hors ligne indisponible");
  const cache = await caches.open(CACHE);
  const url = audioUrl(reciter, surah);
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Téléchargement impossible");
  await cache.put(url, res.clone());
  const l = read();
  if (!l.includes(key(reciter, surah))) write([...l, key(reciter, surah)]);
}

export async function removeSurah(reciter: string, surah: number) {
  if ("caches" in window) {
    const cache = await caches.open(CACHE);
    await cache.delete(audioUrl(reciter, surah));
  }
  write(read().filter((k) => k !== key(reciter, surah)));
}

/** Retourne une URL jouable : blob local si dispo, sinon le réseau. */
export async function resolveAudio(reciter: string, surah: number): Promise<string> {
  const url = audioUrl(reciter, surah);
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url);
      if (hit) return URL.createObjectURL(await hit.blob());
    } catch {
      /* ignore */
    }
  }
  return url;
}
