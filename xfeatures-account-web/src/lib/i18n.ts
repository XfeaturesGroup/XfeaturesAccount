import { useStore } from '../store/useStore';
import { dictionaries, type Language } from '../locales/.index.ts';

type TranslationData = typeof dictionaries.en;
export type TranslationKey = keyof TranslationData;

export const useTranslation = () => {
    const lang = (useStore(state => state.user?.language) as Language) || 'en';

    const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
        const dictionary = (dictionaries[lang] as Partial<TranslationData>) || dictionaries.en;

        let text: string = dictionary[key] || dictionaries.en[key] || key;

        if (params && typeof text === 'string') {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }

        return text;
    };

    return { t, lang };
};