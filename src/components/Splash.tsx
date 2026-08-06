import { useEffect, useState } from "react";

export function Splash() {
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setFade(true), 1100);
    const b = setTimeout(() => setGone(true), 1700);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`grad-night fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fade ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="pulse-gold grad-gold flex h-24 w-24 items-center justify-center rounded-[28px] text-5xl shadow-gold">
        🕌
      </div>
      <h1 className="text-primary-foreground mt-6 text-3xl font-black tracking-tight">Hifz</h1>
      <p className="text-primary-foreground/70 mt-1 text-sm font-semibold">
        Juz &apos;Amma · Warsh &apos;an Nâfi&apos;
      </p>
      <div className="bg-primary-foreground/15 mt-8 h-1 w-40 overflow-hidden rounded-full">
        <div className="grad-gold h-full w-1/3 animate-[float-up_1.2s_ease-in-out_infinite_alternate]" />
      </div>
    </div>
  );
}
