"use client"

import AlgorithmTrade from "../(algorithm-trade)/algorithm-trade/page";
import HomeThumbnail from "@/components/homeThumbnail";

export default function Home() {
  return <>
    <div className="flex flex-col dark:bg-black h-full dark:text-white">
      <HomeThumbnail />
      <AlgorithmTrade />
    </div>
  </>
}
