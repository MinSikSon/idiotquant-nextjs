"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectNcavDailyList, reqGetNcavDailyList } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import GuestLanding from "./GuestLanding";

const HeroArt = dynamic(() => import("./HeroArt"), { ssr: false });

export default function HomePage() {
  const { data: session, status } = useSession();
  // 랜딩도 발굴 결과를 직접 읽는다 — 제품 설명만으로는 다시 올 이유가 생기지 않는다.
  const dispatch = useAppDispatch();
  const ncavDailyList = useAppSelector(selectNcavDailyList);
  // 미리보기는 일부 종목만 가져오고 전체 개수는 API 메타데이터를 사용한다.
  useEffect(() => { dispatch(reqGetNcavDailyList({ date: "latest", preview: true })); }, [dispatch]);

  const scanLoading = ncavDailyList.state === "pending" || ncavDailyList.state === "init";
  // 조건에 맞은 전체 수. 목록은 그중 일부만 받아 오므로 length 로 세면 안 된다.
  const matchedCount = ncavDailyList.total || ncavDailyList.list.length;
  const scanDate = ncavDailyList.scanDate;

  return (
    <GuestLanding
      list={ncavDailyList.list}
      totalCount={matchedCount}
      isLoading={scanLoading}
      scanDate={scanDate}
      backgroundArt={<HeroArt />}
      isLoggedIn={status === "loading" || !!session}
    />
  );

}
