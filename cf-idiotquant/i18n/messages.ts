import type messages from '../messages/ko.json';

export type NavMessage = keyof typeof messages.nav;

declare module 'next-intl' {
    interface AppConfig {
        Messages: typeof messages;
    }
}
