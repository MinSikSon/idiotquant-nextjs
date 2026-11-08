"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import GuestLanding from "./GuestLanding";
import { HomeWatchlist } from "@/components/home-watchlist";

const HeroArt = dynamic(() => import("./HeroArt"), { ssr: false });

export default function HomePage() {
  const { data: session, status } = useSession();
  return <>
    {session?.user?.id && <HomeWatchlist key={session.user.id} />}
    <GuestLanding backgroundArt={<HeroArt />} isLoggedIn={status === "authenticated"} />
  </>;
}
