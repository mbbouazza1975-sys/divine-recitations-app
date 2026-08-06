import raw from "./juzamma.json";

export type Dico = { ar: string; simple: string; img: string };
export type Verse = {
  n: number;
  ar: string;
  tr: string;
  icon?: string;
  sens?: string;
  tafsir?: string;
  dico?: Dico[];
};
export type Surah = {
  num: number;
  ar: string;
  fr: string;
  fr2: string;
  versets: number;
  emoji: string;
  theme: string;
  intro: string;
  valeur: string;
  hadith: string;
  verses: Verse[];
};

const data = raw as unknown as { DATA: Record<string, Surah>; ORDER: number[] };

export const ORDER: number[] = data.ORDER;
export const SURAHS: Surah[] = ORDER.map((n) => data.DATA[String(n)]!);
export const getSurah = (n: number): Surah | undefined => data.DATA[String(n)];
export const totalVerses = SURAHS.reduce((a, s) => a + s.versets, 0);

export type Reciter = {
  id: string;
  name: string;
  detail: string;
  server: string;
  emoji: string;
};

/** Toutes les récitations sont en Warsh 'an Nafi'. */
export const RECITERS: Reciter[] = [
  {
    id: "qari",
    name: "Al-Qâri' Yâsîn",
    detail: "Warsh · voix claire, idéale mémorisation",
    server: "https://server11.mp3quran.net/qari/",
    emoji: "🌙",
  },
  {
    id: "dosari",
    name: "Ibrâhîm Ad-Dôsarî",
    detail: "Warsh · lecture posée et précise",
    server: "https://server10.mp3quran.net/ibrahim_dosri/Rewayat-Warsh-A-n-Nafi/",
    emoji: "📖",
  },
  {
    id: "basit",
    name: "'Abdul Bâsit 'Abdus-Samad",
    detail: "Warsh · récitation légendaire",
    server: "https://server7.mp3quran.net/basit/Rewayat-Warsh-A-n-Nafi/",
    emoji: "⭐",
  },
  {
    id: "qazabri",
    name: "'Omar Al-Qazâbrî",
    detail: "Warsh · style marocain mélodieux",
    server: "https://server9.mp3quran.net/omar_warsh/",
    emoji: "🕌",
  },
];

export const getReciter = (id: string) => RECITERS.find((r) => r.id === id) ?? RECITERS[0]!;

export const audioUrl = (reciterId: string, surah: number) =>
  `${getReciter(reciterId).server}${String(surah).padStart(3, "0")}.mp3`;
