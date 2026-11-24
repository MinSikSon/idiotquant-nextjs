import { readFileSync } from 'node:fs';
import { createTranslator } from 'next-intl';

const messages = JSON.parse(readFileSync(new URL('../messages/ko.json', import.meta.url), 'utf8'));

// These tests transpile components in a VM without mounting React providers.
export const koreanIntl = {
    useLocale: () => 'ko',
    useTranslations: (namespace: string) => createTranslator({ locale: 'ko', messages, namespace }),
};
