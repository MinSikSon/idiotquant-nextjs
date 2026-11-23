"use client";

import { useSyncExternalStore } from "react";

const STORAGE_PREFIX = "iq:representativePortfolio:";
const CHANGE_EVENT = "iq:representativePortfolio";

export function defaultPortfolioKey(response: unknown): string | null {
    const list = Array.isArray(response) ? response : (response as { list?: unknown } | null)?.list;
    if (!Array.isArray(list)) return null;
    const matches = list.filter(member => typeof member?.value?.nickname === "string" && member.value.nickname.trim() === "손가을" && member.key);
    return matches.length === 1 ? String(matches[0].key) : null;
}

export function representativePortfolioUserId(user?: { id?: string; name?: string | null; role?: string }) {
    return user?.role === "admin" && user.name && user.name === process.env.NEXT_PUBLIC_MASTER ? user.id : undefined;
}

function subscribe(onChange: () => void) {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

export function useRepresentativePortfolio(userId?: string): string | null | undefined {
    return useSyncExternalStore(subscribe, () => {
        try {
            return userId ? window.localStorage.getItem(STORAGE_PREFIX + userId) : null;
        } catch {
            return null;
        }
    }, () => undefined);
}

export function saveRepresentativePortfolio(userId: string, accountKey: string): boolean {
    try {
        window.localStorage.setItem(STORAGE_PREFIX + userId, accountKey);
    } catch {
        return false;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
}
