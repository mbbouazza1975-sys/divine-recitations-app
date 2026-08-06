const KEY = "hifz.reminder";

export type Reminder = { enabled: boolean; hour: number; minute: number };

export const defaultReminder: Reminder = { enabled: false, hour: 19, minute: 0 };

export function getReminder(): Reminder {
  if (typeof window === "undefined") return defaultReminder;
  try {
    return { ...defaultReminder, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return defaultReminder;
  }
}

export function saveReminder(r: Reminder) {
  localStorage.setItem(KEY, JSON.stringify(r));
  scheduleReminder(r);
}

export async function askPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const res = await Notification.requestPermission();
  return res === "granted";
}

let timer: ReturnType<typeof setTimeout> | null = null;

const MESSAGES = [
  "🌙 Ta révision du jour t'attend — 5 minutes suffisent.",
  "📖 Garde ta série vivante : une sourate aujourd'hui ?",
  "⭐ Un verset par jour, et Juz 'Amma est à toi.",
];

/** Rappel local pendant que l'app est ouverte ou en arrière-plan (onglet vivant). */
export function scheduleReminder(r: Reminder = getReminder()) {
  if (typeof window === "undefined") return;
  if (timer) clearTimeout(timer);
  if (!r.enabled || Notification.permission !== "granted") return;

  const now = new Date();
  const next = new Date();
  next.setHours(r.hour, r.minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  timer = setTimeout(() => {
    try {
      new Notification("Hifz — Juz 'Amma", {
        body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)]!,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
      });
    } catch {
      /* ignore */
    }
    scheduleReminder(r);
  }, next.getTime() - now.getTime());
}

export function notifyNow(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    /* ignore */
  }
}
