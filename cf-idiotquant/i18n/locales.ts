export const localeNames = {
    ko: '한국어',
    en: 'English',
    ja: '日本語',
} as const;

export type Locale = keyof typeof localeNames;
export const defaultLocale: Locale = 'ko';
export const localeCookie = 'idiotquant-locale';

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && Object.hasOwn(localeNames, value);
}
