import { ar } from './ar';
import { bg } from './bg';
import { bn } from './bn';
import { cs } from './cs';
import { da } from './da';
import { de } from './de';
import { el } from './el';
import { en } from './en';
import { es } from './es';
import { et } from './et';
import { fi } from './fi';
import { fr } from './fr';
import { he } from './he';
import { hi } from './hi';
import { hu } from './hu';
import { id } from './id';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { lt } from './lt';
import { lv } from './lv';
import { ms } from './ms';
import { nl } from './nl';
import { no } from './no';
import { pl } from './pl';
import { pt } from './pt';
import { ro } from './ro';
import { ru } from './ru';
import { sk } from './sk';
import { sl } from './sl';
import { sr } from './sr';
import { sv } from './sv';
import { th } from './th';
import { tl } from './tl';
import { tr } from './tr';
import { ua } from './ua';
import { vi } from './vi';
import { zh } from './zh';

export const dictionaries = {
    ar, bg, bn, cs, da, de, el, en, es, et, fi, fr, he, hi, hu,
    id, it, ja, ko, lt, lv, ms, nl, no, pl, pt, ro, ru, sk, sl,
    sr, sv, th, tl, tr, ua, vi, zh
} as const;

export type Language = keyof typeof dictionaries;

export const languageNames: Record<keyof typeof dictionaries, string> = {
    ar: 'العربية',
    bg: 'Български',
    bn: 'বাংলা',
    cs: 'Čeština',
    da: 'Dansk',
    de: 'Deutsch',
    el: 'Ελληνικά',
    en: 'English',
    es: 'Español',
    et: 'Eesti',
    fi: 'Suomi',
    fr: 'Français',
    he: 'עברית',
    hi: 'हिन्दी',
    hu: 'Magyar',
    id: 'Bahasa Indonesia',
    it: 'Italiano',
    ja: '日本語',
    ko: '한국어',
    lt: 'Lietuvių',
    lv: 'Latviešu',
    ms: 'Bahasa Melayu',
    nl: 'Nederlands',
    no: 'Norsk',
    pl: 'Polski',
    pt: 'Português',
    ro: 'Română',
    ru: 'Русский',
    sk: 'Slovenčina',
    sl: 'Slovenščina',
    sr: 'Српски',
    sv: 'Svenska',
    th: 'ไทย',
    tl: 'Tagalog',
    tr: 'Türkçe',
    ua: 'Українська',
    vi: 'Tiếng Việt',
    zh: '中文',
};