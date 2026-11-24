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

    return <div className="relative">
        <Globe size={18} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" />
        <select aria-label={t('language')} value={locale} disabled={pending} className="navigation-menu-link min-h-11 w-full cursor-pointer border border-[var(--service-line)] bg-transparent pl-10 pr-2.5 text-base disabled:cursor-wait md:text-sm"
            onChange={event => {
                const nextLocale = event.currentTarget.value;
                if (!isLocale(nextLocale) || nextLocale === locale) return;
                const secure = window.location.protocol === 'https:' ? '; Secure' : '';
                document.cookie = `${localeCookie}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
                startTransition(() => router.refresh());
            }}>
            {Object.entries(localeNames).map(([value, label]) => <option key={value} value={value} lang={value}>{label}</option>)}
        </select>
    </div>;
}
