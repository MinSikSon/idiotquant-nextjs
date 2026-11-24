'use client';

import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { isLocale, localeCookie, localeNames } from '@/i18n/locales';

export function LanguageSelect() {
    const locale = useLocale();
    const t = useTranslations('nav');
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    return <label className="navigation-menu-group flex min-h-11 items-center gap-2 px-2.5 py-1">
        <Globe size={17} aria-hidden="true" className="shrink-0" />
        <span className="min-w-0 flex-1">{t('language')}</span>
        <select value={locale} disabled={pending} className="min-h-11 rounded border border-neutral-400 bg-transparent px-2 text-base md:min-h-8 md:text-sm dark:border-neutral-600 dark:bg-surface-dark-card"
            onChange={event => {
                const nextLocale = event.currentTarget.value;
                if (!isLocale(nextLocale) || nextLocale === locale) return;
                const secure = window.location.protocol === 'https:' ? '; Secure' : '';
                document.cookie = `${localeCookie}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
                startTransition(() => router.refresh());
            }}>
            {Object.entries(localeNames).map(([value, label]) => <option key={value} value={value} lang={value}>{label}</option>)}
        </select>
    </label>;
}
