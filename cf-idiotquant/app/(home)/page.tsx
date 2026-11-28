"use client";

import { useTranslations } from "next-intl";
import { useSession } from 'next-auth/react';
import HomeLanding from './HomeLanding';
import GuestWatchlist from './GuestWatchlist';
import { HomeWatchlist } from '@/components/home-watchlist';

export default function HomePage() {
  const t = useTranslations("home");
  const { data: session, status } = useSession();
  return <HomeLanding>
    {status === 'loading' ? <p role="status" className="text-sm text-[var(--newsletter-muted)]">{t("loading")}</p>
      : session?.user?.id ? <HomeWatchlist key={session.user.id} /> : <GuestWatchlist />}
  </HomeLanding>;
}
