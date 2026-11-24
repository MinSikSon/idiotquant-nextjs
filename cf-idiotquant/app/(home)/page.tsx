"use client";

import { useTranslations } from "next-intl";
import { useSession } from 'next-auth/react';
import GuestLanding from './GuestLanding';
import { HomeWatchlist } from '@/components/home-watchlist';

export default function HomePage() {
  const t = useTranslations("home");
  const { data: session, status } = useSession();
  if (status === 'loading') return <p role="status" className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-500">{t("loading")}</p>;
  return session?.user?.id ? <HomeWatchlist key={session.user.id} /> : <GuestLanding />;
}
