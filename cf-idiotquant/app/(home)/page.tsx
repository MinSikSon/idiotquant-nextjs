"use client"

import React from "react";
import RegisterStrategyButton from "@/app/(register_strategy)/register_strategy/register_strategy_button";
import Strategy from "@/app/(strategy)/strategy/page";

export default function Home() {
  return <>
    <RegisterStrategyButton />
    <Strategy />
  </>
}
