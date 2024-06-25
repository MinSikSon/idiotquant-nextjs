'use client'

import { ReactNode, useRef } from "react";
import { AppStore, makeStore } from "../lib/store";
import { Provider } from "react-redux";

interface Props {
  children: ReactNode
}
export default function StoreProvider({ children }: Props) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    // console.log(`[StoreProvider]`);
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}