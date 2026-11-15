"use client";

import { useSession } from 'next-auth/react';
import GuestLanding from './GuestLanding';
import { HomeWatchlist } from '@/components/home-watchlist';

export default function HomePage() {
  const { data: session, status } = useSession();
  if (status === 'loading') return <p role="status" className="mx-auto max-w-3xl px-4 py-10 text-sm text-neutral-500">오늘의 관심종목을 준비하는 중…</p>;
  return session?.user?.id ? <HomeWatchlist key={session.user.id} /> : <GuestLanding />;
}
