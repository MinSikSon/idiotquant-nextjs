"use client"

import React from "react";
import AlgorithmTrade from "../(algorithm-trade)/algorithm-trade/page";
import SplitText from "@/src/TextAnimations/SplitText/SplitText";
import TextType from "@/src/TextAnimations/TextType/TextType";

export default function Home() {
  return <>
    <div className="dark:border-gray-700 dark:bg-black dark:text-white border px-2 pb-1 shadow">
      <SplitText
        text="Emotion-Free Stock Recommendations, Selected by Quantitative Data"
        delay={10}
        duration={0.6}
      />
      <SplitText
        className="text-[0.7rem]"
        text="idiotquant automatically identifies promising stocks based on a variety of investment indicators such as profitability, undervaluation, and trading volume, and builds a customized portfolio tailored to your unique trading strategy."
        delay={10}
        duration={0.6}
      />
    </div>
    <AlgorithmTrade />
  </>
}
