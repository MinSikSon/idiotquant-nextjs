"use client"

import React from "react";
import AlgorithmTrade from "../(algorithm-trade)/algorithm-trade/page";
import SplitText from "@/src/TextAnimations/SplitText/SplitText";
import TextType from "@/src/TextAnimations/TextType/TextType";

export default function Home() {
  return <>
    <div className="dark:border-gray-700 dark:bg-black dark:text-white p-3">
      <TextType
        className="text-sm md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl dark:bg-white"
        text={[
          "Emotion-Free Quant Investing"
          , "Stock recommendations driven purely by data."
          , "idiotquant applies NCAV strategy along with other quantitative indicators."
          , "It analyzes profitability, undervaluation, and trading volume to automatically spot promising stocks."
          , "A customized portfolio is then built to match your unique investment style."
        ]}
        typingSpeed={75}
        pauseDuration={1500}
        showCursor={true}
        cursorCharacter="|"
        textColors={[
          "#000",
          "#000",
          "#000",
          "#000",
          "#000"
        ]}
      />
    </div>
    <AlgorithmTrade />
  </>
}
