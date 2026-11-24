import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale, localeCookie } from './locales';

const messages = {
    ko: () => import('../messages/ko.json'),
    en: () => import('../messages/en.json'),
    ja: () => import('../messages/ja.json'),
};

export default getRequestConfig(async () => {
    const saved = (await cookies()).get(localeCookie)?.value;
    const locale = isLocale(saved) ? saved : defaultLocale;
    return { locale, messages: (await messages[locale]()).default };
});
