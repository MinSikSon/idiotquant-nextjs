"use client"

import AlgorithmTrade from "../(algorithm-trade)/algorithm-trade/page";
// import HomeThumbnail from "@/components/homeThumbnail";
// import MyApp from "./radixMain";
// import { Theme } from "@radix-ui/themes";

export default function Home() {
  return <>
    <div className="flex flex-col dark:bg-black h-full dark:text-white">
      {/* <HomeThumbnail /> */}
      {/* <MyApp /> */}
      <AlgorithmTrade />
    </div>
  </>
}
